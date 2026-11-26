import { describe, expect, it } from "vitest";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Regression coverage for the client runtime watch stop handle: the server
// engine (src/reactivity/watch.ts) guards queued jobs with a `stopped` flag
// and makes the stop handle idempotent. The client copy let an already-queued
// job fire its callback after stop() and re-ran cleanup on a second stop().

describe("client runtime watch stop", () => {
  it("does not fire a job queued before stop()", async () => {
    const results = await runClientEngineProbe(`
      const r = ref(0);
      let calls = 0;
      const stop = watch(r, () => { calls++; }, { flush: "post" });
      r.value = 1;
      stop();
      await nextTick();
      t("queued job suppressed after stop", calls === 0, calls);
    `);
    expectAllPass(results);
  });

  it("stops future notifications and is idempotent", async () => {
    const results = await runClientEngineProbe(`
      const r = ref(0);
      let calls = 0; let cleanups = 0;
      const stop = watch(r, (n, o, onCleanup) => { calls++; onCleanup(() => { cleanups++; }); }, { flush: "post" });
      r.value = 1;
      await nextTick();
      t("fires while active", calls === 1, calls);
      stop();
      stop();
      t("double stop runs cleanup only once", cleanups === 1, cleanups);
      r.value = 2;
      await nextTick();
      t("no callbacks after stop", calls === 1, calls);
    `);
    expectAllPass(results);
  });

  it("still flushes normally while active", async () => {
    const results = await runClientEngineProbe(`
      const r = ref(0);
      const seen = [];
      watch(r, (n) => { seen.push(n); }, { flush: "post" });
      r.value = 1;
      r.value = 2;
      await nextTick();
      t("batches queued jobs like the server engine", seen.join(",") === "2", seen.join(","));
    `);
    expectAllPass(results);
  });
});
