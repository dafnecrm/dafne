import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AssistantProviderCheck, AssistantProviderDetail } from '@dafne/contracts';

const DEFAULT_BASE_URL = {
  anthropic: 'https://api.anthropic.com/v1',
  openai: 'https://api.openai.com/v1',
} as const;

const TIMEOUT_MS = 8000;

/**
 * Checks that a provider answers with the key it names, and lists its
 * models (`GET /models`, which Anthropic, OpenAI and OpenAI-compatible
 * servers such as Ollama all have), so a super-admin can pick ids.
 */
@Injectable()
export class ProviderCheckService {
  constructor(private readonly config: ConfigService) {}

  async check(provider: Pick<AssistantProviderDetail, 'kind' | 'baseUrl' | 'apiKeyEnv'>): Promise<AssistantProviderCheck> {
    const apiKey = provider.apiKeyEnv ? this.config.get<string>(provider.apiKeyEnv) : undefined;
    if (provider.apiKeyEnv && !apiKey) {
      return { ok: false, models: [], error: `${provider.apiKeyEnv} is not set in sales-api's environment` };
    }
    const base =
      provider.baseUrl ?? (provider.kind === 'openai-compatible' ? null : DEFAULT_BASE_URL[provider.kind]);
    if (!base) {
      return { ok: false, models: [], error: 'No base URL' };
    }
    const headers: Record<string, string> =
      provider.kind === 'anthropic'
        ? { 'x-api-key': apiKey ?? '', 'anthropic-version': '2023-06-01' }
        : apiKey
          ? { authorization: `Bearer ${apiKey}` }
          : {};
    try {
      const response = await fetch(`${base.replace(/\/+$/, '')}/models`, {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        return { ok: false, models: [], error: `HTTP ${response.status}` };
      }
      const body = (await response.json()) as { data?: { id?: unknown }[] };
      const models = (body.data ?? []).flatMap((model) => (typeof model.id === 'string' ? [model.id] : [])).sort();
      return { ok: true, models };
    } catch (error) {
      return { ok: false, models: [], error: error instanceof Error ? error.message : String(error) };
    }
  }
}
