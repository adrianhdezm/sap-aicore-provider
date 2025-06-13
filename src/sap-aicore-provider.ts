import { OpenAICompatibleChatLanguageModel, type OpenAICompatibleChatSettings } from '@ai-sdk/openai-compatible';
import type { LanguageModelV1 } from '@ai-sdk/provider';
import { type FetchFunction, loadApiKey, loadSetting } from '@ai-sdk/provider-utils';
import { createFetchWithToken, type TokenProviderConfig } from './lib/fetch-with-token-provider';
import { loadObjectSetting } from './lib/load-object-setting';

export type SapAiCoreModelId = 'sap-aicore/gpt-4o' | 'sap-aicore/gpt-4.1' | (string & {});

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
  tokenProvider?: TokenProviderConfig;
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

  let tokenProvider = options.tokenProvider;
  if (!tokenProvider) {
    const hasEnv =
      typeof process !== 'undefined' &&
      [
        'TOKEN_PROVIDER_BASE_URL',
        'TOKEN_PROVIDER_CLIENT_ID',
        'TOKEN_PROVIDER_CLIENT_SECRET',
        'TOKEN_PROVIDER_HEADER_NAME',
        'TOKEN_PROVIDER_CACHE_MAX_AGE_MS'
      ].some((v) => process.env[v] != null);

    if (hasEnv) {
      tokenProvider = loadObjectSetting<TokenProviderConfig>({
        settingValue: undefined,
        environmentVariableMap: {
          baseURL: 'TOKEN_PROVIDER_BASE_URL',
          clientId: 'TOKEN_PROVIDER_CLIENT_ID',
          clientSecret: 'TOKEN_PROVIDER_CLIENT_SECRET',
          headerName: 'TOKEN_PROVIDER_HEADER_NAME',
          cacheMaxAgeMs: 'TOKEN_PROVIDER_CACHE_MAX_AGE_MS'
        },
        settingName: 'tokenProvider',
        description: 'SAP AI Core Token Provider'
      });

      if (tokenProvider.cacheMaxAgeMs != null) {
        tokenProvider.cacheMaxAgeMs = Number(tokenProvider.cacheMaxAgeMs);
      }
    }
  }

  const fetch = tokenProvider ? createFetchWithToken(tokenProvider, options.fetch) : options.fetch;

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
