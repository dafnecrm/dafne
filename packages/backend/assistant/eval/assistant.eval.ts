import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { ModelMessage } from 'ai';
import type { Actor } from '@dafne/backend-crud';
import {
  ASSISTANT_TOOL_NAMES,
  type AssistantProviderKind,
  type AssistantReasoningLevel,
  type AssistantStreamEvent,
} from '@dafne/contracts';
import { abilityFor } from '@dafne/permissions';
import { ChatService } from '../src/chat/chat.service.js';
import { ModelFactory } from '../src/chat/model-factory.js';
import { AssistantTools } from '../src/tools/assistant-tools.js';

/*
 * Compares models on fixed CRM requests: each case checks the tools the
 * model called and their arguments (and sometimes the answer). The CRM is
 * faked in memory, so it needs no database; the model is real.
 *
 *   EVAL_KIND=openai-compatible EVAL_BASE_URL=http://localhost:11434/v1 \
 *   EVAL_MODEL=qwen3:8b EVAL_REASONING=none pnpm nx eval @dafne/backend-assistant
 */

const kind = (process.env.EVAL_KIND ?? 'openai-compatible') as AssistantProviderKind;
const modelId = process.env.EVAL_MODEL ?? 'qwen3:8b';
const baseUrl = process.env.EVAL_BASE_URL ?? (kind === 'openai-compatible' ? 'http://localhost:11434/v1' : null);
const apiKeyEnv = kind === 'anthropic' ? 'ANTHROPIC_API_KEY' : kind === 'openai' ? 'OPENAI_API_KEY' : null;
const reasoning = process.env.EVAL_REASONING as AssistantReasoningLevel | undefined;

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const page = <T>(items: T[]) => ({ items, total: items.length, limit: 10, offset: 0 });

/* ---------- The fake CRM ---------- */

const CUSTOMERS = [
  { id: 1, type: 'company', name: 'Rossi Srl', email: 'info@rossi.it', phone: '+39 06 1234567' },
  { id: 2, type: 'person', name: 'Rossi Mario', email: 'mario@rossi.it', phone: null },
  { id: 3, type: 'company', name: 'Bianchi Spa', email: 'info@bianchi.it', phone: null },
];
const PRODUCTS = [
  { id: 5, name: 'Insalata', price: '2.50', description: null },
  { id: 6, name: 'Artemisia', price: '4.00', description: null },
];
const ORDERS = [
  { id: 10, status: 'open', customerId: 1 },
  { id: 11, status: 'open', customerId: 1 },
  { id: 12, status: 'completed', customerId: 1 },
  { id: 13, status: 'open', customerId: 3 },
];

function crm() {
  const customer = (id: number) => CUSTOMERS.find((c) => c.id === id);
  const order = (o: (typeof ORDERS)[number]) => ({
    ...o,
    typeId: 'STD',
    customer: { id: o.customerId, name: customer(o.customerId)!.name },
    type: { id: 'STD', description: 'Standard' },
    createdAt: new Date('2026-11-01'),
    updatedAt: new Date('2026-11-01'),
  });
  return {
    customers: {
      list: async (q: { search?: string; type?: string }) => {
        const words = (q.search ?? '').toLowerCase().split(/\s+/).filter(Boolean);
        return page(
          CUSTOMERS.filter(
            (c) =>
              (!q.type || c.type === q.type) &&
              (!words.length || String(c.id) === q.search || words.every((w) => c.name.toLowerCase().includes(w))),
          ),
        );
      },
      get: async (id: number) => {
        const found = customer(id);
        if (!found) {
          throw new NotFoundException('customers.notFound');
        }
        return { ...found, vatNumber: null, fiscalCode: null, birthDate: null, notes: null, addresses: [] };
      },
    },
    salesOrders: {
      list: async (q: { customerId?: string; status?: string; limit?: number }) => {
        const found = ORDERS.filter(
          (o) => (!q.customerId || o.customerId === Number(q.customerId)) && (!q.status || o.status === q.status),
        );
        return { items: found.slice(0, q.limit ?? 10).map(order), total: found.length, limit: q.limit ?? 10, offset: 0 };
      },
      get: async (id: number) => {
        const found = ORDERS.find((o) => o.id === id);
        if (!found) {
          throw new NotFoundException('salesOrders.notFound');
        }
        return { ...order(found), notes: null, items: [] };
      },
    },
    activities: { list: async () => page([]), get: async () => { throw new NotFoundException('activities.notFound'); } },
    products: {
      list: async (q: { name?: string }) =>
        page(PRODUCTS.filter((p) => !q.name || p.name.toLowerCase().includes(q.name.toLowerCase()))),
      get: async (id: number) => {
        const found = PRODUCTS.find((p) => p.id === id);
        if (!found) {
          throw new NotFoundException('products.notFound');
        }
        return found;
      },
    },
    salesOrderTypes: { list: async () => page([{ id: 'STD', description: 'Standard' }]) },
  };
}

