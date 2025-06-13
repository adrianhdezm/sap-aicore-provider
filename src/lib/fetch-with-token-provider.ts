import { loadSetting, type FetchFunction } from '@ai-sdk/provider-utils';

export interface TokenProviderConfig {
  accessTokenBaseUrl: string;
  clientId: string;
  clientSecret: string;
  headerName?: string;
  cacheMaxAgeMs?: number;
}

export function createFetchWithToken(config?: TokenProviderConfig, baseFetch: FetchFunction = globalThis.fetch): FetchFunction {
  let token: string | undefined;
  let expiresAt = 0;
  const ttl = config?.cacheMaxAgeMs ?? 60 * 60 * 1000;
  const headerName = config?.headerName ?? 'Authorization';

  return async (input, init = {}) => {
    const accessTokenBaseUrl = loadSetting({
      settingValue: config?.accessTokenBaseUrl,
      environmentVariableName: 'ACCESS_TOKEN_BASE_URL',
      settingName: 'accessTokenBaseUrl',
      description: 'SAP AI Core Access Token Base URL'
    });
    const clientId = loadSetting({
      settingValue: config?.clientId,
      environmentVariableName: 'CLIENT_ID',
      settingName: 'clientId',
      description: 'SAP AI Core Client ID'
    });

    const clientSecret = loadSetting({
      settingValue: config?.clientSecret,
      environmentVariableName: 'CLIENT_SECRET',
      settingName: 'clientSecret',
      description: 'SAP AI Core Client Secret'
    });

    const now = Date.now();
    if (!token || now > expiresAt) {
      const tokenRes = await baseFetch(accessTokenBaseUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId,
          clientSecret: clientSecret
        })
      });
      const tokenJson: any = await tokenRes.json();
      token = tokenJson.access_token ?? tokenJson.token;
      expiresAt = now + ttl;
    }

    const headers = new Headers(init.headers);
    if (token) {
      headers.set(headerName, `Bearer ${token}`);
    }
    return baseFetch(input, { ...init, headers });
  };
}
