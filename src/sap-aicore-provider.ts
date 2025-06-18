import { OpenAICompatibleChatLanguageModel, type OpenAICompatibleChatSettings } from '@ai-sdk/openai-compatible';
import type { LanguageModelV1 } from '@ai-sdk/provider';
import {
  BedrockConverseCompatibleChatLangeageModel,
  type BedrockConverseCompatibleChatConfig,
  type BedrockChatSettings
} from './bedrock-converse-compatible';
import { type FetchFunction, loadSetting } from '@ai-sdk/provider-utils';
import { createFetchWithToken, type TokenProviderConfig } from './lib/fetch-with-token-provider';

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
  | (string & {});

export const AZURE_OPENAI_API_VERSION = '2025-04-01-preview';

const OPENAI_MODEL_IDS: SapAiCoreModelId[] = [
  'sap-aicore/gpt-4o',
  'sap-aicore/gpt-4o-mini',
  'sap-aicore/gpt-4.1',
  'sap-aicore/gpt-4.1-nano',
  'sap-aicore/gpt-4.1-mini'
];

const BEDROCK_MODEL_IDS: SapAiCoreModelId[] = ['sap-aicore/o3', 'sap-aicore/o3-mini', 'sap-aicore/o1', 'sap-aicore/o4-mini'];

export interface SapAiCoreProvider {
  (modelId: SapAiCoreModelId, settings?: OpenAICompatibleChatSettings): LanguageModelV1;
  chat(modelId: SapAiCoreModelId, settings?: OpenAICompatibleChatSettings): LanguageModelV1;
}

export interface SapAiCoreProviderSettings {
  deploymentUrl?: string;
  headers?: Record<string, string>;
  aiResourceGroup?: string;
  tokenProvider?: TokenProviderConfig;
  fetch?: FetchFunction;
}

export function createSapAiCore(options: SapAiCoreProviderSettings = {}): SapAiCoreProvider {
  const getHeaders = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    'AI-Resource-Group': options.aiResourceGroup ?? 'default',
    ...options.headers
  });

  const getDeploymentUrl = () =>
    loadSetting({
      settingValue: options.deploymentUrl,
      environmentVariableName: 'SAP_AICORE_DEPLOYMENT_URL',
      settingName: 'deploymentUrl',
      description: 'SAP AI Core Deployment URL'
    });

  const openaiUrl = ({ path }: { path: string }) => {
    const deploymentUrl = getDeploymentUrl();
    const url = new URL(`${deploymentUrl}${path}`);
    url.searchParams.set('api-version', AZURE_OPENAI_API_VERSION);
    return url.toString();
  };

  const bedrockBaseUrl = () => getDeploymentUrl();

  // Wrap the fetch function with token provider options
  const fetch = createFetchWithToken(options.tokenProvider, options.fetch);

  const bedrockConfig: BedrockConverseCompatibleChatConfig = {
    provider: 'sap-aicore.chat',
    baseUrl: bedrockBaseUrl,
    headers: getHeaders,
    fetch
  };

  const createChatModel = (
    modelId: SapAiCoreModelId,
    settings: OpenAICompatibleChatSettings | BedrockChatSettings = {}
  ): LanguageModelV1 => {
    if (!BEDROCK_MODEL_IDS.includes(modelId)) {
      return new OpenAICompatibleChatLanguageModel(modelId, settings as OpenAICompatibleChatSettings, {
        provider: 'sap-aicore.chat',
        url: openaiUrl,
        headers: getHeaders,
        fetch,
        supportsStructuredOutputs: true
      });
    }
    return new BedrockConverseCompatibleChatLangeageModel(modelId, settings as BedrockChatSettings, bedrockConfig);
  };

  const provider = (modelId: SapAiCoreModelId, settings?: OpenAICompatibleChatSettings | BedrockChatSettings) =>
    createChatModel(modelId, settings);
  provider.chat = createChatModel;
  return provider;
}

export const sapAiCore = createSapAiCore();
