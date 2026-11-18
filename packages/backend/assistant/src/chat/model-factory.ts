import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LanguageModel } from 'ai';
import { msg, type AssistantProviderKind } from '@dafne/contracts';

/** What ModelFactory needs of a provider row. */
export interface ProviderConfig {
  name: string;
  kind: AssistantProviderKind;
  baseUrl: string | null;
  apiKeyEnv: string | null;
}

/**
 * Turns a provider and a model id into an AI SDK model. API keys are read
 * from the env var the provider names (never from the database), so a key
 * changes with a restart of sales-api.
 */
@Injectable()
export class ModelFactory {
  constructor(private readonly config: ConfigService) {}

  create(provider: ProviderConfig, modelId: string): LanguageModel {
    const apiKey = provider.apiKeyEnv ? this.config.get<string>(provider.apiKeyEnv) : undefined;
    const baseURL = provider.baseUrl ?? undefined;
    switch (provider.kind) {
      case 'anthropic':
        return createAnthropic({ apiKey: this.requireKey(apiKey), baseURL })(modelId);
      case 'openai':
        return createOpenAI({ apiKey: this.requireKey(apiKey), baseURL })(modelId);
      case 'openai-compatible':
        if (!baseURL) {
          throw new ServiceUnavailableException(msg('assistant.provider.unavailable'));
        }
        // Local servers (Ollama, LM Studio) usually need no key.
        return createOpenAICompatible({ name: provider.name, baseURL, apiKey })(modelId);
    }
  }

  private requireKey(apiKey: string | undefined): string {
    if (!apiKey) {
      throw new ServiceUnavailableException(msg('assistant.provider.missingKey'));
    }
    return apiKey;
  }
}
