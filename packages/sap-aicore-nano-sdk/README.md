# sap-aicore-nano-sdk

Lightweight SDK for SAP AI Core API authentication and deployment management.

## Overview

This package provides a small client for:

- Fetching and caching OAuth access tokens
- Resolving model IDs to deployment URLs

It is intended for low-level integration or as a building block for higher-level SDKs.

## Installation

```sh
npm install @ai-foundry/sap-aicore-nano-sdk
```

## Usage

```ts
import { SapAiCoreApiClient } from '@ai-foundry/sap-aicore-nano-sdk';

const client = new SapAiCoreApiClient({
  clientId: process.env.AICORE_CLIENT_ID ?? '',
  clientSecret: process.env.AICORE_CLIENT_SECRET ?? '',
  accessTokenUrl: process.env.AICORE_AUTH_URL ?? '',
  baseUrl: process.env.AICORE_BASE_URL ?? '',
  resourceGroup: process.env.AICORE_RESOURCE_GROUP
});

const accessToken = await client.getAccessToken();
const deploymentUrl = await client.getDeploymentUrl('sap-aicore/gpt-4o');
```

## API

### `SapAiCoreApiClient`

Constructor parameters:

- `clientId` (string) OAuth client ID
- `clientSecret` (string) OAuth client secret
- `accessTokenUrl` (string) OAuth token endpoint base URL (SDK appends `/oauth/token?grant_type=client_credentials`)
- `baseUrl` (string) SAP AI Core base URL (SDK appends `/v2`)
- `resourceGroup` (string, optional) resource group header value (defaults to `default`)

Methods:

- `getAccessToken(): Promise<string>`
  - Fetches and caches a bearer token. Tokens are cached for ~55 minutes.
- `getDeploymentUrl(modelId: string): Promise<string>`
  - Resolves a model ID to a running deployment URL and caches the result.

## License

MIT

## Contributing

Contributions are welcome! Please open issues or pull requests on GitHub.
