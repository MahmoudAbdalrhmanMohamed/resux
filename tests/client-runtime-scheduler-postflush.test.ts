import { describe, expect, it } from "vitest";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Regression coverage for the client runtime scheduler: the server engine
// (src/reactivity/scheduler.ts) queues async watchers onto a post-flush queue
// that drains after the main queue, and marks the flush promise as handled so
// fire-and-forget job errors do not surface as unhandled rejections. The
// client copy queued watchers into the main (pre-flush) queue and lacked the
// rejection guard.

describe("client runtime scheduler post-flush", () => {
  it("runs post-flush watchers after main-queue jobs", async () => {
    const results = await runClientEngineProbe(`
      const r = ref(0);
      const order = [];
      watch(r, () => { order.push("watch"); }, { flush: "post" });
      r.value = 1;
      __rxQueueJob(() => { order.push("render"); });
      await nextTick();
      t("main-queue job runs before post-flush watcher", order.join(",") === "render,watch", order.join(","));
    `);
    expectAllPass(results);
  });

  it("drains post-flush jobs queued during the post-flush pass", async () => {
    const results = await runClientEngineProbe(`
      const order = [];
      const r = ref(0);
      const r2 = ref(0);
      watch(r, () => { order.push("w1"); r2.value = 1; }, { flush: "post" });
      watch(r2, () => { order.push("w2"); }, { flush: "post" });
      r.value = 1;
      await nextTick();
      await nextTick();
      t("chained post-flush watchers both run", order.join(",") === "w1,w2", order.join(","));
    `);
    expectAllPass(results);
  });

  it("a throwing queued job does not produce an unhandled rejection", async () => {
    const results = await runClientEngineProbe(`
      let unhandled = 0;
      window.addEventListener("unhandledrejection", () => { unhandled++; });
      __rxQueueJob(() => { throw new Error("boom"); });
      await new Promise((resolve) => setTimeout(resolve, 20));
      t("no unhandledrejection from fire-and-forget job failure", unhandled === 0, unhandled);
    `);
    expectAllPass(results);
  });

  it("nextTick still surfaces the flush rejection to awaiters", async () => {
    const results = await runClientEngineProbe(`
      __rxQueueJob(() => { throw new Error("visible"); });
      let caught = "";
      await nextTick().then(() => { caught = "resolved"; }, (e) => { caught = e.message; });
      await new Promise((resolve) => setTimeout(resolve, 0));
      t("nextTick rejection observable", caught === "visible", caught);
    `);
    expectAllPass(results);
  });
});
