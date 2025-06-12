# sap-ai-core-provider

SAP AI Core Foundation Models provider plugin for Vercel AI SDK

## Overview

This package enables seamless integration of SAP AI Core Foundation Models with the [Vercel AI SDK](https://sdk.vercel.ai/). Use it to access SAP-hosted foundation language models in your Node.js AI applications.

## Installation

```sh
npm install @ai-foundry/sap-ai-core-provider ai
```

## Usage

### Using sap-ai-core-provider

```ts
import { sapAiCore } from '@ai-foundry/sap-ai-core-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: sapAiCore('sap-ai-core/gpt-4o'),
  prompt: 'Hello, how are you?'
});
```

### Configuration

`createSapAiCore` accepts configuration options such as `baseURL`, `apiKey`, and custom headers:

```ts
createSapAiCore({
  baseURL: 'https://your-sap-ai-core-instance',
  apiKey: 'your-api-key',
  headers: {
    'Custom-Header': 'value'
  }
});
```

## License

MIT

## Contributing

Contributions are welcome! Please open issues or pull requests on [GitHub](https://github.com/adrianhdezm/sap-ai-core-provider).
