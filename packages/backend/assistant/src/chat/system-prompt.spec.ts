import { systemPrompt } from './system-prompt.js';

describe('systemPrompt', () => {
  it('tells a read-only agent to refuse changes at once', () => {
    const prompt = systemPrompt('', 'it', { allowed: [], denied: [] });
    expect(prompt).toContain('this assistant can only read data');
    expect(prompt).not.toContain('call the propose_* tool');
  });

  it("blames the user's permissions when they took every write tool away", () => {
    const prompt = systemPrompt('', 'it', { allowed: [], denied: ['propose_create_customer'] });
    expect(prompt).toContain("the user's permissions only allow reading data");
  });

  it('lists the write tools the permissions took away', () => {
    const prompt = systemPrompt('', 'it', { allowed: ['propose_create_activity'], denied: ['propose_create_customer'] });
    expect(prompt).toContain('call the propose_* tool');
    expect(prompt).toContain('do not allow: propose_create_customer');
  });
});
