import { HttpException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import type { Actor } from '@dafne/backend-crud';
import type { AssistantStreamEvent } from '@dafne/contracts';
import { abilityFor } from '@dafne/permissions';
import { AssistantTools } from '../tools/assistant-tools.js';
import { ChatService } from './chat.service.js';

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};

/** A model that first searches the customer, then answers. */
function model() {
  let call = 0;
  return new MockLanguageModelV4({
    doStream: async () => {
      call += 1;
      const chunks =
        call === 1
          ? [
              { type: 'tool-call', toolCallId: 't1', toolName: 'search_customers', input: '{"query":"Rossi"}' },
              { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage },
            ]
          : [
              { type: 'text-start', id: 'x' },
              { type: 'text-delta', id: 'x', delta: 'Rossi Srl ha 2 ordini aperti.' },
              { type: 'text-end', id: 'x' },
              { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage },
            ];
      return { stream: simulateReadableStream({ chunks: chunks as never }) };
    },
  });
}

function setup(rateLimit = '30') {
  const customers = { list: vi.fn(async () => ({ items: [{ id: 1, type: 'company', name: 'Rossi Srl', email: 'a@b.it', phone: null }], total: 1, limit: 10, offset: 0 })) };
  const tools = new AssistantTools(customers as never, {} as never, {} as never, {} as never, {} as never, {} as never);
  const conversations = {
    owned: vi.fn(async () => ({ id: 1, agentId: 2, modelId: 3, title: null })),
    agent: vi.fn(async () => ({ id: 2, name: 'Sales', systemPrompt: 'Be helpful', tools: ['search_customers'], defaultModelId: 3, allowModelOverride: true })),
    model: vi.fn(async () => ({ id: 3, modelId: 'mock', options: { reasoning: 'none' }, provider: {} })),
    history: vi.fn(async () => []),
    append: vi.fn(async (..._args: unknown[]) => 99),
    propose: vi.fn(),
  };
  const models = { create: vi.fn(() => model()) };
  const config = { get: () => rateLimit } as unknown as ConfigService;
  const store = new Map<string, unknown>();
  const cache = { get: vi.fn(async (k: string) => store.get(k)), set: vi.fn(async (k: string, v: unknown) => store.set(k, v)) };
  const permissions = { abilityFor: async () => abilityFor({ admin: true, permissions: [] }) };
  const service = new ChatService(conversations as never, tools, models as never, config, cache as never, permissions as never);
  return { service, conversations, customers };
}

describe('ChatService', () => {
  const actor = { id: 'u1' } as Actor;

  it('runs the tool loop, streams the answer and saves every message', async () => {
    const { service, conversations, customers } = setup();
    const events: AssistantStreamEvent[] = [];

    const run = await service.prepare(1, 'Quanti ordini aperti ha Rossi?', actor, 'it');
    await run((event) => events.push(event), new AbortController().signal);

    expect(customers.list).toHaveBeenCalled();
    expect(events).toEqual([
      { type: 'tool', name: 'search_customers' },
      { type: 'text', delta: 'Rossi Srl ha 2 ordini aperti.' },
      { type: 'done', messageId: 99 },
    ]);
    // The user's message (titling the conversation), then the model's turn.
    expect(conversations.append).toHaveBeenNthCalledWith(1, 1, [expect.objectContaining({ message: expect.objectContaining({ role: 'user' }) })], 'Quanti ordini aperti ha Rossi?');
    const saved = conversations.append.mock.calls[1]?.[1] as { message: { role: string } }[];
    expect(saved.map((m) => m.message.role)).toEqual(['assistant', 'tool', 'assistant']);
  });

  it('limits how many messages a user sends', async () => {
    const { service } = setup('1');
    await service.checkRate(actor);
    await expect(service.checkRate(actor)).rejects.toBeInstanceOf(HttpException);
  });
});

describe('ChatService without an answer', () => {
  it('asks once more, tools off, when the model stops without a word', async () => {
    const { service, conversations } = setup();
    let call = 0;
    const silent = new MockLanguageModelV4({
      doStream: async (options) => {
        call += 1;
        const chunks =
          call === 1
            ? [{ type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage }]
            : [
                { type: 'text-start', id: 'x' },
                { type: 'text-delta', id: 'x', delta: 'Non posso creare ordini.' },
                { type: 'text-end', id: 'x' },
                { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage },
              ];
        if (call === 2) {
          expect(options.toolChoice).toEqual({ type: 'none' });
        }
        return { stream: simulateReadableStream({ chunks: chunks as never }) };
      },
    });
    (service as unknown as { models: { create: () => unknown } }).models.create = () => silent;
    const events: AssistantStreamEvent[] = [];

    const run = await service.prepare(1, 'Crea un ordine', { id: 'u1' } as Actor, 'it');
    await run((event) => events.push(event), new AbortController().signal);

    expect(call).toBe(2);
    expect(events).toEqual([{ type: 'text', delta: 'Non posso creare ordini.' }, { type: 'done', messageId: 99 }]);
    expect(conversations.append).toHaveBeenCalledTimes(2);
  });
});
