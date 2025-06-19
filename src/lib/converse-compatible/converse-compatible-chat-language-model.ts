import {
  InvalidArgumentError,
  type JSONObject,
  type LanguageModelV1,
  type LanguageModelV1CallWarning,
  type LanguageModelV1FinishReason,
  type LanguageModelV1FunctionToolCall,
  type LanguageModelV1ProviderMetadata,
  type LanguageModelV1StreamPart,
  UnsupportedFunctionalityError
} from '@ai-sdk/provider';
import {
  type FetchFunction,
  type ParseResult,
  combineHeaders,
  createJsonErrorResponseHandler,
  createJsonResponseHandler,
  postJsonToApi
} from '@ai-sdk/provider-utils';
import { z } from 'zod';
import { BEDROCK_STOP_REASONS, type ConverseCompatibleInput, type ConverseStopReason } from './converse-compatible-api-types.js';
import { type ConverseCompatibleChatModelId, type ConverseCompatibleChatSettings } from './converse-compatible-chat-settings.js';
import { ConverseCompatibleErrorSchema } from './converse-compatible-error.js';
import { createConverseCompatibleEventStreamResponseHandler } from './converse-compatible-event-stream-response-handler.js';
import { prepareTools } from './converse-compatible-prepare-tools.js';
import { convertToConverseCompatibleChatMessages } from './convert-to-converse-compatible-chat-messages.js';
import { mapConverseCompatibleFinishReason } from './map-converse-compatible-finish-reason.js';

type ConverseCompatibleChatConfig = {
  provider: string;
  url: (options: { modelId: string; path: string }) => string;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
  generateId: () => string;
};

