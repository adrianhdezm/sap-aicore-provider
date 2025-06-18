import type { LanguageModelV1Prompt } from '@ai-sdk/provider';
import { createTestServer } from '@ai-sdk/provider-utils/test';
import { AZURE_OPENAI_API_VERSION, createSapAiCore } from './sap-aicore-provider';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

const TEST_PROMPT: LanguageModelV1Prompt = [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }];
const BASE_URL = `https://test-resource.openai.azure.com/openai/deployments/test-deployment`;
const MODEL_ID = 'sap-aicore/gpt-4o';
const ACCESS_TOKEN_BASE_URL = 'https://auth.example.com';
const ACCESS_TOKEN_URL = `${ACCESS_TOKEN_BASE_URL}/oauth/token`;
const BEDROCK_BASE_URL = 'https://bedrock.example.com';
const BEDROCK_URL = `${BEDROCK_BASE_URL}/model/${encodeURIComponent('sap-aicore/o3')}/converse`;
const server = createTestServer({
  [`${BASE_URL}/chat/completions`]: {},
  [ACCESS_TOKEN_URL]: {},
  [BEDROCK_URL]: {}
});
function prepareJsonResponse({ content = '' }: { content?: string } = {}) {
  server.urls[`${BASE_URL}/chat/completions`].response = {
    type: 'json-value',
    body: {
      id: 'chatcmpl-95ZTZkhr0mHNKqerQfiwkuox3PHAd',
      object: 'chat.completion',
      created: 1711115037,
      model: 'gpt-3.5-turbo-0125',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 4,
        total_tokens: 34,
        completion_tokens: 30
      },
      system_fingerprint: 'fp_3bc1b5746c'
    }
  };
}

function prepareBedrockResponse() {
  (server.urls as any)[BEDROCK_URL].response = {
    type: 'json-value',
    body: {
      id: 'bedrock',
      object: 'chat.completion',
      created: 0,
      model: 'bedrock-model',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'hi' },
          finish_reason: 'stop'
        }
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
    }
  };
}

function prepareTokenResponse(token: string) {
  server.urls[ACCESS_TOKEN_URL].response = {
    type: 'json-value',
    body: { access_token: token }
  };
}

describe('chat', () => {
  describe('doGenerate', () => {
    beforeEach(() => {
      prepareTokenResponse('token123');
      prepareJsonResponse();
      prepareBedrockResponse();
      process.env.ACCESS_TOKEN_BASE_URL = ACCESS_TOKEN_BASE_URL;
      process.env.CLIENT_ID = 'id';
      process.env.CLIENT_SECRET = 'secret';
    });

    afterEach(() => {
      delete process.env.ACCESS_TOKEN_BASE_URL;
      delete process.env.CLIENT_ID;
      delete process.env.CLIENT_SECRET;
    });

    it('should set the correct default api version', async () => {
      const provider = createSapAiCore({
        deploymentUrl: BASE_URL
      });

      await provider(MODEL_ID).doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      });

      expect(server.calls[1]!.requestUrlSearchParams.get('api-version')).toStrictEqual(AZURE_OPENAI_API_VERSION);
    });

    it('should pass headers', async () => {
      const provider = createSapAiCore({
        deploymentUrl: BASE_URL,
        headers: {
          'Custom-Provider-Header': 'provider-header-value'
        }
      });

      await provider(MODEL_ID).doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT,
        headers: {
          'Custom-Request-Header': 'request-header-value'
        }
      });

      expect(server.calls[1]!.requestHeaders).toStrictEqual({
        authorization: 'Bearer token123',
        'ai-resource-group': 'default',
        'content-type': 'application/json',
        'custom-provider-header': 'provider-header-value',
        'custom-request-header': 'request-header-value'
      });
    });

    it('should use the deploymentUrl correctly', async () => {
      const provider = createSapAiCore({
        deploymentUrl: BASE_URL
      });

      await provider(MODEL_ID).doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      });

      expect(server.calls[1]!.requestUrl).toStrictEqual(`${BASE_URL}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`);
    });

    it('should add token from service to Authorization header', async () => {
      const provider = createSapAiCore({
        deploymentUrl: BASE_URL,
        tokenProvider: {
          accessTokenBaseUrl: ACCESS_TOKEN_BASE_URL,
          clientId: 'id',
          clientSecret: 'secret'
        }
      });

      await provider(MODEL_ID).doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      });

      expect(server.calls[1]!.requestHeaders.authorization).toBe('Bearer token123');
    });

    it('should cache tokens to avoid repeated fetches', async () => {
      const provider = createSapAiCore({
        deploymentUrl: BASE_URL,
        tokenProvider: {
          accessTokenBaseUrl: ACCESS_TOKEN_BASE_URL,
          clientId: 'id',
          clientSecret: 'secret',
          cacheMaxAgeMs: 1000
        }
      });

      await provider(MODEL_ID).doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      });
      await provider(MODEL_ID).doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      });

      expect(server.calls.length).toBe(3);
    });

    it('should load token provider config from environment variables', async () => {
      process.env.ACCESS_TOKEN_BASE_URL = ACCESS_TOKEN_BASE_URL;
      process.env.CLIENT_ID = 'id';
      process.env.CLIENT_SECRET = 'secret';

      const provider = createSapAiCore({
        deploymentUrl: BASE_URL
      });

      await provider(MODEL_ID).doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      });

      expect(server.calls[1]!.requestHeaders.authorization).toBe('Bearer token123');
    });

    it('should call bedrock endpoint for bedrock models', async () => {
      const provider = createSapAiCore({
        deploymentUrl: BEDROCK_BASE_URL
      });

      await provider('sap-aicore/o3').doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      });

      expect(server.calls[1]!.requestUrl).toBe(BEDROCK_URL);
    });
  });
});
