import { describe, expect, it } from "vitest";
import { compileVueSource } from "resuxjs/compiler";
import { expectAllPass, runClientEngineProbe } from "./helpers/client-engine-probe.js";

// Regression: defineExpose, defineSlots, defineOptions and defineModel are documented setup macros and
// the runtime setup context has them, but the compiled setup did not destructure them. A component
// calling one of them failed with "X is not defined" and the page answered 500.

const source = `<script setup lang="ts">
const count = useState("count", () => 0)
function inc() { count.value++ }
defineExpose({ inc })
defineOptions({ name: "Macros" })
const slots = defineSlots()
const model = defineModel<string>()
</script>
<template><button @click="inc">{{ count.value }}</button></template>`;

describe("setup macros", () => {
  it("destructures every documented macro from the setup context", () => {
    const component = compileVueSource(source, { file: "Macros.vue", id: "m0", name: "Macros" });
    for (const output of [component.serverSource, component.clientSource]) {
      for (const name of ["defineExpose", "defineSlots", "defineOptions", "defineModel"]) {
        expect(output).toMatch(new RegExp(`const \\{[^}]*\\b${name}\\b[^}]*\\} = `));
      }
    }
  });

  it("provides the macros in the browser setup context", async () => {
    const results = await runClientEngineProbe(`
      const comp = createClientComponent({
        id: "m1", name: "Macros", handlers: ["inc"],
        template: [{ type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "inc" }],
          children: [{ type: "interpolation", expression: "n.value", bindingId: "b0" }] }],
        async script(ctx) {
          ctx.defineExpose({});
          ctx.defineOptions({ name: "X" });
          const slots = ctx.defineSlots();
          const model = ctx.defineModel("title");
          const n = ctx.ref(0);
          function inc() { n.value++; }
          return { n, inc, slots, model };
        }
      });
      const record = await comp.createScope({ id: "s1", moduleId: "m1", props: { title: "t" }, state: {}, globalStateKeys: [], asyncData: {} }, { path: "/" });
      t("scope created", !!record, "no record");
      t("model reads the prop", record.scope.model.value === "t", String(record.scope.model && record.scope.model.value));
      await comp.run(record, "inc", {});
      t("handler runs", record.scope.n.value === 1, "n");
    `);
    expectAllPass(results);
  });
});
