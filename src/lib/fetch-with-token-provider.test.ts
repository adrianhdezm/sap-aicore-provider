import { createTestServer } from '@ai-sdk/provider-utils/test';
import { createFetchWithToken } from './fetch-with-token-provider';
import { describe, it, expect, beforeEach } from 'vitest';

const ACCESS_TOKEN_BASE_URL = 'https://auth.example.com/token';
const ACCESS_TOKEN_URL = `${ACCESS_TOKEN_BASE_URL}/oauth/token`;
const API_URL = 'https://api.example.com/data';

const server = createTestServer({
  [ACCESS_TOKEN_URL]: {},
  [API_URL]: {}
});

beforeEach(() => {
  server.urls[ACCESS_TOKEN_URL].response = {
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
      accessTokenBaseUrl: ACCESS_TOKEN_BASE_URL,
      clientId: 'id',
      clientSecret: 'secret'
    });

    const res = await fetch(API_URL);
    expect(await res.json()).toStrictEqual({ ok: true });
    expect(server.calls[0]!.requestUrl).toBe(`${ACCESS_TOKEN_URL}?grant_type=client_credentials`);
    expect(server.calls[1]!.requestHeaders.authorization).toBe('Bearer token123');
  });

  it('caches tokens between requests', async () => {
    const fetch = createFetchWithToken({
      accessTokenBaseUrl: ACCESS_TOKEN_BASE_URL,
      clientId: 'id',
      clientSecret: 'secret',
      cacheMaxAgeMs: 1000
    });

    await fetch(API_URL);
    await fetch(API_URL);
    await fetch(API_URL);

    expect(server.calls.length).toBe(4);
  });

  it('uses a custom header name when provided', async () => {
    const fetch = createFetchWithToken({
      accessTokenBaseUrl: ACCESS_TOKEN_BASE_URL,
      clientId: 'id',
      clientSecret: 'secret',
      headerName: 'X-Token'
    });

    await fetch(API_URL);

    expect(server.calls[1]!.requestHeaders['x-token']).toBe('Bearer token123');
  });
});
