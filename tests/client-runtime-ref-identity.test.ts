import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { getClientRuntimeSource } from "resuxjs/runtime";

// Regression coverage for ref identity semantics in the *client* runtime copy:
// assigning a reactive proxy of the already-stored raw object must be a no-op,
// exactly like the server engine (src/reactivity/ref.ts uses toRaw in both the
// constructor and the setter). Without toRaw, self-assignment triggered
// effects and double-wrapped the proxy on every write.

type ProbeResult = { name: string; pass: boolean; detail: string };

async function runClientEngineProbe(probeBody: string): Promise<ProbeResult[]> {
  const window = new Window({ url: "http://localhost/" });
  try {
    const source = getClientRuntimeSource()
      .replaceAll("import.meta", "({env:{DEV:false}})")
      .replace(/^export \{[^}]*\};?\s*$/gm, "")
      .replace(/^export (?=(async )?(function|const|let|var|class))/gm, "");
    window.eval(source);
    const body = probeBody.replaceAll("\\", "\\\\").replaceAll("`", "\\`");
    const script = "(() => { const out = []; const t = (name, pass, detail) => out.push({ name, pass: !!pass, detail: String(detail) }); "
      + body + "; return out; })()";
    return window.eval(script) as ProbeResult[];
  } finally {
    await window.happyDOM.close();
  }
}

function expectAllPass(results: ProbeResult[]) {
  const failures = results.filter((r) => !r.pass);
  expect(
    failures.map((f) => `${f.name} :: ${f.detail}`),
    `client engine probe failures: ${failures.map((f) => f.name).join(", ")}`,
  ).toEqual([]);
}

describe("client runtime ref identity", () => {
  it("treats proxy self-assignment as a no-op", async () => {
    const results = await runClientEngineProbe(`
      const obj = { a: 1 };
      const r = ref(obj);
      const p = r.value;
      let runs = 0;
      effect(() => { runs++; r.value; });
      r.value = p;
      r.value = r.value;
      t("self-assigning the stored proxy does not retrigger", runs === 1, runs);
      t("no double-wrap: value identity is preserved", r.value === p, r.value === p);
      r.value = { a: 2 };
      t("assigning a genuinely new object still triggers", runs === 2, runs);
    `);
    expectAllPass(results);
  });

  it("unwraps proxies at construction and on assignment", async () => {
    const results = await runClientEngineProbe(`
      const raw = { n: 1 };
      const proxied = reactive(raw);
      const r = ref(proxied);
      let runs = 0;
      effect(() => { runs++; r.value; });
      r.value = proxied;
      t("assigning the same proxy over a proxy-initialized ref is a no-op", runs === 1, runs);
      r.value = raw;
      t("assigning the raw of the stored proxy is a no-op", runs === 1, runs);
      t("toRaw(ref.value) is the original object", toRaw(r.value) === raw, "");
    `);
    expectAllPass(results);
  });

  it("keeps the client ref implementation structurally aligned with the server engine", () => {
    const source = getClientRuntimeSource();
    // Both the constructor and the setter must normalize through toRaw, like
    // src/reactivity/ref.ts; guard against the copies drifting apart again.
    const impl = source.match(/class __rxRefImpl[\s\S]*?\n}/);
    expect(impl).not.toBeNull();
    const body = impl![0];
    expect(body.match(/toRaw\(/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
