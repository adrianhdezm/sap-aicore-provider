import {
  type LanguageModelV1,
  type LanguageModelV1CallWarning,
  type LanguageModelV1FinishReason,
  type LanguageModelV1ProviderMetadata,
  type LanguageModelV1Source,
  type LanguageModelV1StreamPart
} from '@ai-sdk/provider';
import {
  type FetchFunction,
  type ParseResult,
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  parseProviderOptions,
  postJsonToApi
} from '@ai-sdk/provider-utils';
import { z } from 'zod';
import { convertJSONSchemaToOpenAPISchema } from './convert-json-schema-to-openapi-schema.js';
import { convertToGoogleGenerativeAICompatibleMessages } from './convert-to-google-generative-ai-compatible-messages.js';
import { googleFailedResponseHandler } from './google-error.js';
import { type GoogleGenerativeAICompatibleContentPart } from './google-generative-ai-compatible-prompt.js';
import {
  type GoogleGenerativeAICompatibleModelId,
  type GoogleGenerativeAICompatibleSettings
} from './google-generative-ai-compatible-settings.js';
import { prepareTools } from './google-prepare-tools.js';
import { mapGoogleGenerativeAICompatibleFinishReason } from './map-google-generative-ai-finish-reason.js';

type GoogleGenerativeAICompatibleConfig = {
  provider: string;
  url: (options: { modelId: string; path: string }) => string;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
  generateId: () => string;
};

export class GoogleGenerativeAICompatibleLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = 'v1';
  readonly defaultObjectGenerationMode = 'json';
  readonly supportsImageUrls = false;

  get supportsStructuredOutputs() {
    return this.settings.structuredOutputs ?? true;
  }

  readonly modelId: GoogleGenerativeAICompatibleModelId;
  readonly settings: GoogleGenerativeAICompatibleSettings;

  private readonly config: GoogleGenerativeAICompatibleConfig;

  constructor(
    modelId: GoogleGenerativeAICompatibleModelId,
    settings: GoogleGenerativeAICompatibleSettings,
    config: GoogleGenerativeAICompatibleConfig
  ) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }

  get provider(): string {
    return this.config.provider;
  }

  private async getArgs({
    mode,
    prompt,
    maxTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences,
    responseFormat,
    seed,
    providerMetadata
  }: Parameters<LanguageModelV1['doGenerate']>[0]) {
    const type = mode.type;

    const warnings: LanguageModelV1CallWarning[] = [];

    const googleOptions = parseProviderOptions({
      provider: 'google',
      providerOptions: providerMetadata,
      schema: googleGenerativeAIProviderOptionsSchema
    });

    // Add warning if includeThoughts is used with a non-Vertex Google provider
    if (googleOptions?.thinkingConfig?.includeThoughts === true && !this.config.provider.startsWith('google.vertex.')) {
      warnings.push({
        type: 'other',
        message:
          "The 'includeThoughts' option is only supported with the Google Vertex provider " +
          'and might not be supported or could behave unexpectedly with the current Google provider ' +
          `(${this.config.provider}).`
      });
    }

    const generationConfig = {
      // standardized settings:
      maxOutputTokens: maxTokens,
      temperature,
      topK,
      topP,
      frequencyPenalty,
      presencePenalty,
      stopSequences,
      seed,

      // response format:
      responseMimeType: responseFormat?.type === 'json' ? 'application/json' : undefined,
      responseSchema:
        responseFormat?.type === 'json' &&
        responseFormat.schema != null &&
        // Google GenAI does not support all OpenAPI Schema features,
        // so this is needed as an escape hatch:
        this.supportsStructuredOutputs
          ? convertJSONSchemaToOpenAPISchema(responseFormat.schema)
          : undefined,
      ...(this.settings.audioTimestamp && {
        audioTimestamp: this.settings.audioTimestamp
      }),

      // provider options:
      responseModalities: googleOptions?.responseModalities,
      thinkingConfig: googleOptions?.thinkingConfig
    };

    const { contents, systemInstruction } = convertToGoogleGenerativeAICompatibleMessages(prompt);

    switch (type) {
      case 'regular': {
        const { tools, toolConfig, toolWarnings } = prepareTools(
          mode,
          this.settings.useSearchGrounding ?? false,
          this.settings.dynamicRetrievalConfig,
          this.modelId
        );

        return {
          args: {
            generationConfig,
            contents,
            systemInstruction,
            safetySettings: this.settings.safetySettings,
            tools,
            toolConfig,
            cachedContent: this.settings.cachedContent
          },
          warnings: [...warnings, ...toolWarnings]
        };
      }

      case 'object-json': {
        return {
          args: {
            generationConfig: {
              ...generationConfig,
              responseMimeType: 'application/json',
              responseSchema:
                mode.schema != null &&
                // Google GenAI does not support all OpenAPI Schema features,
                // so this is needed as an escape hatch:
                this.supportsStructuredOutputs
                  ? convertJSONSchemaToOpenAPISchema(mode.schema)
                  : undefined
            },
            contents,
            systemInstruction,
            safetySettings: this.settings.safetySettings,
            cachedContent: this.settings.cachedContent
          },
          warnings
        };
      }

      case 'object-tool': {
        return {
          args: {
            generationConfig,
            contents,
            tools: {
              functionDeclarations: [
                {
                  name: mode.tool.name,
                  description: mode.tool.description ?? '',
                  parameters: convertJSONSchemaToOpenAPISchema(mode.tool.parameters)
                }
              ]
            },
            toolConfig: { functionCallingConfig: { mode: 'ANY' } },
            safetySettings: this.settings.safetySettings,
            cachedContent: this.settings.cachedContent
          },
          warnings
        };
      }

      default: {
        const _exhaustiveCheck: never = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }

  async doGenerate(options: Parameters<LanguageModelV1['doGenerate']>[0]): Promise<Awaited<ReturnType<LanguageModelV1['doGenerate']>>> {
    const { args, warnings } = await this.getArgs(options);
    const body = JSON.stringify(args);

    const url = `${this.config.url({ modelId: this.modelId, path: `/models/${this.modelId.replace('sap-aicore/', '')}:generateContent` })}`;
    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse
    } = await postJsonToApi({
      url,
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: googleFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(responseSchema),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });

    const { contents: rawPrompt, ...rawSettings } = args;
    const candidate = response.candidates[0]!;

    const parts =
      candidate.content == null || typeof candidate.content !== 'object' || !('parts' in candidate.content) ? [] : candidate.content.parts;

    const toolCalls = getToolCallsFromParts({
      parts: parts, // Use candidateParts
      generateId: this.config.generateId
    });

    const usageMetadata = response.usageMetadata;

    return {
      text: getTextFromParts(parts),
      reasoning: getReasoningDetailsFromParts(parts),
      files: getInlineDataParts(parts)?.map((part) => ({
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType
      })),
      toolCalls,
      finishReason: mapGoogleGenerativeAICompatibleFinishReason({
        finishReason: candidate.finishReason,
        hasToolCalls: toolCalls != null && toolCalls.length > 0
      }),
      usage: {
        promptTokens: usageMetadata?.promptTokenCount ?? NaN,
        completionTokens: usageMetadata?.candidatesTokenCount ?? NaN
      },
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders, body: rawResponse },
      warnings,
      providerMetadata: {
        google: {
          groundingMetadata: candidate.groundingMetadata ?? null,
          safetyRatings: candidate.safetyRatings ?? null
        }
      },
      sources: extractSources({
        groundingMetadata: candidate.groundingMetadata,
        generateId: this.config.generateId
      }),
      request: { body }
    };
  }

  async doStream(options: Parameters<LanguageModelV1['doStream']>[0]): Promise<Awaited<ReturnType<LanguageModelV1['doStream']>>> {
    const { args, warnings } = await this.getArgs(options);

    const body = JSON.stringify(args);
    const url = `${this.config.url({ modelId: this.modelId, path: `/models/${this.modelId.replace('sap-aicore/', '')}:streamGenerateContent?alt=sse` })}`;

    const { responseHeaders, value: response } = await postJsonToApi({
      url,
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: googleFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(chunkSchema),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });

    const { contents: rawPrompt, ...rawSettings } = args;

    let finishReason: LanguageModelV1FinishReason = 'unknown';
    let usage: { promptTokens: number; completionTokens: number } = {
      promptTokens: Number.NaN,
      completionTokens: Number.NaN
    };
    let providerMetadata: LanguageModelV1ProviderMetadata | undefined = undefined;

    const generateId = this.config.generateId;
    let hasToolCalls = false;

    return {
      stream: response.pipeThrough(
        new TransformStream<ParseResult<z.infer<typeof chunkSchema>>, LanguageModelV1StreamPart>({
          transform(chunk, controller) {
            if (!chunk.success) {
              controller.enqueue({ type: 'error', error: chunk.error });
              return;
            }

            const value = chunk.value;

            const usageMetadata = value.usageMetadata;

            if (usageMetadata != null) {
              usage = {
                promptTokens: usageMetadata.promptTokenCount ?? NaN,
                completionTokens: usageMetadata.candidatesTokenCount ?? NaN
              };
            }

            const candidate = value.candidates?.[0];

            // sometimes the API returns an empty candidates array
            if (candidate == null) {
              return;
            }

            const content = candidate.content;

            // Process tool call's parts before determining finishReason to ensure hasToolCalls is properly set
            if (content != null) {
              const deltaText = getTextFromParts(content.parts);
              if (deltaText != null) {
                controller.enqueue({
                  type: 'text-delta',
                  textDelta: deltaText
                });
              }

              const reasoningDeltaText = getReasoningDetailsFromParts(content.parts);
              if (reasoningDeltaText != null) {
                for (const part of reasoningDeltaText) {
                  controller.enqueue({
                    type: 'reasoning',
                    textDelta: part.text
                  });
                }
              }

              const inlineDataParts = getInlineDataParts(content.parts);
              if (inlineDataParts != null) {
                for (const part of inlineDataParts) {
                  controller.enqueue({
                    type: 'file',
                    mimeType: part.inlineData.mimeType,
                    data: part.inlineData.data
                  });
                }
              }

              const toolCallDeltas = getToolCallsFromParts({
                parts: content.parts,
                generateId
              });

              if (toolCallDeltas != null) {
                for (const toolCall of toolCallDeltas) {
                  controller.enqueue({
                    type: 'tool-call-delta',
                    toolCallType: 'function',
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    argsTextDelta: toolCall.args
                  });

                  controller.enqueue({
                    type: 'tool-call',
                    toolCallType: 'function',
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    args: toolCall.args
                  });

                  hasToolCalls = true;
                }
              }
            }

            if (candidate.finishReason != null) {
              finishReason = mapGoogleGenerativeAICompatibleFinishReason({
                finishReason: candidate.finishReason,
                hasToolCalls
              });

              const sources =
                extractSources({
                  groundingMetadata: candidate.groundingMetadata,
                  generateId
                }) ?? [];

              for (const source of sources) {
                controller.enqueue({ type: 'source', source });
              }

              providerMetadata = {
                google: {
                  groundingMetadata: candidate.groundingMetadata ?? null,
                  safetyRatings: candidate.safetyRatings ?? null
                }
              };
            }
          },

          flush(controller) {
            controller.enqueue({
              type: 'finish',
              finishReason,
              usage,
              providerMetadata
            });
          }
        })
      ),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      warnings,
      request: { body }
    };
  }
}

