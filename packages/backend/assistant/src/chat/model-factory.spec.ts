import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ModelFactory } from './model-factory.js';

const factory = (env: Record<string, string>) =>
  new ModelFactory({ get: (key: string) => env[key] } as unknown as ConfigService);

describe('ModelFactory', () => {
  it('builds a model for each kind of provider', () => {
    const models = factory({ ANTHROPIC_API_KEY: 'k', OPENAI_API_KEY: 'k' });
    const anthropic = models.create({ name: 'A', kind: 'anthropic', baseUrl: null, apiKeyEnv: 'ANTHROPIC_API_KEY' }, 'claude-opus-5-5');
    const openai = models.create({ name: 'O', kind: 'openai', baseUrl: null, apiKeyEnv: 'OPENAI_API_KEY' }, 'gpt-x');
    const ollama = models.create(
      { name: 'Ollama', kind: 'openai-compatible', baseUrl: 'http://localhost:11434/v1', apiKeyEnv: null },
      'qwen3:8b',
    );
    expect([anthropic, openai, ollama].map((m) => typeof m === 'object' && m.modelId)).toEqual([
      'claude-opus-5-5',
      'gpt-x',
      'qwen3:8b',
    ]);
  });

  it('refuses a provider whose key is not set', () => {
    expect(() =>
      factory({}).create({ name: 'A', kind: 'anthropic', baseUrl: null, apiKeyEnv: 'ANTHROPIC_API_KEY' }, 'm'),
    ).toThrow(ServiceUnavailableException);
  });
});
