import { assistantMessageBodySchema, createConversationBodySchema } from './assistant.ts';

describe('assistantMessageBodySchema', () => {
  it('trims the text and refuses an empty or too long one', () => {
    expect(assistantMessageBodySchema.parse({ text: '  Crea il cliente Rossi Srl ' })).toEqual({
      text: 'Crea il cliente Rossi Srl',
    });
    expect(assistantMessageBodySchema.safeParse({ text: '   ' }).success).toBe(false);
    expect(assistantMessageBodySchema.safeParse({ text: 'x'.repeat(4001) }).success).toBe(false);
  });
});

describe('createConversationBodySchema', () => {
  it('needs an agent; the model is optional', () => {
    expect(createConversationBodySchema.parse({ agentId: 1 })).toEqual({ agentId: 1 });
    expect(createConversationBodySchema.safeParse({}).success).toBe(false);
  });
});