function getToolCallsFromParts({ parts, generateId }: { parts: z.infer<typeof contentSchema>['parts']; generateId: () => string }) {
  const functionCallParts = parts?.filter((part) => 'functionCall' in part) as Array<
    GoogleGenerativeAICompatibleContentPart & {
      functionCall: { name: string; args: unknown };
    }
  >;

  return functionCallParts == null || functionCallParts.length === 0
    ? undefined
    : functionCallParts.map((part) => ({
        toolCallType: 'function' as const,
        toolCallId: generateId(),
        toolName: part.functionCall.name,
        args: JSON.stringify(part.functionCall.args)
      }));
}

function getTextFromParts(parts: z.infer<typeof contentSchema>['parts']) {
  const textParts = parts?.filter(
    (part) => 'text' in part && (part as any).thought !== true // Exclude thought parts
  ) as Array<GoogleGenerativeAICompatibleContentPart & { text: string }>;

  return textParts == null || textParts.length === 0 ? undefined : textParts.map((part) => part.text).join('');
}

function getReasoningDetailsFromParts(parts: z.infer<typeof contentSchema>['parts']): Array<{ type: 'text'; text: string }> | undefined {
  const reasoningParts = parts?.filter((part) => 'text' in part && (part as any).thought === true) as Array<
    GoogleGenerativeAICompatibleContentPart & { text: string; thought?: boolean }
  >;

  return reasoningParts == null || reasoningParts.length === 0
    ? undefined
    : reasoningParts.map((part) => ({ type: 'text', text: part.text }));
}

