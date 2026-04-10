# Lab Report Analyzer — Architecture Document

## Overview

A full-stack TypeScript web application that processes PDF lab reports, extracts biomarkers using AI, standardizes names and units to English, and classifies each result as **optimal**, **normal**, or **out of range** based on the patient's age and sex.

---

## Architecture

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                     │
│  React + TypeScript + Vite + TanStack Query                │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ PDF Drop │  │ Results View │  │ Provider Status    │    │
│  │   Zone   │  │  (Table +    │  │                    │    │
│  │          │  │   Summary)   │  │                    │    │
│  └────┬─────┘  └──────▲───────┘  └────────────────────┘    │
│       │               │                                     │
└───────┼───────────────┼─────────────────────────────────────┘
        │ multipart/    │ JSON
        │ form-data     │ response
        ▼               │
┌─────────────────────────────────────────────────────────────┐
│                     API Server (Express 5)                  │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │ Multer       │──▶│ PDF Parser   │──▶│ AI Provider    │  │
│  │ (File Upload)│   │ (pdf-parse)  │   │ (Strategy      │  │
│  │              │   │              │   │  Pattern)      │  │
│  └──────────────┘   └──────────────┘   └───────┬────────┘  │
│                                                 │           │
│                                    ┌────────────┼────────┐  │
│                                    │            │        │  │
│                                    ▼            ▼        ▼  │
│                              ┌──────────┐ ┌────────┐ ┌────┐│
│                              │  OpenAI  │ │ Claude │ │AWS ││
│                              │ Provider │ │Provider│ │ .. ││
│                              └──────────┘ └────────┘ └────┘│
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### Frontend (React + Vite + TypeScript)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: TanStack React Query for server state
- **API Client**: Auto-generated hooks from OpenAPI spec via Orval
- **UI Components**: Radix UI primitives + Tailwind CSS
- **Key Features**:
  - Drag-and-drop PDF upload
  - Real-time analysis status
  - Color-coded biomarker classification (green/amber/red)
  - Sortable results table
  - Patient information display
  - AI provider status indicator

#### Backend (Express 5 + TypeScript)
- **Framework**: Express 5 with TypeScript
- **PDF Parsing**: pdf-parse (pdfjs-dist based)
- **File Upload**: Multer (memory storage, 20MB limit)
- **Logging**: Pino (structured JSON logging)
- **Build**: esbuild (ESM output)
- **API Contract**: OpenAPI 3.1 spec with Zod validation

#### AI Provider Layer (Strategy Pattern)
- **Interface**: `AIProvider` with `analyzeReport(pdfText: string)` method
- **Factory**: Provider registry with `getProvider(id)` and `getAllProviders()`
- **Default**: OpenAI GPT-4o
- **Swappable**: Add new providers by implementing the `AIProvider` interface

---

## AI Provider Swapping Strategy

### Current Implementation: OpenAI

The application uses a **Strategy Pattern** for AI providers. The current implementation uses OpenAI's GPT-4o model.

### Interface Definition

```typescript
interface AIProvider {
  readonly name: string;
  readonly id: string;
  readonly description: string;
  analyzeReport(pdfText: string): Promise<LabReportResult>;
}
```

### How to Add a New Provider

#### 1. Claude (Anthropic)

Create `artifacts/api-server/src/lib/ai-providers/claude-provider.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIProviderConfig, LabReportResult } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

export class ClaudeProvider implements AIProvider {
  readonly name = "Claude (Anthropic)";
  readonly id = "claude";
  readonly description = "Anthropic Claude for biomarker analysis";
  private client: Anthropic;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model; // e.g., "claude-sonnet-4-20250514"
  }

  async analyzeReport(pdfText: string): Promise<LabReportResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(pdfText) }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    const parsed = JSON.parse(content.text);
    const biomarkers = parsed.biomarkers || [];

    return {
      patient: parsed.patient || {},
      biomarkers,
      summary: {
        total: biomarkers.length,
        optimal: biomarkers.filter((b: any) => b.classification === "optimal").length,
        normal: biomarkers.filter((b: any) => b.classification === "normal").length,
        outOfRange: biomarkers.filter((b: any) => b.classification === "out_of_range").length,
      },
      aiProvider: this.id,
    };
  }
}
```

Then register in `ai-providers/index.ts`:

