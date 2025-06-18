import type { LanguageModelV1 } from '@ai-sdk/provider';

export interface CompatibleChatLanguageModel<TSettings> {
  createChatModel(modelId: string, settings?: TSettings): LanguageModelV1;
}
