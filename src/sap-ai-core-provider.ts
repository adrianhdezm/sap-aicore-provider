import { OpenAICompatibleChatLanguageModel, type OpenAICompatibleChatSettings } from '@ai-sdk/openai-compatible';
import type { LanguageModelV1 } from '@ai-sdk/provider';
import { type FetchFunction, loadApiKey, loadSetting } from '@ai-sdk/provider-utils';

export type SapAiCoreModelId = 'sap-ai-core/gpt-4o' | 'sap-ai-core/gpt-4.1' | (string & {});

export interface SapAiCoreProvider {
  (deploymentId: string, settings?: OpenAICompatibleChatSettings): LanguageModelV1;
  chat(deploymentId: string, settings?: OpenAICompatibleChatSettings): LanguageModelV1;
}

export interface SapAiCoreProviderSettings {
  baseURL?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  fetch?: FetchFunction;
  apiVersion?: string;
}

export function createSapAiCore(options: SapAiCoreProviderSettings = {}): SapAiCoreProvider {
  const getHeaders = () => ({
    'api-key': loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: 'AZURE_API_KEY',
      description: 'SAP AI Core API Key'
    }),
    ...options.headers
  });

  const apiVersion = options.apiVersion ?? '2025-03-01-preview';
  const url = ({ path }: { path: string }) => {
    const baseUrl = loadSetting({
      settingValue: options.baseURL,
      environmentVariableName: 'AZURE_ENDPOINT',
      settingName: 'baseURL',
      description: 'SAP AI Core Base URL'
    });

    const url = new URL(`${baseUrl}${path}`);
    url.searchParams.set('api-version', apiVersion);
    return url.toString();
  };

  const createChatModel = (modelId: SapAiCoreModelId, settings: OpenAICompatibleChatSettings = {}) =>
    new OpenAICompatibleChatLanguageModel(modelId, settings, {
      provider: 'sap-ai-core.chat',
      url,
      headers: getHeaders,
      fetch: options.fetch
    });

  const provider = (modelId: SapAiCoreModelId, settings?: OpenAICompatibleChatSettings) => createChatModel(modelId, settings);
  provider.chat = createChatModel;
  return provider;
}

export const sapAiCore = createSapAiCore();
