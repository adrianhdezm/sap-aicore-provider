import { OpenAICompatibleChatLanguageModel, type OpenAICompatibleChatSettings } from '@ai-sdk/openai-compatible';
import type { LanguageModelV1 } from '@ai-sdk/provider';
import { type FetchFunction, loadSetting } from '@ai-sdk/provider-utils';
import { createFetchWithToken, type TokenProviderConfig } from './lib/fetch-with-token-provider';
import { loadObjectSetting } from './lib/load-object-setting';

export type SapAiCoreModelId = 'sap-aicore/gpt-4o' | 'sap-aicore/gpt-4.1' | (string & {});
export const AZURE_OPENAI_API_VERSION = '2024-06-01-preview';

export interface SapAiCoreProvider {
  (deploymentId: string, settings?: OpenAICompatibleChatSettings): LanguageModelV1;
  chat(deploymentId: string, settings?: OpenAICompatibleChatSettings): LanguageModelV1;
}

export interface SapAiCoreProviderSettings {
  deploymentUrl?: string;
  headers?: Record<string, string>;
  tokenProvider?: TokenProviderConfig;
  fetch?: FetchFunction;
}

export function createSapAiCore(options: SapAiCoreProviderSettings = {}): SapAiCoreProvider {
  const getHeaders = () => ({
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
