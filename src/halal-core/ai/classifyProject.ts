import { HALAL_CLASSIFIER_PROMPT } from "./halalClassifierPrompt.js";
import { validateAiResponse } from "./validateAiResponse.js";
import { createProjectSummary } from "./createProjectSummary.js";
import type { HalalCheckResult } from "../status.js";

const DEFAULT_AI_TIMEOUT_MS = 15_000;
const MAX_AI_TIMEOUT_MS = 120_000;

export async function classifyProject(
  scannedData: any,
  apiKey?: string,
  endpoint?: string,
): Promise<HalalCheckResult> {
  const summary = createProjectSummary(scannedData);
  const targetEndpoint = endpoint || process.env.RESUX_AI_ENDPOINT;
  const targetKey = apiKey || process.env.RESUX_AI_API_KEY;

  if (!targetEndpoint || !targetKey) {
    return {
      status: "allowed",
      riskLevel: "low",
      categories: [],
      confidence: 1,
      reasons: ["AI classification skipped: AI endpoint or API key not configured."],
      matchedFiles: [],
      matchedSnippets: [],
      recommendedAction: "Use local offline scanning results.",
    };
  }

  let endpointUrl: URL;
  try {
    endpointUrl = validateAiEndpoint(targetEndpoint);
  } catch (error) {
    return classificationFailure(error, "ai_configuration_error");
  }

  const timeoutMs = resolveAiTimeoutMs();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${targetKey}`,
      },
      body: JSON.stringify({
        model: process.env.RESUX_AI_MODEL || "gemini-2.5-flash",
        messages: [
          { role: "system", content: HALAL_CLASSIFIER_PROMPT },
          { role: "user", content: JSON.stringify(summary) },
        ],
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI API returned status ${response.status}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const messageContent = data.choices?.[0]?.message?.content;
    if (typeof messageContent !== "string" || !messageContent.trim()) {
      throw new Error("AI API response did not contain a classification message.");
    }
    return validateAiResponse(messageContent);
  } catch (error) {
    if (controller.signal.aborted) {
      return classificationFailure(
        new Error(`AI request exceeded ${timeoutMs}ms.`),
        "ai_timeout",
      );
    }
    return classificationFailure(error, "ai_network_error");
  } finally {
    clearTimeout(timeoutId);
  }
}

export function validateAiEndpoint(endpoint: string): URL {
  const url = new URL(endpoint);
  const hostname = url.hostname.toLowerCase();
  const isLocalhost = hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalhost)) {
    throw new Error("RESUX_AI_ENDPOINT must use HTTPS, except for localhost development endpoints.");
  }
  if (url.username || url.password) {
    throw new Error("RESUX_AI_ENDPOINT must not contain URL credentials.");
  }
  return url;
}

export function resolveAiTimeoutMs(value = process.env.RESUX_AI_TIMEOUT_MS): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_AI_TIMEOUT_MS;
  }
  return Math.min(Math.max(1, Math.floor(parsed)), MAX_AI_TIMEOUT_MS);
}

function classificationFailure(error: unknown, category: string): HalalCheckResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    status: "review_required",
    riskLevel: "medium",
    categories: [category],
    confidence: 0,
    reasons: [`AI classification unavailable: ${message}`],
    matchedFiles: [],
    matchedSnippets: [],
    recommendedAction: "Perform manual offline review.",
  };
}
