import { OpenAICompatibleChatLanguageModel, type OpenAICompatibleChatSettings } from '@ai-sdk/openai-compatible';
import type { LanguageModelV1 } from '@ai-sdk/provider';
import { type FetchFunction, loadSetting } from '@ai-sdk/provider-utils';
import { createFetchWithToken, type TokenProviderConfig } from './lib/fetch-with-token-provider';

export type SapAiCoreModelId = 'sap-aicore/gpt-4o' | 'sap-aicore/gpt-4.1' | (string & {});
export const AZURE_OPENAI_API_VERSION = '2024-06-01-preview';

export interface SapAiCoreProvider {
  (deploymentId: string, settings?: OpenAICompatibleChatSettings): LanguageModelV1;
  chat(deploymentId: string, settings?: OpenAICompatibleChatSettings): LanguageModelV1;
}

export interface SapAiCoreProviderSettings {
  deploymentUrl?: string;
  headers?: Record<string, string>;
  aiResourceGroup?: string;
  tokenProvider?: TokenProviderConfig;
  fetch?: FetchFunction;
}

export function createSapAiCore(options: SapAiCoreProviderSettings = {}): SapAiCoreProvider {
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'AI-Resource-Group': options.aiResourceGroup ?? 'default',
    ...options.headers
  });

  const url = ({ path }: { path: string }) => {
    const deploymentUrl = loadSetting({
      settingValue: options.deploymentUrl,
      environmentVariableName: 'SAP_AICORE_DEPLOYMENT_URL',
      settingName: 'deploymentUrl',
      description: 'SAP AI Core Deployment URL'
    });
    const url = new URL(`${deploymentUrl}${path}`);
    url.searchParams.set('api-version', AZURE_OPENAI_API_VERSION);
    return url.toString();
  };

  // Wrap the fetch function with token provider options
  const fetch = createFetchWithToken(options.tokenProvider, options.fetch);

  const createChatModel = (modelId: SapAiCoreModelId, settings: OpenAICompatibleChatSettings = {}) =>
    new OpenAICompatibleChatLanguageModel(modelId, settings, {
      provider: 'sap-aicore.chat',
      url,
      headers: getHeaders,
      fetch,
      supportsStructuredOutputs: true
    });

  const provider = (modelId: SapAiCoreModelId, settings?: OpenAICompatibleChatSettings) => createChatModel(modelId, settings);
  provider.chat = createChatModel;
  return provider;
}

export const sapAiCore = createSapAiCore();
