import { Window } from "happy-dom";
import { expect } from "vitest";
import { getClientRuntimeSource } from "resuxjs/runtime";

// Shared harness for behavioral regression probes against the *client* runtime
// (the plain-JS copy inside getClientRuntimeSource()). The server engine in
// src/reactivity has its own suites; these probes guard the browser copy
// against the two copies drifting apart again.

export type ProbeResult = { name: string; pass: boolean; detail: string };

export async function runClientEngineProbe(probeBody: string): Promise<ProbeResult[]> {
  const window = new Window({ url: "http://localhost/" });
  try {
    const source = getClientRuntimeSource()
      .replaceAll("import.meta", "({env:{DEV:false}})")
      .replace(/^export \{[^}]*\};?\s*$/gm, "")
      .replace(/^export (?=(async )?(function|const|let|var|class))/gm, "");
    window.eval(source);
    const body = probeBody.replaceAll("\\", "\\\\").replaceAll("`", "\\`");
    const script = "(async () => { const out = []; const t = (name, pass, detail) => out.push({ name, pass: !!pass, detail: String(detail) }); "
      + body + "; return out; })()";
    return await window.eval(script) as ProbeResult[];
  } finally {
    await window.happyDOM.close();
  }
}

export function expectAllPass(results: ProbeResult[]) {
  const failures = results.filter((r) => !r.pass);
  expect(
    failures.map((f) => `${f.name} :: ${f.detail}`),
    `client engine probe failures: ${failures.map((f) => f.name).join(", ")}`,
  ).toEqual([]);
}
