# Lab Report Analyzer

## Overview

Full-stack TypeScript web application that processes PDF lab reports, extracts biomarkers using AI, standardizes names and units to English, and classifies each result as optimal, normal, or out of range based on patient age and sex.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + TanStack React Query
- **API framework**: Express 5
- **AI Provider**: OpenAI GPT-4o (swappable via Strategy Pattern)
- **PDF Parsing**: pdf-parse
- **Validation**: Zod (`zod/v4`)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/lab-report-analyzer run dev` — run frontend locally

## Architecture

### AI Provider Strategy Pattern
The AI provider layer uses a Strategy Pattern for easy swapping:
- `artifacts/api-server/src/lib/ai-providers/types.ts` — AIProvider interface
- `artifacts/api-server/src/lib/ai-providers/openai-provider.ts` — OpenAI implementation
- `artifacts/api-server/src/lib/ai-providers/prompt.ts` — Shared prompts
- `artifacts/api-server/src/lib/ai-providers/index.ts` — Provider factory/registry

### API Endpoints
- `POST /api/analyze-report` — Upload PDF, get biomarker analysis
- `GET /api/ai-providers` — List available AI providers
- `GET /api/healthz` — Health check

See `ARCHITECTURE.md` for full architecture documentation, scalability, security, and cloud deployment details.
