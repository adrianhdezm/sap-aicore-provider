import type { LanguageModelV1Prompt } from '@ai-sdk/provider';
import { createTestServer } from '@ai-sdk/provider-utils/test';
import { createSapAiCore } from './sap-ai-core-provider';
import { createFetchWithToken } from './lib/fetch-with-token-provider';
import { describe, expect, it, beforeEach } from 'vitest';

const TEST_PROMPT: LanguageModelV1Prompt = [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }];
const BASE_URL = `https://test-resource.openai.azure.com/openai/deployments/test-deployment`;
const TOKEN_URL = 'https://auth.example.com/token';
const server = createTestServer({
  [`${BASE_URL}/chat/completions`]: {},
  [TOKEN_URL]: {}
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

function prepareTokenResponse(token: string) {
  server.urls[TOKEN_URL].response = {
    type: 'json-value',
    body: { access_token: token }
  };
}

describe('chat', () => {
  describe('doGenerate', () => {
    beforeEach(() => {
      prepareJsonResponse();
    });

    it('should set the correct default api version', async () => {
      const provider = createSapAiCore({
        baseURL: BASE_URL,
        apiKey: 'test-api-key'
      });

      await provider('test-deployment').doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      });

      expect(server.calls[0]!.requestUrlSearchParams.get('api-version')).toStrictEqual('2025-03-01-preview');
    });

    it('should pass headers', async () => {
      const provider = createSapAiCore({
        baseURL: BASE_URL,
        apiKey: 'test-api-key',
        headers: {
          'Custom-Provider-Header': 'provider-header-value'
        }
      });

      await provider('test-deployment').doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT,
        headers: {
          'Custom-Request-Header': 'request-header-value'
        }
      });

      expect(server.calls[0]!.requestHeaders).toStrictEqual({
        'api-key': 'test-api-key',
        'content-type': 'application/json',
        'custom-provider-header': 'provider-header-value',
        'custom-request-header': 'request-header-value'
      });
    });

    it('should use the baseURL correctly', async () => {
      const provider = createSapAiCore({
        baseURL: BASE_URL,
        apiKey: 'test-api-key'
      });

      await provider('test-deployment').doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      });

      expect(server.calls[0]!.requestUrl).toStrictEqual(`${BASE_URL}/chat/completions?api-version=2025-03-01-preview`);
    });

    it('should add token from service to Authorization header', async () => {
      prepareTokenResponse('token123');
      const provider = createSapAiCore({
        baseURL: BASE_URL,
        apiKey: 'test-api-key',
        tokenService: {
          tokenEndpoint: TOKEN_URL,
          clientId: 'id',
          clientSecret: 'secret'
        }
      });

      await provider('test-deployment').doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      });

      expect(server.calls[1]!.requestHeaders.authorization).toBe('Bearer token123');
    });

    it('should cache tokens to avoid repeated fetches', async () => {
      prepareTokenResponse('token123');
      const provider = createSapAiCore({
        baseURL: BASE_URL,
        apiKey: 'test-api-key',
        tokenService: {
          tokenEndpoint: TOKEN_URL,
          clientId: 'id',
          clientSecret: 'secret',
          cacheMaxAgeMs: 1000
        }
      });

      await provider('test-deployment').doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      });
      await provider('test-deployment').doGenerate({
        inputFormat: 'prompt',
        mode: { type: 'regular' },
        prompt: TEST_PROMPT
      });

      expect(server.calls.length).toBe(3);
    });
  });
});
