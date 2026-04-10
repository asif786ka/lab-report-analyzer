import OpenAI from "openai";
import type { AIProvider, AIProviderConfig, LabReportResult } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { logger } from "../logger";

export class OpenAIProvider implements AIProvider {
  readonly name = "OpenAI";
  readonly id = "openai";
  readonly description =
    "OpenAI GPT models for biomarker extraction and classification";
  private client: OpenAI;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
    });
    this.model = config.model;
  }

  async analyzeReport(pdfText: string): Promise<LabReportResult> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(pdfText) },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    logger.info("OpenAI response received, parsing JSON");

    const parsed = JSON.parse(content);

    const biomarkers = parsed.biomarkers || [];
    const summary = {
      total: biomarkers.length,
      optimal: biomarkers.filter(
        (b: { classification: string }) => b.classification === "optimal",
      ).length,
      normal: biomarkers.filter(
        (b: { classification: string }) => b.classification === "normal",
      ).length,
      outOfRange: biomarkers.filter(
        (b: { classification: string }) => b.classification === "out_of_range",
      ).length,
    };

    return {
      patient: parsed.patient || {},
      biomarkers,
      summary,
      aiProvider: this.id,
    };
  }
}
