import type { FetchFunction } from '@ai-sdk/provider-utils';

export interface TokenServiceConfig {
  tokenEndpoint: string;
  clientId?: string;
  clientSecret?: string;
  headerName?: string;
}

export function createFetchWithToken(config: TokenServiceConfig, baseFetch: FetchFunction = globalThis.fetch): FetchFunction {
  return async (input, init = {}) => {
    const tokenRes = await baseFetch(config.tokenEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clientId: config.clientId,
        clientSecret: config.clientSecret
      })
    });
    const tokenJson: any = await tokenRes.json();
    const token = tokenJson.access_token ?? tokenJson.token;
    const headers = new Headers(init.headers);
    if (token) {
      headers.set(config.headerName ?? 'Authorization', `Bearer ${token}`);
    }
    return baseFetch(input, { ...init, headers });
  };
}