export class ConverseCompatibleChatLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = 'v1';
  readonly defaultObjectGenerationMode = 'tool';
  readonly supportsImageUrls = false;

  constructor(
    readonly modelId: ConverseCompatibleChatModelId,
    private readonly settings: ConverseCompatibleChatSettings,
    private readonly config: ConverseCompatibleChatConfig
  ) {}

  get provider(): string {
    return this.config.provider;
  }

  private get providerOptionsName(): string {
    return this.config.provider.split('.')[0]!.trim();
  }

  private getArgs({
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
  }: Parameters<LanguageModelV1['doGenerate']>[0]): {
    command: ConverseCompatibleInput;
    warnings: LanguageModelV1CallWarning[];
  } {
    const type = mode.type;

    const warnings: LanguageModelV1CallWarning[] = [];

    if (frequencyPenalty != null) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'frequencyPenalty'
      });
    }

    if (presencePenalty != null) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'presencePenalty'
      });
    }

    if (seed != null) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'seed'
      });
    }

    if (topK != null) {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'topK'
      });
    }

    if (responseFormat != null && responseFormat.type !== 'text') {
      warnings.push({
        type: 'unsupported-setting',
        setting: 'responseFormat',
        details: 'JSON response format is not supported.'
      });
    }

    const { system, messages } = convertToConverseCompatibleChatMessages(prompt);

    // Parse thinking options from provider metadata
    const reasoningConfigOptions = ConverseReasoningConfigOptionsSchema.safeParse(
      providerMetadata?.[this.providerOptionsName]?.reasoning_config
    );

    if (!reasoningConfigOptions.success) {
      throw new InvalidArgumentError({
        argument: `providerOptions.${this.providerOptionsName}.reasoning_config`,
        message: 'invalid reasoning configuration options',
        cause: reasoningConfigOptions.error
      });
    }

    const isThinking = reasoningConfigOptions.data?.type === 'enabled';
    const thinkingBudget = reasoningConfigOptions.data?.budgetTokens ?? reasoningConfigOptions.data?.budget_tokens;

    const inferenceConfig = {
      ...(maxTokens != null && { maxTokens }),
      ...(temperature != null && { temperature }),
      ...(topP != null && { topP }),
      ...(stopSequences != null && { stopSequences })
    };

    // Adjust maxTokens if thinking is enabled
    if (isThinking && thinkingBudget != null) {
      if (inferenceConfig.maxTokens != null) {
        inferenceConfig.maxTokens += thinkingBudget;
      } else {
        inferenceConfig.maxTokens = thinkingBudget + 4096; // Default + thinking budget maxTokens = 4096, TODO update default in v5
      }
      // Add them to additional model request fields
      // Add reasoning config to additionalModelRequestFields
      this.settings.additionalModelRequestFields = {
        ...this.settings.additionalModelRequestFields,
        reasoning_config: {
          type: reasoningConfigOptions.data?.type,
          budget_tokens: thinkingBudget
        }
      };
    }

    // Remove temperature if thinking is enabled
    if (isThinking && inferenceConfig.temperature != null) {
      delete inferenceConfig.temperature;
      warnings.push({
        type: 'unsupported-setting',
        setting: 'temperature',
        details: 'temperature is not supported when thinking is enabled'
      });
    }

    // Remove topP if thinking is enabled
    if (isThinking && inferenceConfig.topP != null) {
      delete inferenceConfig.topP;
      warnings.push({
        type: 'unsupported-setting',
        setting: 'topP',
        details: 'topP is not supported when thinking is enabled'
      });
    }

    const baseArgs: ConverseCompatibleInput = {
      system,
      additionalModelRequestFields: this.settings.additionalModelRequestFields,
      ...(Object.keys(inferenceConfig).length > 0 && {
        inferenceConfig
      }),
      messages,
      ...providerMetadata?.[this.providerOptionsName]
    };

    switch (type) {
      case 'regular': {
        const { toolConfig, toolWarnings } = prepareTools(mode);
        return {
          command: {
            ...baseArgs,
            ...(toolConfig.tools?.length ? { toolConfig } : {})
          },
          warnings: [...warnings, ...toolWarnings]
        };
      }

      case 'object-json': {
        throw new UnsupportedFunctionalityError({
          functionality: 'json-mode object generation'
        });
      }

      case 'object-tool': {
        return {
          command: {
            ...baseArgs,
            toolConfig: {
              tools: [
                {
                  toolSpec: {
                    name: mode.tool.name,
                    description: mode.tool.description,
                    inputSchema: {
                      json: mode.tool.parameters as JSONObject
                    }
                  }
                }
              ],
              toolChoice: { tool: { name: mode.tool.name } }
            }
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
    const { command: args, warnings } = this.getArgs(options);

    const url = `${this.config.url({ modelId: this.modelId, path: '/converse' })}`;
    const { value: response, responseHeaders } = await postJsonToApi({
      url,
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: createJsonErrorResponseHandler({
        errorSchema: ConverseCompatibleErrorSchema,
        errorToMessage: (error) => `${error.message ?? 'Unknown error'}`
      }),
      successfulResponseHandler: createJsonResponseHandler(ConverseResponseSchema),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });

    const { messages: rawPrompt, ...rawSettings } = args;

    const providerMetadata =
      response.trace || response.usage
        ? {
            [this.providerOptionsName]: {
              ...(response.trace && typeof response.trace === 'object' ? { trace: response.trace as JSONObject } : {}),
              ...(response.usage && {
                usage: {
                  cacheReadInputTokens: response.usage?.cacheReadInputTokens ?? Number.NaN,
                  cacheWriteInputTokens: response.usage?.cacheWriteInputTokens ?? Number.NaN
                }
              })
            }
          }
        : undefined;

    const reasoning = response.output.message.content
      .filter((content) => content.reasoningContent)
      .map((content) => {
        if (content.reasoningContent && 'reasoningText' in content.reasoningContent) {
          return {
            type: 'text' as const,
            text: content.reasoningContent.reasoningText.text,
            ...(content.reasoningContent.reasoningText.signature && {
              signature: content.reasoningContent.reasoningText.signature
            })
          };
        } else if (content.reasoningContent && 'redactedReasoning' in content.reasoningContent) {
          return {
            type: 'redacted' as const,
            data: content.reasoningContent.redactedReasoning.data ?? ''
          };
        } else {
          // Return undefined for unexpected structures
          return undefined;
        }
      })
      // Filter out any undefined values
      .filter((item): item is NonNullable<typeof item> => item !== undefined);

    const toolCalls: LanguageModelV1FunctionToolCall[] = response.output?.message?.content
      ?.filter((part) => !!part.toolUse)
      ?.map((part) => ({
        toolCallType: 'function',
        toolCallId: part.toolUse?.toolUseId ?? this.config.generateId(),
        toolName: part.toolUse?.name ?? `tool-${this.config.generateId()}`,
        args: JSON.stringify(part.toolUse?.input ?? '')
      }));

    return {
      text: response.output?.message?.content?.map((part) => part.text ?? '').join('') ?? undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined, // Tool calls should be undefined if the model did not generate any tool calls.
      finishReason: mapConverseCompatibleFinishReason(response.stopReason as ConverseStopReason),
      usage: {
        promptTokens: response.usage?.inputTokens ?? Number.NaN,
        completionTokens: response.usage?.outputTokens ?? Number.NaN
      },
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      warnings,
      reasoning: reasoning.length > 0 ? reasoning : undefined,
      ...(providerMetadata && { providerMetadata })
    };
  }

  async doStream(options: Parameters<LanguageModelV1['doStream']>[0]): Promise<Awaited<ReturnType<LanguageModelV1['doStream']>>> {
    const { command: args, warnings } = this.getArgs(options);
    const url = `${this.config.url({ modelId: this.modelId, path: '/converse-stream' })}`;

    const { value: response, responseHeaders } = await postJsonToApi({
      url,
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: createJsonErrorResponseHandler({
        errorSchema: ConverseCompatibleErrorSchema,
        errorToMessage: (error) => `${error.type}: ${error.message}`
      }),
      successfulResponseHandler: createConverseCompatibleEventStreamResponseHandler(ConverseStreamSchema),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });

    const { messages: rawPrompt, ...rawSettings } = args;

    let finishReason: LanguageModelV1FinishReason = 'unknown';
    let usage = {
      promptTokens: Number.NaN,
      completionTokens: Number.NaN
    };
    let providerMetadata: LanguageModelV1ProviderMetadata | undefined = undefined;

    const toolCallContentBlocks: Record<
      number,
      {
        toolCallId: string;
        toolName: string;
        jsonText: string;
      }
    > = {};

    const providerOptionsName = this.providerOptionsName;

    return {
      stream: response.pipeThrough(
        new TransformStream<ParseResult<z.infer<typeof ConverseStreamSchema>>, LanguageModelV1StreamPart>({
          transform(chunk, controller) {
            function enqueueError(bedrockError: Record<string, any>) {
              finishReason = 'error';
              controller.enqueue({ type: 'error', error: bedrockError });
            }

            // handle failed chunk parsing / validation:
            if (!chunk.success) {
              enqueueError(chunk.error);
              return;
            }

            const value = chunk.value;

            // handle errors:
            if (value.internalServerException) {
              enqueueError(value.internalServerException);
              return;
            }
            if (value.modelStreamErrorException) {
              enqueueError(value.modelStreamErrorException);
              return;
            }
            if (value.throttlingException) {
              enqueueError(value.throttlingException);
              return;
            }
            if (value.validationException) {
              enqueueError(value.validationException);
              return;
            }

            if (value.messageStop) {
              finishReason = mapConverseCompatibleFinishReason(value.messageStop.stopReason as ConverseStopReason);
            }

            if (value.metadata) {
              usage = {
                promptTokens: value.metadata.usage?.inputTokens ?? Number.NaN,
                completionTokens: value.metadata.usage?.outputTokens ?? Number.NaN
              };

              const cacheUsage =
                value.metadata.usage?.cacheReadInputTokens != null || value.metadata.usage?.cacheWriteInputTokens != null
                  ? {
                      usage: {
                        cacheReadInputTokens: value.metadata.usage?.cacheReadInputTokens ?? Number.NaN,
                        cacheWriteInputTokens: value.metadata.usage?.cacheWriteInputTokens ?? Number.NaN
                      }
                    }
                  : undefined;

              const trace = value.metadata.trace
                ? {
                    trace: value.metadata.trace as JSONObject
                  }
                : undefined;

              if (cacheUsage || trace) {
                providerMetadata = {
                  [providerOptionsName]: {
                    ...cacheUsage,
                    ...trace
                  }
                };
              }
            }

            if (value.contentBlockDelta?.delta && 'text' in value.contentBlockDelta.delta && value.contentBlockDelta.delta.text) {
              controller.enqueue({
                type: 'text-delta',
                textDelta: value.contentBlockDelta.delta.text
              });
            }

            if (
              value.contentBlockDelta?.delta &&
              'reasoningContent' in value.contentBlockDelta.delta &&
              value.contentBlockDelta.delta.reasoningContent
            ) {
              const reasoningContent = value.contentBlockDelta.delta.reasoningContent;
              if ('text' in reasoningContent && reasoningContent.text) {
                controller.enqueue({
                  type: 'reasoning',
                  textDelta: reasoningContent.text
                });
              } else if ('signature' in reasoningContent && reasoningContent.signature) {
                controller.enqueue({
                  type: 'reasoning-signature',
                  signature: reasoningContent.signature
                });
              } else if ('data' in reasoningContent && reasoningContent.data) {
                controller.enqueue({
                  type: 'redacted-reasoning',
                  data: reasoningContent.data
                });
              }
            }

            const contentBlockStart = value.contentBlockStart;
            if (contentBlockStart?.start?.toolUse != null) {
              const toolUse = contentBlockStart.start.toolUse;
              toolCallContentBlocks[contentBlockStart.contentBlockIndex!] = {
                toolCallId: toolUse.toolUseId!,
                toolName: toolUse.name!,
                jsonText: ''
              };
            }

            const contentBlockDelta = value.contentBlockDelta;
            if (contentBlockDelta?.delta && 'toolUse' in contentBlockDelta.delta && contentBlockDelta.delta.toolUse) {
              const contentBlock = toolCallContentBlocks[contentBlockDelta.contentBlockIndex!];
              const delta = contentBlockDelta.delta.toolUse.input ?? '';

              controller.enqueue({
                type: 'tool-call-delta',
                toolCallType: 'function',
                toolCallId: contentBlock!.toolCallId,
                toolName: contentBlock!.toolName,
                argsTextDelta: delta
              });

              contentBlock!.jsonText += delta;
            }

            const contentBlockStop = value.contentBlockStop;
            if (contentBlockStop != null) {
              const index = contentBlockStop.contentBlockIndex!;
              const contentBlock = toolCallContentBlocks[index];

              // when finishing a tool call block, send the full tool call:
              if (contentBlock != null) {
                controller.enqueue({
                  type: 'tool-call',
                  toolCallType: 'function',
                  toolCallId: contentBlock.toolCallId,
                  toolName: contentBlock.toolName,
                  args: contentBlock.jsonText
                });

                delete toolCallContentBlocks[index];
              }
            }
          },
          flush(controller) {
            controller.enqueue({
              type: 'finish',
              finishReason,
              usage,
              ...(providerMetadata && { providerMetadata })
            });
          }
        })
      ),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      warnings
    };
  }
}

const ConverseReasoningConfigOptionsSchema = z
  .object({
    type: z.union([z.literal('enabled'), z.literal('disabled')]).nullish(),
    budget_tokens: z.number().nullish(),
    budgetTokens: z.number().nullish()
  })
  .nullish();

const ConverseStopReasonSchema = z.union([z.enum(BEDROCK_STOP_REASONS), z.string()]);

const ConverseToolUseSchema = z.object({
  toolUseId: z.string(),
  name: z.string(),
  input: z.unknown()
});

const ConverseReasoningTextSchema = z.object({
  signature: z.string().nullish(),
  text: z.string()
});

const ConverseRedactedReasoningSchema = z.object({
  data: z.string()
});

// limited version of the schema, focused on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const ConverseResponseSchema = z.object({
  metrics: z
    .object({
      latencyMs: z.number()
    })
    .nullish(),
  output: z.object({
    message: z.object({
      content: z.array(
        z.object({
          text: z.string().nullish(),
          toolUse: ConverseToolUseSchema.nullish(),
          reasoningContent: z
            .union([
              z.object({
                reasoningText: ConverseReasoningTextSchema
              }),
              z.object({
                redactedReasoning: ConverseRedactedReasoningSchema
              })
            ])
            .nullish()
        })
      ),
      role: z.string()
    })
  }),
  stopReason: ConverseStopReasonSchema,
  trace: z.unknown().nullish(),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    totalTokens: z.number(),
    cacheReadInputTokens: z.number().nullish(),
    cacheWriteInputTokens: z.number().nullish()
  })
});

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const ConverseStreamSchema = z.object({
  contentBlockDelta: z
    .object({
      contentBlockIndex: z.number(),
      delta: z
        .union([
          z.object({ text: z.string() }),
          z.object({ toolUse: z.object({ input: z.string() }) }),
          z.object({
            reasoningContent: z.object({ text: z.string() })
          }),
          z.object({
            reasoningContent: z.object({
              signature: z.string()
            })
          }),
          z.object({
            reasoningContent: z.object({ data: z.string() })
          })
        ])
        .nullish()
    })
    .nullish(),
  contentBlockStart: z
    .object({
      contentBlockIndex: z.number(),
      start: z
        .object({
          toolUse: ConverseToolUseSchema.nullish()
        })
        .nullish()
    })
    .nullish(),
  contentBlockStop: z
    .object({
      contentBlockIndex: z.number()
    })
    .nullish(),
  internalServerException: z.record(z.unknown()).nullish(),
  messageStop: z
    .object({
      additionalModelResponseFields: z.record(z.unknown()).nullish(),
      stopReason: ConverseStopReasonSchema
    })
    .nullish(),
  metadata: z
    .object({
      trace: z.unknown().nullish(),
      usage: z
        .object({
          cacheReadInputTokens: z.number().nullish(),
          cacheWriteInputTokens: z.number().nullish(),
          inputTokens: z.number(),
          outputTokens: z.number()
        })
        .nullish()
    })
    .nullish(),
  modelStreamErrorException: z.record(z.unknown()).nullish(),
  throttlingException: z.record(z.unknown()).nullish(),
  validationException: z.record(z.unknown()).nullish()
});
