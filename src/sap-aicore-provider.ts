import { OpenAICompatibleChatLanguageModel, type OpenAICompatibleChatSettings } from '@ai-sdk/openai-compatible';
import type { LanguageModelV1 } from '@ai-sdk/provider';
import { type FetchFunction, generateId, loadSetting } from '@ai-sdk/provider-utils';
import { createFetchWithToken, type TokenProviderConfig } from './lib/fetch-with-token-provider.js';
import type { ConverseCompatibleChatSettings } from './lib/converse-compatible/converse-compatible-chat-settings.js';
import { ConverseCompatibleChatLanguageModel } from './lib/converse-compatible/converse-compatible-chat-language-model.js';

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
  | 'sap-aicore/anthropic--claude-3-haiku'
  | 'sap-aicore/anthropic--claude-3-opus'
  | 'sap-aicore/anthropic--claude-3-sonnet'
  | 'sap-aicore/anthropic--claude-4-sonnet'
  | 'sap-aicore/anthropic--claude-3.5-sonnet'
  | 'sap-aicore/anthropic--claude-3.7-sonnet'
  | (string & {});

export const AZURE_OPENAI_API_VERSION = '2025-04-01-preview';

export type SapAiCoreChatSettings = OpenAICompatibleChatSettings | ConverseCompatibleChatSettings;

export interface SapAiCoreProvider {
  (modelId: SapAiCoreModelId, settings?: SapAiCoreChatSettings): LanguageModelV1;
  chat(modelId: SapAiCoreModelId, settings?: SapAiCoreChatSettings): LanguageModelV1;
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

  const url = ({ modelId, path }: { path: string; modelId: SapAiCoreModelId }) => {
    const deploymentUrl = loadSetting({
      settingValue: options.deploymentUrl,
      environmentVariableName: 'AICORE_DEPLOYMENT_URL',
      settingName: 'deploymentUrl',
      description: 'SAP AI Core Deployment URL'
    });
    const url = new URL(`${deploymentUrl}${path}`);
    if (modelId.startsWith('sap-aicore/anthropic')) {
      // For Anthropic models, we return the URL without the API version
      return url.toString();
    } else {
      // For openai models, we append the API version
      url.searchParams.set('api-version', AZURE_OPENAI_API_VERSION);
      return url.toString();
    }
  };

  // Wrap the fetch function with token provider options
  const fetch = createFetchWithToken(options.tokenProvider, options.fetch);

  const createChatModel = (modelId: SapAiCoreModelId, settings: SapAiCoreChatSettings = {}) => {
    if (!modelId.startsWith('sap-aicore/')) {
      throw new Error(`Invalid modelId: ${modelId}. Model IDs must start with 'sap-aicore/'.`);
    }

    if (modelId.startsWith('sap-aicore/anthropic')) {
      // For Anthropic models, we use the Converse-compatible chat model
      const chatModelSettings = settings as ConverseCompatibleChatSettings;
      return new ConverseCompatibleChatLanguageModel(modelId, chatModelSettings, {
        provider: 'sap-aicore.chat',
        url,
        headers: getHeaders,
        fetch,
        generateId
      });
    } else {
      const chatSettings = settings as OpenAICompatibleChatSettings;
      return new OpenAICompatibleChatLanguageModel(modelId, chatSettings, {
        provider: 'sap-aicore.chat',
        url,
        headers: getHeaders,
        fetch,
        supportsStructuredOutputs: true
      });
    }
  };

  const provider = (modelId: SapAiCoreModelId, settings?: SapAiCoreChatSettings) => createChatModel(modelId, settings);
  provider.chat = createChatModel;
  return provider;
}

export const sapAiCore = createSapAiCore();
