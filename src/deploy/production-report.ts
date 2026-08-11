import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathExists } from "./common.js";

const REPORT_FILENAME = "halal-report.json";

export async function ensureResuxProductionReport(
  appRoot: string,
  runtimeRoots: string[],
): Promise<void> {
  if (!runtimeRoots.length) {
    return;
  }

  const source = path.join(appRoot, ".resux", REPORT_FILENAME);
  if (!(await pathExists(source))) {
    throw new Error(
      "Resux deployment is missing .resux/halal-report.json. Run `resux build` with RESUX_HALAL_REPORT_SIGNING_SECRET configured and retry.",
    );
  }

  for (const runtimeRoot of runtimeRoots) {
    const target = path.join(runtimeRoot, ".resux", REPORT_FILENAME);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target, { force: true });
  }
}
