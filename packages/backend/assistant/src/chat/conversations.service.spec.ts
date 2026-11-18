import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { Actor } from '@dafne/backend-crud';
import { abilityFor } from '@dafne/permissions';
import { canUse, chatMessages, ConversationsService } from './conversations.service.js';

const row = (id: number, content: unknown, note = false) =>
  ({ id, conversationId: 1, role: (content as { role: string }).role, content, note, modelId: null, createdAt: new Date(0) }) as never;

describe('chatMessages', () => {
  it("folds a turn's steps into one answer and hides tool results and notes", () => {
    const messages = chatMessages([
      row(1, { role: 'user', content: '[Today is 2026-11-18]\nQuanti ordini?' }),
      row(2, { role: 'assistant', content: [{ type: 'tool-call', toolCallId: 'a', toolName: 'search_customers', input: {} }] }),
      row(3, { role: 'tool', content: [] }),
      row(4, { role: 'assistant', content: [{ type: 'text', text: 'Tre ordini aperti.' }] }),
      row(5, { role: 'user', content: [{ type: 'text', text: '[App note] confirmed' }] }, true),
    ]);
    expect(messages).toEqual([
      expect.objectContaining({ id: 1, role: 'user', text: 'Quanti ordini?' }),
      expect.objectContaining({ id: 4, role: 'assistant', text: 'Tre ordini aperti.', tools: ['search_customers'] }),
    ]);
  });
});

describe('ConversationsService actions', () => {
  const actor = { id: 'u1' } as Actor;
  const pendingAction = {
    id: 7, conversationId: 1, kind: 'propose_create_customer', toolCallId: 'c',
    payload: { body: { type: 'company', name: 'Rossi Srl', email: 'info@rossi.it' } },
    status: 'pending', result: null, createdAt: new Date(), decidedAt: null,
  };

  function setup() {
    const create = vi.fn();
    const tools = { services: { customers: { create } } };
    const permissions = { abilityFor: vi.fn(async () => abilityFor({ admin: true, permissions: [] })) };
    const service = new ConversationsService({} as never, tools as never, permissions as never);
    const internals = service as unknown as Record<string, ReturnType<typeof vi.fn>>;
    internals.pending = vi.fn(async () => pendingAction);
    internals.decide = vi.fn(async (id: number, status: string, result: unknown) => ({ ...pendingAction, status, result }));
    internals.note = vi.fn();
    // The agent is still open to the user.
    internals.owned = vi.fn(async () => ({ id: 1, agentId: 2 }));
    internals.agent = vi.fn(async () => ({ id: 2 }));
    return { service, create, internals, permissions };
  }

  it('runs a confirmed action as the user and tells the model', async () => {
    const { service, create, internals } = setup();
    create.mockResolvedValue({ id: 42 });

    await expect(service.confirm(7, actor, 'it')).resolves.toMatchObject({
      status: 'confirmed',
      result: { resource: 'customers', id: 42 },
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Rossi Srl' }), actor);
    expect(internals.note).toHaveBeenCalledWith(1, expect.stringContaining('confirmed action 7'));
  });

  it('marks it failed, with the reason, when the CRM refuses it', async () => {
    const { service, create } = setup();
    create.mockRejectedValue(new ConflictException('customers.email.taken'));

    await expect(service.confirm(7, actor, 'it')).resolves.toMatchObject({
      status: 'failed',
      result: { error: expect.any(String) },
    });
  });

  it('marks it failed when a guard says no', async () => {
    const { service, create } = setup();
    create.mockRejectedValue(new ForbiddenException());
    await expect(service.confirm(7, actor, 'en')).resolves.toMatchObject({ status: 'failed' });
  });

  it("doesn't run an action of an agent no longer open to the user", async () => {
    const { service, create, internals } = setup();
    internals.agent = vi.fn(async () => {
      throw new ForbiddenException('assistant.agent.unavailable');
    });

    await expect(service.confirm(7, actor, 'it')).rejects.toBeInstanceOf(ForbiddenException);
    expect(create).not.toHaveBeenCalled();
  });

  it("marks it failed when the user isn't allowed to do it (anymore)", async () => {
    const { service, create, permissions } = setup();
    permissions.abilityFor.mockResolvedValue(abilityFor({ admin: false, permissions: ['Customer.update'] }));

    await expect(service.confirm(7, actor, 'it')).resolves.toMatchObject({
      status: 'failed',
      result: { error: 'Non hai il permesso di farlo' },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects without writing', async () => {
    const { service, create, internals } = setup();
    await expect(service.reject(7, actor)).resolves.toMatchObject({ status: 'rejected' });
    expect(create).not.toHaveBeenCalled();
    expect(internals.note).toHaveBeenCalledWith(1, expect.stringContaining('rejected'));
  });
});

describe('canUse', () => {
  const user = { id: 'u1', role: 'user' } as Actor;
  const superAdmin = { id: 's1', role: 'super-admin' } as Actor;
  const admin = { id: 'a1', role: 'admin' } as Actor;

  it('opens "everyone" agents to anyone', () => {
    expect(canUse({ id: 1, audience: 'everyone' }, user, new Set())).toBe(true);
  });

  it('opens "groups" agents to the members of their groups only, admins included', () => {
    expect(canUse({ id: 1, audience: 'groups' }, user, new Set([1]))).toBe(true);
    expect(canUse({ id: 1, audience: 'groups' }, user, new Set([2]))).toBe(false);
    expect(canUse({ id: 1, audience: 'groups' }, admin, new Set())).toBe(false);
  });

  it('opens every agent to super-admins, in no group', () => {
    expect(canUse({ id: 1, audience: 'groups' }, superAdmin, new Set())).toBe(true);
  });
});

describe('ConversationsService agents', () => {
  const user = { id: 'u1', role: 'user' } as Actor;
  const agents = [
    { id: 1, name: 'Lettura', description: null, systemPrompt: '', tools: [], defaultModelId: 3, allowModelOverride: true, audience: 'everyone' },
    { id: 2, name: 'Scrittura', description: null, systemPrompt: '', tools: [], defaultModelId: 3, allowModelOverride: true, audience: 'groups' },
  ];

  function setup(groupAgents: number[]) {
    const service = new ConversationsService({} as never, {} as never, {} as never);
    const internals = service as unknown as Record<string, ReturnType<typeof vi.fn>>;
    internals.enabledAgents = vi.fn(async () => agents);
    internals.availableModels = vi.fn(async () => []);
    internals.groupAgentsOf = vi.fn(async () => new Set(groupAgents));
    return service;
  }

  it('lists only the agents open to the user', async () => {
    await expect(setup([]).availableAgents(user)).resolves.toEqual([expect.objectContaining({ name: 'Lettura' })]);
    await expect(setup([2]).availableAgents(user)).resolves.toHaveLength(2);
  });

  it('refuses an agent not open to the user with 403, an unknown one with 400', async () => {
    await expect(setup([]).agent(2, user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(setup([]).agent(9, user)).rejects.toBeInstanceOf(BadRequestException);
    await expect(setup([2]).agent(2, user)).resolves.toMatchObject({ id: 2 });
  });
});
