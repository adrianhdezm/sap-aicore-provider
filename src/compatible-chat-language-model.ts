import type { OpenAICompatibleChatSettings } from '@ai-sdk/openai-compatible';
import type { LanguageModelV1 } from '@ai-sdk/provider';
import type { BedrockChatSettings } from './bedrock-converse/bedrock-chat-settings';

export interface CompatibleChatLanguageModel {
  createChatModel(modelId: string, settings?: OpenAICompatibleChatSettings | BedrockChatSettings): LanguageModelV1;
}
