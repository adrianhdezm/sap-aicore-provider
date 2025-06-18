import type { LanguageModelV1 } from '@ai-sdk/provider';
import type { SapAiCoreModelId } from './azure-openai/chat-model';
import { AzureOpenAICompatibleChatLanguageModel, type AzureOpenAICompatibleChatConfig, OPENAI_MODEL_IDS } from './azure-openai/chat-model';
import {
  BedrockConverseCompatibleChatLanguageModel,
  type BedrockConverseCompatibleChatConfig,
  type BedrockChatSettings,
  BEDROCK_MODEL_IDS
} from './bedrock-converse/chat-model';
import type { OpenAICompatibleChatSettings } from '@ai-sdk/openai-compatible';
import { type FetchFunction, loadSetting } from '@ai-sdk/provider-utils';
import { createFetchWithToken, type TokenProviderConfig } from './lib/fetch-with-token-provider';

export const AZURE_OPENAI_API_VERSION = '2025-04-01-preview';

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

  const azureConfig: AzureOpenAICompatibleChatConfig = {
    provider: 'sap-aicore.chat',
    url: openaiUrl,
    headers: getHeaders,
    fetch
  };

  const bedrockConfig: BedrockConverseCompatibleChatConfig = {
    provider: 'sap-aicore.chat',
    baseUrl: bedrockBaseUrl,
    headers: getHeaders,
    fetch
  };

  const azureStrategy = new AzureOpenAICompatibleChatLanguageModel(azureConfig);
  const bedrockStrategy = new BedrockConverseCompatibleChatLanguageModel(bedrockConfig);

  const createChatModel = (
    modelId: SapAiCoreModelId,
    settings: OpenAICompatibleChatSettings | BedrockChatSettings = {}
  ): LanguageModelV1 => {
    const strategy = BEDROCK_MODEL_IDS.includes(modelId) ? bedrockStrategy : azureStrategy;
    return strategy.createChatModel(modelId, settings as any);
  };

  const provider = (modelId: SapAiCoreModelId, settings?: OpenAICompatibleChatSettings | BedrockChatSettings) =>
    createChatModel(modelId, settings);
  provider.chat = createChatModel;
  return provider;
}

export const sapAiCore = createSapAiCore();

export type { SapAiCoreModelId } from './azure-openai/chat-model';