```typescript
import { ClaudeProvider } from "./claude-provider";

// In initProviders():
const claudeApiKey = process.env["ANTHROPIC_API_KEY"];
if (claudeApiKey) {
  providers.set("claude", new ClaudeProvider({
    baseUrl: "",
    apiKey: claudeApiKey,
    model: "claude-sonnet-4-20250514",
  }));
}
```

#### 2. AWS Bedrock

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import type { AIProvider, LabReportResult } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

export class AWSBedrockProvider implements AIProvider {
  readonly name = "AWS Bedrock";
  readonly id = "aws-bedrock";
  readonly description = "AWS Bedrock with Claude/Titan models";
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor(region: string, modelId: string) {
    this.client = new BedrockRuntimeClient({ region });
    this.modelId = modelId; // e.g., "anthropic.claude-3-sonnet-20240229-v1:0"
  }

  async analyzeReport(pdfText: string): Promise<LabReportResult> {
    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(pdfText) }],
      }),
    });

    const response = await this.client.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    const parsed = JSON.parse(body.content[0].text);
    // ... same result construction as other providers
  }
}
```

#### 3. Google Gemini

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, LabReportResult } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

export class GeminiProvider implements AIProvider {
  readonly name = "Google Gemini";
  readonly id = "gemini";
  readonly description = "Google Gemini for biomarker analysis";
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = "gemini-pro") {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async analyzeReport(pdfText: string): Promise<LabReportResult> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(buildUserPrompt(pdfText));
    const parsed = JSON.parse(result.response.text());
    // ... same result construction
  }
}
```

### Switching Providers

Set the `AI_PROVIDER` environment variable to switch the default:

```bash
AI_PROVIDER=openai    # Default
AI_PROVIDER=claude    # Anthropic Claude
AI_PROVIDER=aws-bedrock  # AWS Bedrock
AI_PROVIDER=gemini    # Google Gemini
```

---

## Scalability

### Current Architecture Scalability

| Component | Current | Scalable To |
|-----------|---------|-------------|
| Frontend | Single Vite server | CDN (CloudFront/Vercel) |
| API Server | Single Express instance | Horizontal scaling (ECS/K8s) |
| PDF Processing | In-memory (Multer) | S3 + Lambda |
| AI Calls | Synchronous | Queue-based (SQS/Bull) |

### Scaling Strategies

#### 1. Horizontal Scaling
- **Stateless API**: The server is stateless — no database, no sessions. This means horizontal scaling is trivial: just add more instances behind a load balancer.
- **Container-based**: Package as a Docker container and deploy to ECS, EKS, or Cloud Run.

#### 2. Async Processing for Large Files
For production workloads with large PDFs or high concurrency:

```
Client → API Gateway → SQS Queue → Lambda/ECS Worker → S3 (results)
                                         ↓
                                   AI Provider API
```

- Upload PDF to S3 via presigned URL
- Push job to SQS
- Worker processes PDF and calls AI
- Store results in S3/DynamoDB
- Notify client via WebSocket or polling

#### 3. Caching
- Cache AI responses for identical PDF content (hash-based)
- Use Redis/ElastiCache for result caching
- Reduce AI API costs for repeated analyses

#### 4. Rate Limiting
- Implement per-user rate limiting
- Use token bucket algorithm
- Protect against AI API cost overruns

---

## Security

### Current Implementation

1. **File Validation**
   - MIME type checking (PDF only)
   - File size limits (20MB)
   - Memory storage (no temp files on disk)

2. **Input Sanitization**
   - Multer handles multipart parsing safely
   - No user input interpolated into system commands

3. **CORS**
   - Configured for the application origin

### Production Security Recommendations

1. **Authentication & Authorization**
   - Add JWT-based authentication (Auth0, Clerk, or AWS Cognito)
   - Role-based access control (RBAC)
   - API key management for programmatic access

2. **Data Privacy (HIPAA Compliance)**
   - **Encryption at rest**: Encrypt stored PDFs and results (AES-256)
   - **Encryption in transit**: TLS 1.3 for all connections
   - **Data retention**: Auto-delete uploaded PDFs after processing
   - **Audit logging**: Log all access to patient data
   - **BAA**: Ensure AI provider has Business Associate Agreement
   - **No PII in logs**: Scrub patient names/DOBs from log output

3. **API Security**
   - Rate limiting (express-rate-limit)
   - Request size limits
   - Input validation with Zod schemas
   - CSRF protection
   - Helmet.js for security headers

