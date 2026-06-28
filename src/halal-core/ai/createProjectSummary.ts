import { redactSensitiveData } from "./redactSensitiveData.js";

export function createProjectSummary(scannedData: {
  routes: string[];
  pages: string[];
  components: string[];
  metadata: { title?: string; description?: string };
  envNames: string[];
  dependencies: Record<string, string>;
  i18nWords: string[];
  contentTexts: Array<{ file: string; text: string }>;
  endpoints: string[];
}) {
  // We sanitize and summarize file structures instead of raw source code blocks
  const filesSummary = scannedData.contentTexts.map(f => {
    // Redact contents first
    const redactedText = redactSensitiveData(f.text);
    
    // Abstract the AST content structure to avoid sending code lines
    const forms = (redactedText.match(/<form[^>]*>([\s\S]*?)<\/form>/gi) || []).map(form => {
      const inputs = (form.match(/<input[^>]*>/gi) || []).map(input => {
        const typeMatch = input.match(/type=["']([^"']+)["']/i);
        const nameMatch = input.match(/name=["']([^"']+)["']/i);
        return {
          type: typeMatch ? typeMatch[1] : "text",
          name: nameMatch ? nameMatch[1] : "unknown"
        };
      });
      return { inputs };
    });

    const isSecure = redactedText.includes("https:") || redactedText.includes("crypto");

    return {
      file: f.file,
      length: f.text.length,
      forms,
      hasCrypto: isSecure,
      // Provide a highly redacted, minimal snippet representation (first 100 characters)
      snippet: redactedText.slice(0, 100).replace(/\s+/g, " ").trim()
    };
  });

  return {
    projectName: scannedData.metadata.title || "ResuxJS Application",
    projectDescription: scannedData.metadata.description || "An application built with ResuxJS.",
    routes: scannedData.routes,
    pages: scannedData.pages,
    components: scannedData.components,
    envNames: scannedData.envNames,
    dependencies: Object.keys(scannedData.dependencies),
    endpoints: scannedData.endpoints,
    i18nWords: scannedData.i18nWords.slice(0, 50), // Limit translations
    files: filesSummary
  };
}
