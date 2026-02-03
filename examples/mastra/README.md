# Mastra Example

A simple example demonstrating how to use the SAP AI Core Provider with Mastra Agents.

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
pnpm --filter mastra-example start
```

This will run the example which generates a text response using an AI model through SAP AI Core.

Open [http://localhost:4111](http://localhost:4111) in your browser to access [Mastra Studio](https://mastra.ai/docs/getting-started/studio). It provides an interactive UI for building and testing your agents, along with a REST API that exposes your Mastra application as a local service. This lets you start building without worrying about integration right away.

You can start editing files inside the `src/mastra` directory. The development server will automatically reload whenever you make changes.
