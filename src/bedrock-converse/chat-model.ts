import type { FetchFunction } from '@ai-sdk/provider-utils';
import type { CompatibleChatLanguageModel } from '../compatible-chat-language-model';
import { BedrockChatLanguageModel } from './bedrock-chat-language-model.js';
import type { BedrockChatSettings } from './bedrock-chat-settings';

export class BedrockConverseCompatibleChatLanguageModel implements CompatibleChatLanguageModel {
  constructor(private readonly config: BedrockChatSettings) {}

  createChatModel(modelId: string, settings: BedrockChatSettings) {
    return new BedrockChatLanguageModel(modelId, settings, {
      provider: this.config.provider,
      baseUrl: () => `${this.config.baseUrl()}/model/${encodeURIComponent(modelId)}/converse`,
      headers: this.config.headers,
      fetch: this.config.fetch,
      generateId: this.config.generateId
    });
  }
}
