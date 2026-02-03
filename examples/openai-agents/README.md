# OpenAI Agents SDK Agents Example

A simple example demonstrating how to use the SAP AI Core Provider with OpenAI Agents SDK.

## Setup

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Fill in your SAP AI Core credentials in the `.env` file.

3. Install dependencies from the monorepo root:

   ```bash
   pnpm install
   ```

4. Build the provider package:

   ```bash
   pnpm run build
   ```

## Running

```bash
pnpm --filter openai-agents start
```

This will run the example which generates a text response using an AI model through SAP AI Core.
