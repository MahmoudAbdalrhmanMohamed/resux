import { scanProject } from "../scanner/scanProject.js";
import { generateHalalReport } from "../report/generateHalalReport.js";
import { loadProjectPolicy } from "../config.js";
import path from "node:path";

export async function runHalalReport(appRoot: string, outDir: string): Promise<string> {
  const policy = await loadProjectPolicy(appRoot);
  const scanned = scanProject(appRoot);
  const report = generateHalalReport(scanned, policy, outDir);

  const reportPath = path.join(outDir, "halal-report.json");
  console.log(`\x1b[32m[resux-halal-core] Generated signed report at: ${reportPath}\x1b[0m`);
  console.log(`Status: ${report.status}`);
  console.log(`Signature: ${report.signature}`);

  return reportPath;
}
