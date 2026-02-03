# Basic Example

Minimal `generateText` usage with the SAP AI Core Provider and the Vercel AI SDK.

## Prerequisites

1. Node.js 24+ (see `.node-version`).
2. `pnpm` installed.

## Configure

Create a `.env` file in `examples/basic` with your SAP AI Core credentials:

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
pnpm --filter basic-example start
```

Expected output includes a `Response:` line and token `Usage` for the prompt sent in `src/index.ts`.

## Notes

If you see authentication errors, confirm `AICORE_BASE_URL` and `AICORE_AUTH_URL` match your SAP AI Core tenant endpoints.
