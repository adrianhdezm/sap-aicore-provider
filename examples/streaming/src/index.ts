import { streamText } from 'ai';
import { sapAiCore } from '@ai-foundry/sap-aicore-provider';

async function main() {
  // Make sure to set the following environment variables:
  // - AICORE_SERVICE_URL: SAP AI Core service URL
  // - AICORE_CLIENT_ID: OAuth client ID
  // - AICORE_CLIENT_SECRET: OAuth client secret
  // - AICORE_TOKEN_URL: OAuth token URL
  // - AICORE_RESOURCE_GROUP: Resource group (optional, defaults to 'default')

  console.log('Starting streaming response...\n');

  // Stream text using the Vercel AI SDK
  const result = streamText({
    model: sapAiCore('sap-aicore/gpt-4.1'),
    prompt: 'Explain how SAP AI Core helps enterprises adopt AI. List 3 key benefits.',
    onFinish: (event) => {
      console.log('\nonFinish', event.totalUsage);
    }
  });

  // Stream the response to the console as it arrives
  for await (const textPart of result.textStream) {
    process.stdout.write(textPart);
  }

  console.log('\n\n--- Stream completed ---');
}

main().catch(console.error);
