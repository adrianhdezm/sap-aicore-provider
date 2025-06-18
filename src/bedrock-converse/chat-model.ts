import { OpenAICompatibleChatLanguageModel, type OpenAICompatibleChatSettings } from '@ai-sdk/openai-compatible';
import type { FetchFunction } from '@ai-sdk/provider-utils';
import type { SapAiCoreModelId } from '../azure-openai/chat-model';
import type { CompatibleChatLanguageModel } from '../compatible-chat-language-model';

export type BedrockChatSettings = OpenAICompatibleChatSettings & Record<string, unknown>;

export interface BedrockConverseCompatibleChatConfig {
  provider: string;
  baseUrl: () => string;
  headers: () => Record<string, string>;
  fetch?: FetchFunction;
}

export class BedrockConverseCompatibleChatLanguageModel implements CompatibleChatLanguageModel {
  constructor(private readonly config: BedrockConverseCompatibleChatConfig) {}

  createChatModel(modelId: string, settings: BedrockChatSettings = {}) {
    return new OpenAICompatibleChatLanguageModel(modelId, settings, {
      provider: this.config.provider,
      url: () => `${this.config.baseUrl()}/model/${encodeURIComponent(modelId)}/converse`,
      headers: this.config.headers,
      fetch: this.config.fetch,
      supportsStructuredOutputs: true
    });
  }
}

export const BEDROCK_MODEL_IDS = [
  'sap-aicore/o3',
  'sap-aicore/o3-mini',
  'sap-aicore/o1',
  'sap-aicore/o4-mini'
] as const satisfies readonly SapAiCoreModelId[];

export type BedrockModelId = (typeof BEDROCK_MODEL_IDS)[number];

export function isBedrockModelId(modelId: SapAiCoreModelId): modelId is BedrockModelId {
  return (BEDROCK_MODEL_IDS as readonly string[]).includes(modelId);
}
