import { OpenAICompatibleChatLanguageModel, type OpenAICompatibleChatSettings } from '@ai-sdk/openai-compatible';
import type { FetchFunction } from '@ai-sdk/provider-utils';

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

export function createAzureOpenAIChatModel(
  modelId: string,
  settings: OpenAICompatibleChatSettings,
  config: AzureOpenAIChatConfig
) {
  return new OpenAICompatibleChatLanguageModel(modelId, settings, {
    provider: config.provider,
    url: config.url,
    headers: config.headers,
    fetch: config.fetch,
    supportsStructuredOutputs: true
  });
}
