import { loadSetting, type FetchFunction } from '@ai-sdk/provider-utils';

export interface TokenProviderConfig {
  accessTokenBaseUrl: string;
  clientId: string;
  clientSecret: string;
  headerName?: string;
  cacheMaxAgeMs?: number;
}

export function createFetchWithToken(config?: TokenProviderConfig, baseFetch: FetchFunction = globalThis.fetch): FetchFunction {
  let access_token: string | undefined;
  let expiresAt = 0;
  const ttl = config?.cacheMaxAgeMs ?? 60 * 60 * 1000;
  const headerName = config?.headerName ?? 'Authorization';

  return async (input, init = {}) => {
    const accessTokenBaseUrl = loadSetting({
      settingValue: config?.accessTokenBaseUrl,
      environmentVariableName: 'AICORE_AUTH_URL',
      settingName: 'accessTokenBaseUrl',
      description: 'SAP AI Core Access Token Base URL'
    });
    const clientId = loadSetting({
      settingValue: config?.clientId,
      environmentVariableName: 'AICORE_CLIENT_ID',
      settingName: 'clientId',
      description: 'SAP AI Core Client ID'
    });

    const clientSecret = loadSetting({
      settingValue: config?.clientSecret,
      environmentVariableName: 'AICORE_CLIENT_SECRET',
      settingName: 'clientSecret',
      description: 'SAP AI Core Client Secret'
    });

    const now = Date.now();
    if (!access_token || now > expiresAt) {
      const accessTokenUrl = `${accessTokenBaseUrl}/oauth/token?grant_type=client_credentials`;
      const tokenResponse = await baseFetch(accessTokenUrl, {
        method: 'GET',
        headers: { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}` }
      });
      if (!tokenResponse.ok) {
        throw new Error(`Token fetch failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
      }
      const response = (await tokenResponse.json()) as { access_token: string };
      access_token = response.access_token;
      expiresAt = now + ttl;
    }

    const headers = new Headers(init.headers);
    if (access_token) {
      headers.set(headerName, `Bearer ${access_token}`);
    }
    return baseFetch(input, { ...init, headers });
  };
}