function getInlineDataParts(parts: z.infer<typeof contentSchema>['parts']) {
  return parts?.filter(
    (
      part
    ): part is {
      inlineData: { mimeType: string; data: string };
    } => 'inlineData' in part
  );
}

function extractSources({
  groundingMetadata,
  generateId
}: {
  groundingMetadata: z.infer<typeof groundingMetadataSchema> | undefined | null;
  generateId: () => string;
}): undefined | LanguageModelV1Source[] {
  return groundingMetadata?.groundingChunks
    ?.filter(
      (
        chunk
      ): chunk is z.infer<typeof groundingChunkSchema> & {
        web: { uri: string; title?: string };
      } => chunk.web != null
    )
    .map((chunk) => ({
      sourceType: 'url',
      id: generateId(),
      url: chunk.web.uri,
      title: chunk.web.title
    }));
}

const contentSchema = z.object({
  role: z.string(),
  parts: z
    .array(
      z.union([
        z.object({
          text: z.string(),
          thought: z.boolean().nullish()
        }),
        z.object({
          functionCall: z.object({
            name: z.string(),
            args: z.unknown()
          })
        }),
        z.object({
          inlineData: z.object({
            mimeType: z.string(),
            data: z.string()
          })
        })
      ])
    )
    .nullish()
});

// https://ai.google.dev/gemini-api/docs/grounding
// https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/ground-gemini#ground-to-search
const groundingChunkSchema = z.object({
  web: z.object({ uri: z.string(), title: z.string() }).nullish(),
  retrievedContext: z.object({ uri: z.string(), title: z.string() }).nullish()
});

export const groundingMetadataSchema = z.object({
  webSearchQueries: z.array(z.string()).nullish(),
  retrievalQueries: z.array(z.string()).nullish(),
  searchEntryPoint: z.object({ renderedContent: z.string() }).nullish(),
  groundingChunks: z.array(groundingChunkSchema).nullish(),
  groundingSupports: z
    .array(
      z.object({
        segment: z.object({
          startIndex: z.number().nullish(),
          endIndex: z.number().nullish(),
          text: z.string().nullish()
        }),
        segment_text: z.string().nullish(),
        groundingChunkIndices: z.array(z.number()).nullish(),
        supportChunkIndices: z.array(z.number()).nullish(),
        confidenceScores: z.array(z.number()).nullish(),
        confidenceScore: z.array(z.number()).nullish()
      })
    )
    .nullish(),
  retrievalMetadata: z
    .union([
      z.object({
        webDynamicRetrievalScore: z.number()
      }),
      z.object({})
    ])
    .nullish()
});

// https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-filters
export const safetyRatingSchema = z.object({
  category: z.string().nullish(),
  probability: z.string().nullish(),
  probabilityScore: z.number().nullish(),
  severity: z.string().nullish(),
  severityScore: z.number().nullish(),
  blocked: z.boolean().nullish()
});

const responseSchema = z.object({
  candidates: z.array(
    z.object({
      content: contentSchema.nullish().or(z.object({}).strict()),
      finishReason: z.string().nullish(),
      safetyRatings: z.array(safetyRatingSchema).nullish(),
      groundingMetadata: groundingMetadataSchema.nullish()
    })
  ),
  usageMetadata: z
    .object({
      promptTokenCount: z.number().nullish(),
      candidatesTokenCount: z.number().nullish(),
      totalTokenCount: z.number().nullish()
    })
    .nullish()
});

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const chunkSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: contentSchema.nullish(),
        finishReason: z.string().nullish(),
        safetyRatings: z.array(safetyRatingSchema).nullish(),
        groundingMetadata: groundingMetadataSchema.nullish()
      })
    )
    .nullish(),
  usageMetadata: z
    .object({
      promptTokenCount: z.number().nullish(),
      candidatesTokenCount: z.number().nullish(),
      totalTokenCount: z.number().nullish()
    })
    .nullish()
});

const googleGenerativeAIProviderOptionsSchema = z.object({
  responseModalities: z.array(z.enum(['TEXT', 'IMAGE'])).nullish(),
  thinkingConfig: z
    .object({
      thinkingBudget: z.number().nullish(),
      includeThoughts: z.boolean().nullish()
    })
    .nullish()
});

export type GoogleGenerativeAICompatibleProviderOptions = z.infer<typeof googleGenerativeAIProviderOptionsSchema>;
