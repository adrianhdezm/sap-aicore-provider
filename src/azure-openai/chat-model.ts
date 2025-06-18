import { OpenAICompatibleChatLanguageModel, type OpenAICompatibleChatSettings } from '@ai-sdk/openai-compatible';
import type { FetchFunction } from '@ai-sdk/provider-utils';
import type { CompatibleChatLanguageModel } from '../compatible-chat-language-model';

export const AZURE_OPENAI_MODEL_IDS = [
  'sap-aicore/gpt-4o',
  'sap-aicore/gpt-4o-mini',
  'sap-aicore/gpt-4.1',
  'sap-aicore/gpt-4.1-nano',
  'sap-aicore/gpt-4.1-mini',
  'sap-aicore/o3',
  'sap-aicore/o3-mini',
  'sap-aicore/o1',
  'sap-aicore/o4-mini'
] as const;

export type AzureOpenAIChatModelId = (typeof AZURE_OPENAI_MODEL_IDS)[number] | (string & {});

export interface AzureOpenAIChatConfig {
  provider: string;
  url: ({ path }: { path: string }) => string;
  headers: () => Record<string, string>;
  fetch?: FetchFunction;
}

export class AzureOpenAIChatLanguageModel implements CompatibleChatLanguageModel<OpenAICompatibleChatSettings> {
  constructor(private readonly config: AzureOpenAIChatConfig) {}

  createChatModel(modelId: string, settings: OpenAICompatibleChatSettings = {}) {
    return new OpenAICompatibleChatLanguageModel(modelId, settings, {
      provider: this.config.provider,
      url: this.config.url,
      headers: this.config.headers,
      fetch: this.config.fetch,
      supportsStructuredOutputs: true
    });
  }
}
