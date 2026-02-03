# OpenAI Agents SDK Example

Shows how to run an `@openai/agents` agent backed by the SAP AI Core Provider.

## Prerequisites

1. Node.js 24+ (see `.node-version`).
2. `pnpm` installed.

## Configure

Create a `.env` file in `examples/openai-agents`:

```bash
AICORE_BASE_URL=...
AICORE_AUTH_URL=...
AICORE_CLIENT_ID=...
AICORE_CLIENT_SECRET=...
AICORE_RESOURCE_GROUP=default
```

## Install and build

From the repo root:

```bash
pnpm install
pnpm run build
```

## Run

```bash
pnpm --filter openai-agents start
```

You should see `Output:` followed by a short response from the agent in `src/index.ts`.

## Notes

The example uses `sap-aicore/gpt-4.1`. Ensure this deployment exists in your SAP AI Core account or update the model id.
