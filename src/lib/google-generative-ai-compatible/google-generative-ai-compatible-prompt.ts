import { groundingMetadataSchema, safetyRatingSchema } from './google-generative-ai-compatible-chat-language-model.js';
import { z } from 'zod';

export type GoogleGenerativeAICompatiblePrompt = {
  systemInstruction?: GoogleGenerativeAICompatibleSystemInstruction;
  contents: Array<GoogleGenerativeAICompatibleContent>;
};

export type GoogleGenerativeAICompatibleSystemInstruction = {
  parts: Array<{ text: string }>;
};

export type GoogleGenerativeAICompatibleContent = {
  role: 'user' | 'model';
  parts: Array<GoogleGenerativeAICompatibleContentPart>;
};

export type GoogleGenerativeAICompatibleContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { functionCall: { name: string; args: unknown } }
  | { functionResponse: { name: string; response: unknown } }
  | { fileData: { mimeType: string; fileUri: string } };

export type GoogleGenerativeAICompatibleGroundingMetadata = z.infer<typeof groundingMetadataSchema>;

export type GoogleGenerativeAICompatibleSafetyRating = z.infer<typeof safetyRatingSchema>;

export interface GoogleGenerativeAICompatibleProviderMetadata {
  groundingMetadata: GoogleGenerativeAICompatibleGroundingMetadata | null;
  safetyRatings: GoogleGenerativeAICompatibleSafetyRating[] | null;
}
