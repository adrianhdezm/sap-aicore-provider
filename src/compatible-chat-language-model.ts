import type { LanguageModelV1 } from '@ai-sdk/provider';

export interface CompatibleChatLanguageModel {
  createChatModel(modelId: string, settings?: Record<string, unknown>): LanguageModelV1;
}
