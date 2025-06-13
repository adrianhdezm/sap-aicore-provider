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

`createSapAiCore` accepts configuration options such as `baseURL` and custom headers:

```ts
createSapAiCore({
  deploymentUrl: 'https://your-sap-aicore-instance',
  headers: {
    'Custom-Header': 'value'
  }
});
```

Use `tokenProvider` to automatically fetch an access token before each request:

```ts
createSapAiCore({
  deploymentUrl: 'https://your-sap-aicore-instance',
  tokenProvider: {
    baseURL: 'https://auth.example.com/token',
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    cacheMaxAgeMs: 3600000 // optional token cache duration (default 1h)
  }
});
```

Alternatively, provide these values using the `TOKEN_PROVIDER_BASE_URL`,
`TOKEN_PROVIDER_CLIENT_ID`, `TOKEN_PROVIDER_CLIENT_SECRET`,
`TOKEN_PROVIDER_HEADER_NAME`, and `TOKEN_PROVIDER_CACHE_MAX_AGE_MS`
environment variables.

Tokens are cached for one hour by default to reduce token provider requests.

## License

MIT

## Contributing

Contributions are welcome! Please open issues or pull requests on [GitHub](https://github.com/adrianhdezm/sap-aicore-provider).
