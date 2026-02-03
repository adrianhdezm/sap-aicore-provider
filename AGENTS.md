# AGENTS.md - Project Contributor Guide

This file provides guidance to Code Agents such Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SAP AI Core Foundation Models provider plugin for Vercel AI SDK. Enables integration of SAP-hosted foundation language models with the Vercel AI SDK in Node.js applications.

## Commands

```bash
# Full CI validation (run before committing)
pnpm run ci:check

# Individual commands
pnpm run build        # Build all packages with tsup
pnpm run test         # Run vitest tests
pnpm run lint         # TypeScript type checking
pnpm run format       # Format with Prettier
pnpm run format:check # Check formatting

# Run the basic example
pnpm --filter basic-example start

# Run the streaming example
pnpm --filter streaming-example start

# Validate package exports
pnpm --filter @ai-foundry/sap-aicore-provider exports:check
```

## Architecture

### Monorepo Structure

- `packages/sap-aicore-provider/` - Main provider package (`@ai-foundry/sap-aicore-provider`)
- `packages/sap-aicore-nano-sdk/` - Nano SDK package (`@ai-foundry/sap-aicore-nano-sdk`)
- `examples/basic/` - Basic usage example with `generateText`
- `examples/streaming/` - Streaming example with `streamText`
- `examples/mastra-agents/` - Example using Mastra Agents with SAP AI Core
- `examples/openai-agents/` - Example using OpenAI Agents SDK with SAP AI Core

### Core Components

**Provider Factory** ([sap-aicore-provider.ts](packages/sap-aicore-provider/src/sap-aicore-provider.ts))

- `createSapAiCore()` - Factory function that configures and returns a Vercel AI SDK v3-compatible provider
- `sapAiCore` - Default instance export for simple usage
- Only chat models are supported; other model types throw `NoSuchModelError`

**API Client** ([sap-aicore-nano-sdk.ts](packages/sap-aicore-nano-sdk/src/sap-aicore-nano-sdk.ts))

- Handles OAuth 2.0 client credentials authentication with token caching
- Resolves model IDs to deployment URLs via SAP AI Core API
- Caches deployment URLs to minimize API calls

**Request Interceptors** ([fetch-with-interceptors.ts](packages/sap-aicore-provider/src/lib/fetch-with-interceptors.ts))

- Custom fetch wrapper that chains request interceptors
- Injects Authorization headers with Bearer tokens
- Resolves `<deployment:modelId>` URL placeholders to actual deployment URLs

### Request Flow

1. User calls `sapAiCore('sap-aicore/gpt-4o')` to get a model instance
2. Model requests go through `fetchWithInterceptors`
3. First interceptor adds OAuth Bearer token (fetched/cached by API client)
4. Second interceptor resolves `<deployment:modelId>` placeholder to actual deployment URL
5. Request is sent to SAP AI Core with proper authentication

### Environment Variables

- `AICORE_BASE_URL` - SAP AI Core base URL
- `AICORE_AUTH_URL` - OAuth token endpoint
- `AICORE_CLIENT_ID` - OAuth client ID
- `AICORE_CLIENT_SECRET` - OAuth client secret
- `AICORE_RESOURCE_GROUP` - Optional resource group (defaults to "default")

## Commit Guidelines

Use Conventional Commits with Gitmoji:

```
<type>(<scope?>): <gitmoji> <summary>
```

Types and their gitmoji:

- `feat`: ✨ (new feature)
- `refactor`: ♻️ (code restructuring)
- `fix`: 🐛 (bug fix)
- `docs`: 📝 (documentation)
- `test`: ✅ (tests)
- `chore`: 🔧 (maintenance/tooling)

Always run `pnpm run ci:check` before committing.

## Technical Notes

- Node.js >=24 required (see `.node-version`)
- Uses pnpm workspaces for monorepo management
- Dual CJS/ESM output via tsup
- Uses `@ai-sdk/openai-compatible` for OpenAI protocol compatibility
- Azure OpenAI API version: `2025-04-01-preview`
