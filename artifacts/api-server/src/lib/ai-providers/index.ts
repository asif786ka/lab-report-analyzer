import type { AIProvider } from "./types";
import { OpenAIProvider } from "./openai-provider";
import { logger } from "../logger";

export type { AIProvider, AIProviderConfig, LabReportResult } from "./types";

const providers = new Map<string, AIProvider>();

function initProviders() {
  const openaiBaseUrl = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const openaiApiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];

  if (openaiBaseUrl && openaiApiKey) {
    providers.set(
      "openai",
      new OpenAIProvider({
        baseUrl: openaiBaseUrl,
        apiKey: openaiApiKey,
        model: "gpt-4o",
      }),
    );
    logger.info("OpenAI provider initialized");
  }
}

initProviders();

export function getProvider(id?: string): AIProvider {
  const providerId = id || "openai";
  const provider = providers.get(providerId);
  if (!provider) {
    throw new Error(
      `AI provider "${providerId}" not found. Available: ${Array.from(providers.keys()).join(", ")}`,
    );
  }
  return provider;
}

export function getAllProviders(): {
  id: string;
  name: string;
  description: string;
  active: boolean;
}[] {
  return Array.from(providers.values()).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    active: true,
  }));
}

export function getCurrentProviderId(): string {
  return "openai";
}