/* ---------- One run ---------- */

interface Run {
  calls: { name: string; input: Record<string, unknown> }[];
  proposals: { kind: string; payload: Record<string, unknown> }[];
  answer: string;
  seconds: number;
  error?: string;
}

async function ask(text: string): Promise<Run> {
  const fake = crm();
  const tools = new AssistantTools(
    fake.customers as never,
    fake.salesOrders as never,
    fake.activities as never,
    fake.products as never,
    fake.salesOrderTypes as never,
  );
  const history: ModelMessage[] = [];
  const proposals: Run['proposals'] = [];
  const conversations = {
    owned: async () => ({ id: 1, agentId: 1, modelId: 1, title: 'eval' }),
    agent: async () => ({
      id: 1,
      name: 'Assistente vendite',
      systemPrompt: 'Aiuti i commerciali: rispondi a domande su clienti, ordini, attività e prodotti.',
      tools: [...ASSISTANT_TOOL_NAMES],
      defaultModelId: 1,
      allowModelOverride: true,
    }),
    model: async () => ({
      id: 1,
      modelId,
      options: reasoning ? { reasoning } : null,
      provider: { name: 'eval', kind, baseUrl, apiKeyEnv },
    }),
    history: async () => [...history],
    append: async (_id: number, messages: { message: ModelMessage }[]) => {
      history.push(...messages.map((m) => m.message));
      return history.length;
    },
    propose: async (_c: number, kindName: string, toolCallId: string, payload: Record<string, unknown>) => {
      proposals.push({ kind: kindName, payload });
      return { id: proposals.length, conversationId: 1, kind: kindName, payload, status: 'pending', result: null, createdAt: new Date(), decidedAt: null, toolCallId };
    },
  };
  const config = { get: (key: string) => process.env[key] } as unknown as ConfigService;
  const cache = { get: async () => 0, set: async () => undefined };
  // Every permission: the eval checks the model, not the groups.
  const permissions = { abilityFor: async () => abilityFor({ admin: true, permissions: [] }) };
  const chat = new ChatService(conversations as never, tools, new ModelFactory(config), config, cache as never, permissions as never);

  const started = Date.now();
  let answer = '';
  let error: string | undefined;
  const run = await chat.prepare(1, text, { id: 'eval' } as Actor, 'it');
  await run((event: AssistantStreamEvent) => {
    if (event.type === 'text') {
      answer += event.delta;
    } else if (event.type === 'error') {
      error = event.message;
    }
  }, new AbortController().signal);

  const calls = history.flatMap((message) =>
    message.role === 'assistant' && typeof message.content !== 'string'
      ? message.content.flatMap((part) =>
          part.type === 'tool-call' ? [{ name: part.toolName, input: part.input as Record<string, unknown> }] : [],
        )
      : [],
  );
  return { calls, proposals, answer, seconds: (Date.now() - started) / 1000, error };
}

/* ---------- The cases ---------- */

const called = (run: Run, name: string, match: (input: Record<string, unknown>) => boolean = () => true) =>
  run.calls.some((c) => c.name === name && match(c.input));
const lower = (value: unknown) => String(value ?? '').toLowerCase();

