import type { LanguageModelV1 } from '@ai-sdk/provider';
import {
  AZURE_OPENAI_MODEL_IDS,
  type AzureOpenAIChatConfig
} from './azure-openai/chat-model';
import { OpenAICompatibleChatLanguageModel } from '@ai-sdk/openai-compatible';
import { BedrockCompatibleChatLanguageModel } from './amazon-bedrock/bedrock-compatible-chat-language-model';
import type { OpenAICompatibleChatSettings } from '@ai-sdk/openai-compatible';
import { type FetchFunction, loadSetting, generateId } from '@ai-sdk/provider-utils';
import { createFetchWithToken, type TokenProviderConfig } from './lib/fetch-with-token-provider';
import { BEDROCK_CHAT_MODEL_IDS, type BedrockChatConfig } from './amazon-bedrock/bedrock-chat-settings';

export const AZURE_OPENAI_API_VERSION = '2025-04-01-preview';

export type SapAiCoreModelId = (typeof AZURE_OPENAI_MODEL_IDS)[number] | (typeof BEDROCK_CHAT_MODEL_IDS)[number];

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

  const azureConfig: AzureOpenAIChatConfig = {
    provider: 'sap-aicore.chat',
    url: openaiUrl,
    headers: getHeaders,
    fetch
  };

  const bedrockConfig: BedrockChatConfig = {
    provider: 'sap-aicore.chat',
    baseUrl: bedrockBaseUrl,
    headers: getHeaders,
    fetch,
    generateId
  };


  const createChatModel = (
    modelId: SapAiCoreModelId,
    settings: OpenAICompatibleChatSettings | BedrockChatConfig = {}
  ): LanguageModelV1 => {
    if ((AZURE_OPENAI_MODEL_IDS as readonly string[]).includes(modelId)) {
      return new OpenAICompatibleChatLanguageModel(
        modelId,
        settings as OpenAICompatibleChatSettings,
        {
          provider: azureConfig.provider,
          url: azureConfig.url,
          headers: azureConfig.headers,
          fetch: azureConfig.fetch,
          supportsStructuredOutputs: true
        }
      );
    } else if ((BEDROCK_CHAT_MODEL_IDS as readonly string[]).includes(modelId)) {
      return new BedrockCompatibleChatLanguageModel(modelId, settings as BedrockChatConfig, {
        ...bedrockConfig,
        generateId
      });
    }
    throw new Error(
      `Unsupported model ID: ${modelId}. Supported models are: ${[...AZURE_OPENAI_MODEL_IDS, ...BEDROCK_CHAT_MODEL_IDS].join(', ')}`
    );
  };

  const provider = (modelId: SapAiCoreModelId, settings?: OpenAICompatibleChatSettings | BedrockChatConfig) =>
    createChatModel(modelId, settings);
  provider.chat = createChatModel;
  return provider;
}

export const sapAiCore = createSapAiCore();
