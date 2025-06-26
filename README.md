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

You can configure the SAP AI Core provider using the `createSapAiCore` function. Below are the most common options:

#### Basic Example

```ts
import { createSapAiCore } from '@ai-foundry/sap-aicore-provider';

const sapAiCore = createSapAiCore({
  deploymentUrl: 'https://your-sap-aicore-instance', // Required: Your SAP AI Core deployment URL
  headers: {
    'Custom-Header': 'value' // Optional: Add any custom headers
  }
});
```

#### Using a Token Provider

To automatically fetch an access token before each request, use the `tokenProvider` option:

```ts
const sapAiCore = createSapAiCore({
  deploymentUrl: 'https://your-sap-aicore-instance',
  tokenProvider: {
    accessTokenBaseUrl: 'https://auth.example.com/token', // Auth endpoint
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    cacheMaxAgeMs: 3600000 // Optional: Token cache duration (default 1h)
  }
});
```

#### Environment Variables

You can also provide configuration values using environment variables:

- `SAP_AICORE_DEPLOYMENT_URL`
- `AICORE_AUTH_URL`
- `AICORE_CLIENT_ID`
- `AICORE_CLIENT_SECRET`

Tokens are cached for one hour by default to reduce token provider requests.

## License

MIT

## Contributing

Contributions are welcome! Please open issues or pull requests on [GitHub](https://github.com/adrianhdezm/sap-aicore-provider).
