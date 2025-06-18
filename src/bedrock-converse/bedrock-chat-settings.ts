import type { FetchFunction } from '@ai-sdk/provider-utils';

export interface BedrockChatSettings {
  provider: string;
  baseUrl: () => string;
  headers: () => Record<string, string>;
  fetch?: FetchFunction;
  additionalModelRequestFields?: Record<string, any>;
  // for testing
  generateId: () => string;
}

export const BEDROCK_MODEL_IDS = [
  'anthropic--claude-3-haiku',
  'anthropic--claude-3-opus',
  'anthropic--claude-3-sonnet',
  'anthropic--claude-4-sonnet',
  'anthropic--claude-3.5-sonnet',
  'anthropic--claude-3.7-sonnet'
] as const;

export type BedrockModelId = (typeof BEDROCK_MODEL_IDS)[number] | (string & {});
