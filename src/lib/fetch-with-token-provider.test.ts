import { createTestServer } from '@ai-sdk/provider-utils/test';
import { createFetchWithToken } from './fetch-with-token-provider';
import { describe, it, expect, beforeEach } from 'vitest';

const TOKEN_URL = 'https://auth.example.com/token';
const API_URL = 'https://api.example.com/data';

const server = createTestServer({
  [TOKEN_URL]: {},
  [API_URL]: {}
});

beforeEach(() => {
  server.urls[TOKEN_URL].response = {
    type: 'json-value',
    body: { access_token: 'token123' }
  };
  server.urls[API_URL].response = {
    type: 'json-value',
    body: { ok: true }
  };
});

describe('createFetchWithToken', () => {
  it('requests token and attaches it to Authorization header', async () => {
    const fetch = createFetchWithToken({
      baseURL: TOKEN_URL,
      clientId: 'id',
      clientSecret: 'secret'
    });

    const res = await fetch(API_URL);
    expect(await res.json()).toStrictEqual({ ok: true });
    expect(server.calls[0]!.requestUrl).toBe(TOKEN_URL);
    expect(server.calls[1]!.requestHeaders.authorization).toBe('Bearer token123');
  });

  it('caches tokens between requests', async () => {
    const fetch = createFetchWithToken({
      baseURL: TOKEN_URL,
      clientId: 'id',
      clientSecret: 'secret',
      cacheMaxAgeMs: 1000
    });

    await fetch(API_URL);
    await fetch(API_URL);

    expect(server.calls.length).toBe(3);
  });

  it('uses a custom header name when provided', async () => {
    const fetch = createFetchWithToken({
      baseURL: TOKEN_URL,
      clientId: 'id',
      clientSecret: 'secret',
      headerName: 'X-Token'
    });

    await fetch(API_URL);

    expect(server.calls[1]!.requestHeaders['x-token']).toBe('Bearer token123');
  });
});
