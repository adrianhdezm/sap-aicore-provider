import { generateText } from 'ai';
import { sapAiCore } from '@ai-foundry/sap-aicore-provider';

async function main() {
  // Make sure to set the following environment variables:
  // - AICORE_SERVICE_URL: SAP AI Core service URL
  // - AICORE_CLIENT_ID: OAuth client ID
  // - AICORE_CLIENT_SECRET: OAuth client secret
  // - AICORE_TOKEN_URL: OAuth token URL
  // - AICORE_RESOURCE_GROUP: Resource group (optional, defaults to 'default')

  // Generate text using the Vercel AI SDK
  const { text } = await generateText({
    model: sapAiCore('sap-aicore/gpt-5'),
    prompt: 'Define in one sentence what is SAP AI Core and how does it help enterprises?'
  });

  console.log('Response:', text);
}

main().catch(console.error);
