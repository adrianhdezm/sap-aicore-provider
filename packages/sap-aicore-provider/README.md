# sap-aicore-provider

SAP AI Core Foundation Models provider plugin for Vercel AI SDK

## Overview

This package enables seamless integration of SAP AI Core Foundation Models with the [Vercel AI SDK](https://sdk.vercel.ai/). Use it to access SAP-hosted foundation language models in your Node.js AI applications.

## Installation

```sh
npm install @ai-foundry/sap-aicore-provider ai
```

## Usage

### Using sap-aicore-provider

```ts
import { sapAiCore } from '@ai-foundry/sap-aicore-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: sapAiCore('sap-aicore/gpt-4o'),
  prompt: 'Hello, how are you?'
});
```

### Configuration

You can configure the SAP AI Core provider using the `createSapAiCoreProvider` function. Below are the most common options:

#### Basic Example

```ts
import { createSapAiCoreProvider } from '@ai-foundry/sap-aicore-provider';

const sapAiCore = createSapAiCoreProvider({
  headers: {
    'Custom-Header': 'value' // Optional: Add any custom headers
  },
  baseUrl: 'https://my-sap-aicore-endpoint.com', // Optional: Custom base URL
  resourceGroup: 'my-resource-group', // Optional: Specify the resource group
  accessTokenUrl: 'https://my-auth-url.com/oauth2/token' // Optional: Custom token URL,
  clientId: 'my-client-id', // Optional: Client ID for authentication
  clientSecret: 'my-client-secret' // Optional: Client Secret for authentication
});
```

#### Environment Variables

You can also provide configuration values using environment variables:

- `AICORE_BASE_URL`
- `AICORE_AUTH_URL`
- `AICORE_CLIENT_ID`
- `AICORE_CLIENT_SECRET`

Tokens are cached for one hour by default to reduce token provider requests.

## License

MIT

## Contributing

Contributions are welcome! Please open issues or pull requests on [GitHub](https://github.com/adrianhdezm/sap-aicore-provider).
