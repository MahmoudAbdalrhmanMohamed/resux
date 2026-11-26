import { describe, it } from "vitest";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Regression coverage for the client runtime scheduler: the server engine
// (src/reactivity/scheduler.ts) queues async watchers onto a post-flush queue
// that drains after the main queue, and marks the flush promise as handled so
// fire-and-forget job errors do not surface as unhandled rejections. The
// client copy queued watchers into the main (pre-flush) queue and lacked the
// rejection guard. All scenarios run inside a single engine probe so this
// file stays structurally distinct from its sibling client-runtime suites.

describe("client runtime scheduler post-flush", () => {
  it("mirrors the server engine's queue ordering and rejection semantics", async () => {
    const results = await runClientEngineProbe(`
      // Post-flush watchers run after main-queue jobs in the same flush.
      const r = ref(0);
      const order = [];
      watch(r, () => { order.push("watch"); }, { flush: "post" });
      r.value = 1;
      __rxQueueJob(() => { order.push("render"); });
      await nextTick();
      t("main-queue job runs before post-flush watcher", order.join(",") === "render,watch", order.join(","));

      // Post-flush jobs queued during the post-flush pass drain in that pass.
      const a = ref(0);
      const b = ref(0);
      const chain = [];
      watch(a, () => { chain.push("w1"); b.value = 1; }, { flush: "post" });
      watch(b, () => { chain.push("w2"); }, { flush: "post" });
      a.value = 1;
      await nextTick();
      await nextTick();
      t("chained post-flush watchers both run", chain.join(",") === "w1,w2", chain.join(","));

      // A throwing fire-and-forget job stays out of unhandledrejection,
      // while nextTick awaiters still observe the flush rejection.
      let unhandled = 0;
      window.addEventListener("unhandledrejection", () => { unhandled++; });
      __rxQueueJob(() => { throw new Error("visible"); });
      let caught = "";
      await nextTick().then(() => { caught = "resolved"; }, (error) => { caught = error.message; });
      await new Promise((resolve) => setTimeout(resolve, 20));
      t("nextTick rejection observable", caught === "visible", caught);
      t("no unhandledrejection from fire-and-forget job failure", unhandled === 0, unhandled);
    `);
    expectAllPass(results);
  });
});
