import { HALAL_CLASSIFIER_PROMPT } from "./halalClassifierPrompt.js";
import { validateAiResponse } from "./validateAiResponse.js";
import { createProjectSummary } from "./createProjectSummary.js";
import type { HalalCheckResult } from "../status.js";

export async function classifyProject(
  scannedData: any,
  apiKey?: string,
  endpoint?: string
): Promise<HalalCheckResult> {
  const summary = createProjectSummary(scannedData);
  
  const targetEndpoint = endpoint || process.env.RESUX_AI_ENDPOINT;
  const targetKey = apiKey || process.env.RESUX_AI_API_KEY;

  if (!targetEndpoint || !targetKey) {
    // If AI is not configured, fall back gracefully to local-only status
    return {
      status: "allowed",
      riskLevel: "low",
      categories: [],
      confidence: 1.0,
      reasons: ["AI classification skipped: AI endpoint or API key not configured."],
      matchedFiles: [],
      matchedSnippets: [],
      recommendedAction: "Use local offline scanning results."
    };
  }

  try {
    const response = await fetch(targetEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${targetKey}`
      },
      body: JSON.stringify({
        model: process.env.RESUX_AI_MODEL || "gemini-2.5-flash",
        messages: [
          { role: "system", content: HALAL_CLASSIFIER_PROMPT },
          { role: "user", content: JSON.stringify(summary) }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`AI API returned status ${response.status}`);
    }

    const data: any = await response.json();
    const messageContent = data.choices?.[0]?.message?.content || "";
    return validateAiResponse(messageContent);
  } catch (err: any) {
    return {
      status: "review_required",
      riskLevel: "medium",
      categories: ["ai_network_error"],
      confidence: 0.0,
      reasons: [`AI service connection failed: ${err.message}`],
      matchedFiles: [],
      matchedSnippets: [],
      recommendedAction: "Perform manual offline review."
    };
  }
}
