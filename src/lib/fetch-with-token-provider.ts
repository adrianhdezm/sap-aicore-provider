import type { FetchFunction } from '@ai-sdk/provider-utils';

export interface TokenServiceConfig {
  tokenEndpoint: string;
  clientId?: string;
  clientSecret?: string;
  headerName?: string;
  cacheMaxAgeMs?: number;
}

export function createFetchWithToken(config: TokenServiceConfig, baseFetch: FetchFunction = globalThis.fetch): FetchFunction {
  let token: string | undefined;
  let expiresAt = 0;
  const ttl = config.cacheMaxAgeMs ?? 60 * 60 * 1000;

  return async (input, init = {}) => {
    const now = Date.now();
    if (!token || now > expiresAt) {
      const tokenRes = await baseFetch(config.tokenEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: config.clientId,
          clientSecret: config.clientSecret
        })
      });
      const tokenJson: any = await tokenRes.json();
      token = tokenJson.access_token ?? tokenJson.token;
      expiresAt = now + ttl;
    }

    const headers = new Headers(init.headers);
    if (token) {
      headers.set(config.headerName ?? 'Authorization', `Bearer ${token}`);
    }
    return baseFetch(input, { ...init, headers });
  };
}
