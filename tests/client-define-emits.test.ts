import { describe, it } from "vitest";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Regression: the compiled setup destructures defineEmits from the setup context. The browser
// context did not provide it, so any component calling defineEmits() failed on resume ("is not a
// function") and its handlers never ran. The server context already provides a no-op.

describe("client setup context: defineEmits", () => {
  it("runs a component that calls defineEmits and emits from a resumed handler", async () => {
    const results = await runClientEngineProbe(`
      const comp = createClientComponent({
        id: "m1", name: "Counter", handlers: ["inc"],
        template: [{ type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "inc" }],
          children: [{ type: "interpolation", expression: "n.value", bindingId: "b0" }] }],
        async script(ctx) {
          const emit = ctx.defineEmits();
          const n = ctx.ref(0);
          function inc() { n.value++; emit("changed", n.value); }
          return { n, inc };
        }
      });
      const record = await comp.createScope({ id: "s1", moduleId: "m1", props: {}, state: {}, globalStateKeys: [], asyncData: {} }, { path: "/" });
      t("scope created", !!record, "no record");
      await comp.run(record, "inc", {});
      t("handler ran and state updated", record.scope.n.value === 1, String(record.scope.n && record.scope.n.value));
    `);
    expectAllPass(results);
  });
});
