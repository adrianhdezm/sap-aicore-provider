import { OpenAICompatibleChatLanguageModel, type OpenAICompatibleChatSettings } from '@ai-sdk/openai-compatible';
import type { FetchFunction } from '@ai-sdk/provider-utils';
import type { CompatibleChatLanguageModel } from '../compatible-chat-language-model';

export type SapAiCoreModelId =
  | 'sap-aicore/gpt-4o'
  | 'sap-aicore/gpt-4o-mini'
  | 'sap-aicore/gpt-4.1'
  | 'sap-aicore/gpt-4.1-nano'
  | 'sap-aicore/gpt-4.1-mini'
  | 'sap-aicore/o3'
  | 'sap-aicore/o3-mini'
  | 'sap-aicore/o1'
  | 'sap-aicore/o4-mini'
  | 'anthropic--claude-3-haiku'
  | 'anthropic--claude-3-opus'
  | 'anthropic--claude-3-sonnet'
  | 'anthropic--claude-4-sonnet'
  | 'anthropic--claude-3.5-sonnet'
  | 'anthropic--claude-3.7-sonnet'
  | (string & {});

export const OPENAI_MODEL_IDS = [
  'sap-aicore/gpt-4o',
  'sap-aicore/gpt-4o-mini',
  'sap-aicore/gpt-4.1',
  'sap-aicore/gpt-4.1-nano',
  'sap-aicore/gpt-4.1-mini',
  'sap-aicore/o3',
  'sap-aicore/o3-mini',
  'sap-aicore/o1',
  'sap-aicore/o4-mini'
] as const satisfies readonly SapAiCoreModelId[];

export type AzureOpenAIModelId = (typeof OPENAI_MODEL_IDS)[number];

export function isAzureOpenAIModelId(modelId: SapAiCoreModelId): modelId is AzureOpenAIModelId {
  return (OPENAI_MODEL_IDS as readonly string[]).includes(modelId);
}

export interface AzureOpenAICompatibleChatConfig {
  provider: string;
  url: ({ path }: { path: string }) => string;
  headers: () => Record<string, string>;
  fetch?: FetchFunction;
}

export class AzureOpenAICompatibleChatLanguageModel implements CompatibleChatLanguageModel {
  constructor(private readonly config: AzureOpenAICompatibleChatConfig) {}

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
