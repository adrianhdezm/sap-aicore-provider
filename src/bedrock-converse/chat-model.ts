import type { CompatibleChatLanguageModel } from '../compatible-chat-language-model';
import { BedrockChatLanguageModel } from './bedrock-chat-language-model.js';
import type { BedrockChatConfig } from './bedrock-chat-settings';
import { generateId } from '@ai-sdk/provider-utils';

export class BedrockConverseChatLanguageModel implements CompatibleChatLanguageModel<BedrockChatConfig> {
  constructor(private readonly config: BedrockChatConfig) {}

  createChatModel(modelId: string, settings: BedrockChatConfig) {
    return new BedrockChatLanguageModel(modelId, settings, {
      provider: this.config.provider,
      baseUrl: () => `${this.config.baseUrl()}/model/${encodeURIComponent(modelId)}/converse`,
      headers: this.config.headers,
      fetch: this.config.fetch,
      generateId
    });
  }
}
