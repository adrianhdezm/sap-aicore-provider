import type { FetchFunction } from '@ai-sdk/provider-utils';

export interface BedrockChatConfig {
  provider: string;
  baseUrl: () => string;
  headers: () => Record<string, string>;
  fetch?: FetchFunction;
  additionalModelRequestFields?: Record<string, any>;
}

export const BEDROCK_CHAT_MODEL_IDS = [
  'anthropic--claude-3-haiku',
  'anthropic--claude-3-opus',
  'anthropic--claude-3-sonnet',
  'anthropic--claude-4-sonnet',
  'anthropic--claude-3.5-sonnet',
  'anthropic--claude-3.7-sonnet'
] as const;

export type BedrockChatModelId = (typeof BEDROCK_CHAT_MODEL_IDS)[number] | (string & {});
