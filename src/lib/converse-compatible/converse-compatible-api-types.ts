import { type JSONObject } from '@ai-sdk/provider';

export interface ConverseCompatibleInput {
  system?: ConverseSystemMessages;
  messages: ConverseMessages;
  toolConfig?: ConverseToolConfiguration;
  inferenceConfig?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
  };
  additionalModelRequestFields?: Record<string, unknown>;
  guardrailConfig?: ConverseGuardrailConfiguration | ConverseGuardrailStreamConfiguration | undefined;
}

export type ConverseSystemMessages = Array<ConverseSystemContentBlock>;

export type ConverseMessages = Array<ConverseAssistantMessage | ConverseUserMessage>;

export interface ConverseAssistantMessage {
  role: 'assistant';
  content: Array<ConverseContentBlock>;
}

export interface ConverseUserMessage {
  role: 'user';
  content: Array<ConverseContentBlock>;
}

export const BEDROCK_CACHE_POINT = {
  cachePoint: { type: 'default' }
} as const;

export type ConverseCachePoint = { cachePoint: { type: 'default' } };
export type ConverseSystemContentBlock = { text: string } | ConverseCachePoint;

export interface ConverseGuardrailConfiguration {
  guardrails?: Array<{
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  }>;
}

export type ConverseGuardrailStreamConfiguration = ConverseGuardrailConfiguration;

export interface ConverseToolInputSchema {
  json: Record<string, unknown>;
}

export interface ConverseTool {
  toolSpec: {
    name: string;
    description?: string;
    inputSchema: { json: JSONObject };
  };
}

export interface ConverseToolConfiguration {
  tools?: Array<ConverseTool | ConverseCachePoint>;
  toolChoice?: { tool: { name: string } } | { auto: {} } | { any: {} } | undefined;
}

export const BEDROCK_STOP_REASONS = [
  'stop',
  'stop_sequence',
  'end_turn',
  'length',
  'max_tokens',
  'content-filter',
  'content_filtered',
  'guardrail_intervened',
  'tool-calls',
  'tool_use'
] as const;

export type ConverseStopReason = (typeof BEDROCK_STOP_REASONS)[number];

export type ConverseImageFormat = 'jpeg' | 'png' | 'gif';
export type ConverseDocumentFormat = 'pdf' | 'txt' | 'md';

export interface ConverseDocumentBlock {
  document: {
    format: ConverseDocumentFormat;
    name: string;
    source: {
      bytes: string;
    };
  };
}

export interface ConverseGuardrailConverseContentBlock {
  guardContent: unknown;
}

export interface ConverseImageBlock {
  image: {
    format: ConverseImageFormat;
    source: {
      bytes: string;
    };
  };
}

export interface ConverseToolResultBlock {
  toolResult: {
    toolUseId: string;
    content: Array<ConverseTextBlock | ConverseImageBlock>;
  };
}

export interface ConverseToolUseBlock {
  toolUse: {
    toolUseId: string;
    name: string;
    input: Record<string, unknown>;
  };
}

export interface ConverseTextBlock {
  text: string;
}

export interface ConverseReasoningContentBlock {
  reasoningContent: {
    reasoningText: {
      text: string;
      signature?: string;
    };
  };
}

export interface ConverseRedactedReasoningContentBlock {
  reasoningContent: {
    redactedReasoning: {
      data: string;
    };
  };
}

export type ConverseContentBlock =
  | ConverseDocumentBlock
  | ConverseGuardrailConverseContentBlock
  | ConverseImageBlock
  | ConverseTextBlock
  | ConverseToolResultBlock
  | ConverseToolUseBlock
  | ConverseReasoningContentBlock
  | ConverseRedactedReasoningContentBlock
  | ConverseCachePoint;
