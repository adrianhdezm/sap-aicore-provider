# Mastra Agents Example

Mastra agents wired to SAP AI Core through the provider.

## Prerequisites

1. Node.js 24+ (see `.node-version`).
2. `pnpm` installed.

## Configure

Create a `.env` file in `examples/mastra-agents`:

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

Development mode:

```bash
pnpm --filter mastra-agents dev
```

Production mode:

```bash
pnpm --filter mastra-agents start
```

Mastra Studio is available at `http://localhost:4111`.

## Notes

The default agent uses `sap-aicore/gpt-4o` in `src/mastra/agents/weather-agent.ts`. Update the model id if your deployment name differs.
