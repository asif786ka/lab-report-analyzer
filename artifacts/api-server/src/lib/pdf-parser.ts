import pdf from "pdf-parse";
import { logger } from "./logger";

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  logger.info({ numPages: data.numpages, textLength: data.text.length }, "PDF parsed successfully");
  return data.text;
}
