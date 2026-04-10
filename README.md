# Lab Report Analyzer

A full-stack TypeScript web application that processes PDF lab reports, extracts biomarkers using AI, standardizes names and units to English, and classifies each result as **optimal**, **normal**, or **out of range** based on the patient's age and sex.

## Features

- **PDF Upload**: Drag-and-drop or file picker for lab report PDFs
- **AI-Powered Extraction**: Uses AI to extract all biomarkers from the report
- **Standardization**: Translates biomarker names and units to English
- **Classification**: Classifies each result as optimal, normal, or out of range based on patient age and sex
- **Swappable AI Providers**: Strategy pattern allows easy switching between OpenAI, Claude, AWS Bedrock, Gemini, Mistral, and more

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + TanStack React Query
- **Backend**: Express 5 + TypeScript + esbuild
- **AI Provider**: OpenAI GPT-4o (default, easily swappable)
- **PDF Parsing**: pdf-parse
- **API Contract**: OpenAPI 3.1 + Orval codegen + Zod validation
- **Monorepo**: pnpm workspaces

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm

### Installation

```bash
pnpm install
```

### Environment Variables

```bash
# Required for OpenAI (default provider)
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1   # or custom endpoint

# Optional: Switch AI provider
AI_PROVIDER=openai  # openai | claude | aws-bedrock | gemini | mistral | azure-openai | together | groq
```

### Running Locally

```bash
# Start API server
pnpm --filter @workspace/api-server run dev

# Start frontend (in another terminal)
pnpm --filter @workspace/lab-report-analyzer run dev
```

## Architecture

### AI Provider Strategy Pattern

The application uses a **Strategy Pattern** for AI providers, making it trivial to swap between different AI services:

```typescript
interface AIProvider {
  readonly name: string;
  readonly id: string;
  readonly description: string;
  analyzeReport(pdfText: string): Promise<LabReportResult>;
}
```

### Supported AI Providers

| Provider | SDK | Model Examples | Status |
|----------|-----|----------------|--------|
| **OpenAI** | `openai` | GPT-4o, GPT-4-turbo | Implemented |
| **Anthropic Claude** | `@anthropic-ai/sdk` | Claude Sonnet 4, Claude 3 Opus | Template provided |
| **AWS Bedrock** | `@aws-sdk/client-bedrock-runtime` | Claude on Bedrock, Titan | Template provided |
| **Google Gemini** | `@google/generative-ai` | Gemini Pro, Gemini 1.5 | Template provided |
| **Mistral AI** | `@mistralai/mistralai` | Mistral Large, Medium | Template provided |
| **Azure OpenAI** | `openai` (Azure config) | Any deployed model | Template provided |
| **Together AI** | `openai` (compatible) | Llama 3 70B, Mixtral | Template provided |
| **Groq** | `openai` (compatible) | Llama 3, Mixtral (fast) | Template provided |
| **Cohere** | `cohere-ai` | Command R+ | Template provided |
| **Perplexity** | `openai` (compatible) | Sonar Large | Template provided |

### Adding a New Provider

1. Create a new file in `artifacts/api-server/src/lib/ai-providers/`
2. Implement the `AIProvider` interface
3. Register it in `ai-providers/index.ts`
4. Set `AI_PROVIDER=your-provider-id` environment variable

See `ARCHITECTURE.md` for complete implementation examples for each provider.

### OpenAI-Compatible Providers

Many providers (Together AI, Groq, Perplexity) offer OpenAI-compatible APIs. You can reuse the existing `OpenAIProvider` class with a different base URL:

```typescript
providers.set("groq", new OpenAIProvider({
  baseUrl: "https://api.groq.com/openai/v1",
  apiKey: process.env["GROQ_API_KEY"]!,
  model: "llama3-70b-8192",
}));
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/healthz` | Health check |
| `POST` | `/api/analyze-report` | Upload PDF and analyze biomarkers |
| `GET` | `/api/ai-providers` | List available AI providers |

## Project Structure

```
├── artifacts/
│   ├── api-server/                  # Express API server
│   │   └── src/lib/ai-providers/    # Strategy pattern AI abstraction
│   └── lab-report-analyzer/         # React frontend
├── lib/
│   ├── api-spec/                    # OpenAPI specification
│   ├── api-client-react/            # Generated React Query hooks
│   └── api-zod/                     # Generated Zod schemas
├── ARCHITECTURE.md                  # Full architecture documentation
└── README.md
```

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Detailed architecture, scalability strategies, security considerations, and AWS cloud deployment plan with cost estimates

## Key Commands

```bash
pnpm run typecheck                              # Full typecheck
pnpm run build                                  # Build all packages
pnpm --filter @workspace/api-spec run codegen   # Regenerate API hooks
pnpm --filter @workspace/api-server run dev     # Run API server
```

## License

MIT
