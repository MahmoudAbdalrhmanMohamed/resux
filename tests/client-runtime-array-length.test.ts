import { describe, expect, it } from "vitest";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Regression coverage for array-length truncation in the *client* runtime:
// assigning list.length must invalidate length, iteration, and every tracked
// index at or past the new length, exactly like the server engine
// (src/reactivity/effect.ts, the Array.isArray(target) && key === "length"
// branch). The client copy only notified "length" deps, leaving index reads
// stale after truncation.

describe("client runtime array length truncation", () => {
  it("re-runs effects that read truncated-away indices", async () => {
    const results = await runClientEngineProbe(`
      const list = reactive([1, 2, 3]);
      let runs = 0; let last;
      effect(() => { runs++; last = list[2]; });
      list.length = 1;
      t("index effect re-runs after truncation", runs === 2, runs);
      t("truncated index now reads undefined", last === undefined, String(last));

      let keepRuns = 0;
      effect(() => { keepRuns++; list[0]; });
      list.length = 1;
      t("index below the new length is NOT invalidated", keepRuns === 1, keepRuns);
    `);
    expectAllPass(results);
  });

  it("notifies length and iteration deps on truncation and extension", async () => {
    const results = await runClientEngineProbe(`
      const list = reactive([1, 2, 3]);
      let lenRuns = 0;
      effect(() => { lenRuns++; list.length; });
      list.length = 2;
      t("length dep fires on truncation", lenRuns === 2, lenRuns);

      let iterRuns = 0; let joined = "";
      effect(() => { iterRuns++; joined = [...list].join(","); });
      list.length = 1;
      t("iteration dep fires on truncation", iterRuns === 2 && joined === "1", iterRuns + " " + joined);

      list.length = 4;
      t("extension also fires iteration + length", iterRuns === 3 && lenRuns === 4, iterRuns + "/" + lenRuns);

      list.push(9, 8);
      t("push still notifies length and iteration per element, matching the server engine", lenRuns === 6 && iterRuns === 5 && joined === "1,,,,9,8", lenRuns + "/" + iterRuns + " " + joined);
    `);
    expectAllPass(results);
  });
});