4. **Infrastructure Security**
   - VPC isolation
   - Security groups / firewall rules
   - Secrets management (AWS Secrets Manager / Vault)
   - Regular dependency audits

---

## Cloud Deployment — AWS Solution

### Recommended AWS Architecture

```
                    ┌──────────────┐
                    │  CloudFront  │
                    │    (CDN)     │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │    S3    │ │   ALB    │ │    S3    │
        │ (Static  │ │ (Load   │ │ (PDF     │
        │  Assets) │ │ Balancer)│ │ Storage) │
        └──────────┘ └────┬─────┘ └──────────┘
                          │
                    ┌─────┴─────┐
                    │    ECS    │
                    │  Fargate  │
                    │ (API      │
                    │  Server)  │
                    └─────┬─────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Secrets  │ │ Cloud-   │ │  OpenAI  │
        │ Manager  │ │ Watch    │ │   API    │
        │          │ │ (Logs)   │ │          │
        └──────────┘ └──────────┘ └──────────┘
```

### AWS Services Breakdown

| Service | Purpose | Monthly Cost Estimate |
|---------|---------|----------------------|
| **CloudFront** | CDN for static assets + API caching | ~$5-10 |
| **S3** | Static frontend hosting + PDF temp storage | ~$1-5 |
| **ALB** | Application Load Balancer | ~$20 |
| **ECS Fargate** | Container hosting (0.5 vCPU, 1GB) | ~$15-30 |
| **Secrets Manager** | API keys storage | ~$1 |
| **CloudWatch** | Logging and monitoring | ~$5-10 |
| **WAF** | Web Application Firewall | ~$10 |
| **ACM** | TLS certificates | Free |

**Estimated Total: ~$60-90/month** for a production deployment handling ~1000 analyses/day.

### Infrastructure as Code (Terraform)

```hcl
# Example Terraform configuration
module "lab_analyzer" {
  source = "./modules/ecs-service"

  service_name    = "lab-report-analyzer"
  container_image = "ecr.aws/lab-analyzer:latest"
  cpu             = 512
  memory          = 1024

  environment = {
    AI_PROVIDER                       = "openai"
    AI_INTEGRATIONS_OPENAI_BASE_URL   = "from-secrets-manager"
    AI_INTEGRATIONS_OPENAI_API_KEY    = "from-secrets-manager"
  }

  health_check_path = "/api/healthz"
}
```

### Alternative Cloud Options

| Cloud | Services | Best For |
|-------|----------|----------|
| **AWS** | ECS Fargate + ALB + S3 + CloudFront | Enterprise, HIPAA compliance |
| **GCP** | Cloud Run + Cloud CDN + GCS | Cost-effective, auto-scaling |
| **Azure** | Container Apps + Front Door + Blob Storage | Microsoft ecosystem |
| **Vercel/Railway** | Serverless + Edge | Quick deployment, small scale |

---

## Project Structure

```
├── artifacts/
│   ├── api-server/           # Express API server
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── ai-providers/     # AI provider strategy pattern
│   │   │   │   │   ├── types.ts      # Interfaces
│   │   │   │   │   ├── prompt.ts     # Shared AI prompts
│   │   │   │   │   ├── openai-provider.ts  # OpenAI implementation
│   │   │   │   │   └── index.ts      # Provider factory
│   │   │   │   ├── pdf-parser.ts     # PDF text extraction
│   │   │   │   └── logger.ts         # Pino logger
│   │   │   └── routes/
│   │   │       ├── analyze/          # Lab report analysis endpoints
│   │   │       └── health.ts         # Health check
│   │   └── package.json
│   └── lab-report-analyzer/  # React frontend
│       ├── src/
│       │   ├── pages/                # Page components
│       │   ├── components/           # UI components
│       │   └── index.css             # Theme/styling
│       └── package.json
├── lib/
│   ├── api-spec/             # OpenAPI specification
│   ├── api-client-react/     # Generated React Query hooks
│   ├── api-zod/              # Generated Zod validation schemas
│   └── db/                   # Database (Drizzle ORM)
└── ARCHITECTURE.md           # This document
```

---

## Development

### Prerequisites
- Node.js 24+
- pnpm

### Running Locally

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/lab-report-analyzer run dev
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/healthz` | Health check |
| POST | `/api/analyze-report` | Upload and analyze PDF |
| GET | `/api/ai-providers` | List available AI providers |