const CASES: { name: string; ask: string; pass: (run: Run) => boolean }[] = [
  {
    name: 'conta gli ordini aperti di un cliente',
    ask: 'Quanti ordini aperti ha il cliente Rossi Srl?',
    pass: (r) =>
      called(r, 'search_customers') &&
      called(r, 'list_sales_orders', (i) => Number(i.customerId) === 1 && i.status === 'open') &&
      /\b2\b|due/i.test(r.answer),
  },
  {
    name: 'propone un nuovo cliente, senza crearlo',
    ask: 'Crea il cliente Verdi Srl, email info@verdi.it',
    pass: (r) =>
      r.proposals.some(
        (p) =>
          p.kind === 'propose_create_customer' &&
          lower((p.payload.body as Record<string, unknown>)?.name).includes('verdi') &&
          lower((p.payload.body as Record<string, unknown>)?.email) === 'info@verdi.it',
      ),
  },
  {
    name: 'chiede quale cliente se il nome è ambiguo',
    ask: 'Quanti ordini ha Rossi?',
    // Asks (or lists both) instead of picking one.
    pass: (r) =>
      !called(r, 'list_sales_orders') &&
      !r.proposals.length &&
      (r.answer.includes('?') || (r.answer.includes('Rossi Srl') && r.answer.includes('Rossi Mario'))),
  },
  {
    name: 'non inventa un cliente che non esiste',
    ask: 'Che telefono ha il cliente Neri Spa?',
    pass: (r) => called(r, 'search_customers') && !/\+?\d[\d\s]{6,}/.test(r.answer),
  },
  {
    name: "propone un'attività con la data di domani",
    ask: 'Ricordami di chiamare Rossi Srl domani',
    pass: (r) =>
      r.proposals.some(
        (p) =>
          p.kind === 'propose_create_activity' &&
          (p.payload.body as Record<string, unknown>)?.type === 'call' &&
          (p.payload.body as Record<string, unknown>)?.dueDate === day(1),
      ),
  },
  {
    name: "propone il cambio di stato di un ordine",
    ask: "Segna come completato l'ordine 10",
    pass: (r) =>
      r.proposals.some(
        (p) => p.kind === 'propose_change_sales_order_status' && Number(p.payload.id) === 10 && p.payload.status === 'completed',
      ),
  },
  {
    name: 'propone un ordine con i suoi prodotti',
    ask: 'Crea un nuovo ordine per il cliente Rossi Srl con due righe: insalata (quantità 10), artemisia (quantità 9)',
    pass: (r) =>
      r.proposals.some((p) => {
        const body = p.payload.body as { customerId?: number; items?: { productId: number; quantity: number }[] } | undefined;
        const items = body?.items ?? [];
        return (
          p.kind === 'propose_create_sales_order' &&
          body?.customerId === 1 &&
          items.some((i) => i.productId === 5 && i.quantity === 10) &&
          items.some((i) => i.productId === 6 && i.quantity === 9)
        );
      }),
  },
  {
    name: 'controlla invece di inventare quando qualcosa non ha funzionato',
    ask: "L'ordine 10 non ha righe, aggiungile",
    // No tool adds lines to an order: it must read it and say so, not claim it.
    pass: (r) => !r.proposals.length && !/aggiunt|added/i.test(r.answer) && r.answer.length > 0,
  },
];

const results: { name: string; ok: boolean; seconds: number; tools: string; error?: string }[] = [];

describe(`assistant eval: ${kind} ${modelId}${reasoning ? ` (reasoning ${reasoning})` : ''}`, () => {
  for (const c of CASES) {
    it(c.name, async () => {
      const run = await ask(c.ask);
      const ok = !run.error && c.pass(run);
      results.push({ name: c.name, ok, seconds: run.seconds, tools: run.calls.map((call) => call.name).join(' → '), error: run.error });
      const details = `tools: ${JSON.stringify(run.calls)}\nproposals: ${JSON.stringify(run.proposals)}\nanswer: ${run.answer}\nerror: ${run.error ?? '-'}`;
      expect(ok, details).toBe(true);
    });
  }

  afterAll(() => {
    const passed = results.filter((r) => r.ok).length;
    const seconds = results.reduce((sum, r) => sum + r.seconds, 0);
    // Straight to stdout: vitest keeps console output of passing tests to itself.
    const lines = results.map((r) => `${r.ok ? '✓' : '✗'} ${r.seconds.toFixed(1).padStart(6)} s  ${r.name}  [${r.tools}]`);
    process.stdout.write(
      `\n${kind} ${modelId}${reasoning ? ` (reasoning ${reasoning})` : ''}: ${passed}/${results.length} passed, ${seconds.toFixed(0)} s in all\n${lines.join('\n')}\n\n`,
    );
  });
});
