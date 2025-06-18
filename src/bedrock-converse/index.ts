import { OpenAICompatibleChatLanguageModel, type OpenAICompatibleChatSettings } from '@ai-sdk/openai-compatible';
import type { LanguageModelV1 } from '@ai-sdk/provider';
import type { FetchFunction } from '@ai-sdk/provider-utils';
import type { SapAiCoreModelId } from '../azure-openai';

export type BedrockChatSettings = OpenAICompatibleChatSettings & Record<string, unknown>;

export interface BedrockConverseCompatibleChatConfig {
  provider: string;
  baseUrl: () => string;
  headers: () => Record<string, string>;
  fetch?: FetchFunction;
}

export class BedrockConverseCompatibleChatLanguageModel extends OpenAICompatibleChatLanguageModel implements LanguageModelV1 {
  constructor(modelId: string, settings: BedrockChatSettings = {}, config: BedrockConverseCompatibleChatConfig) {
    super(modelId, settings, {
      provider: config.provider,
      url: () => `${config.baseUrl()}/model/${encodeURIComponent(modelId)}/converse`,
      headers: config.headers,
      fetch: config.fetch,
      supportsStructuredOutputs: true
    });
  }
}

export const BEDROCK_MODEL_IDS: SapAiCoreModelId[] = ['sap-aicore/o3', 'sap-aicore/o3-mini', 'sap-aicore/o1', 'sap-aicore/o4-mini'];
