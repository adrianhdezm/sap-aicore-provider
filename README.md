# sap-ai-core-provider

SAP AI Core Foundation Models provider plugin for Vercel AI SDK

## How to use

```ts
import { sapAiCore } from '@ai-foundry/sap-ai-core-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: sapAiCore('sap-ai-core/gpt-4o'),
  prompt: 'Hello, how are you?'
});
```
