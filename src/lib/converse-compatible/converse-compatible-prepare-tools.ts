import { type JSONObject, type LanguageModelV1, type LanguageModelV1CallWarning, UnsupportedFunctionalityError } from '@ai-sdk/provider';
import { type ConverseTool, type ConverseToolConfiguration } from './converse-compatible-api-types.js';

export function prepareTools(
  mode: Parameters<LanguageModelV1['doGenerate']>[0]['mode'] & {
    type: 'regular';
  }
): {
  toolConfig: ConverseToolConfiguration; // note: do not rename, name required by Converse
  toolWarnings: LanguageModelV1CallWarning[];
} {
  // when the tools array is empty, change it to undefined to prevent errors:
  const tools = mode.tools?.length ? mode.tools : undefined;

  if (tools == null) {
    return {
      toolConfig: { tools: undefined, toolChoice: undefined },
      toolWarnings: []
    };
  }

  const toolWarnings: LanguageModelV1CallWarning[] = [];
  const bedrockTools: ConverseTool[] = [];

  for (const tool of tools) {
    if (tool.type === 'provider-defined') {
      toolWarnings.push({ type: 'unsupported-tool', tool });
    } else {
      bedrockTools.push({
        toolSpec: {
          name: tool.name,
          description: tool.description,
          inputSchema: {
            json: tool.parameters as JSONObject
          }
        }
      });
    }
  }

  const toolChoice = mode.toolChoice;

  if (toolChoice == null) {
    return {
      toolConfig: { tools: bedrockTools, toolChoice: undefined },
      toolWarnings
    };
  }

  const type = toolChoice.type;

  switch (type) {
    case 'auto':
      return {
        toolConfig: { tools: bedrockTools, toolChoice: { auto: {} } },
        toolWarnings
      };
    case 'required':
      return {
        toolConfig: { tools: bedrockTools, toolChoice: { any: {} } },
        toolWarnings
      };
    case 'none':
      // Converse does not support 'none' tool choice, so we remove the tools:
      return {
        toolConfig: { tools: undefined, toolChoice: undefined },
        toolWarnings
      };
    case 'tool':
      return {
        toolConfig: {
          tools: bedrockTools,
          toolChoice: { tool: { name: toolChoice.toolName } }
        },
        toolWarnings
      };
    default: {
      const _exhaustiveCheck: never = type;
      throw new UnsupportedFunctionalityError({
        functionality: `Unsupported tool choice type: ${_exhaustiveCheck}`
      });
    }
  }
}
