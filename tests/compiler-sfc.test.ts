import { describe, expect, it } from "vitest";
import { compileVueSource } from "resuxjs/compiler";
import path from "node:path";

describe("sfc compiler", () => {
  it("compiles the supported Resux template and script subset", () => {
    const component = compileVueSource(
      `<script setup lang="ts">
const count = useState("count", () => 0)
function increment() {
  count.value++
}
</script>

<template>
  <section :class="'count-' + count.value">
    <p v-if="count.value > 0">Count: {{ count.value }}</p>
    <button @click="increment">Increment</button>
  </section>
</template>`,
      {
        file: "Counter.vue",
        id: "m0",
        name: "Counter"
      }
    );

    expect(component.handlers).toEqual(["increment"]);
    expect(component.serverSource).toContain("defineComponent");
    expect(component.clientSource).toContain("createClientComponent");
    expect(component.expressions?.some((e) => e.original === "count.value > 0")).toBe(true);
  });

  it("compiles v-if / v-else-if / v-else chains", () => {
    const component = compileVueSource(
      `<script setup>
const mode = useState("mode", () => "idle")
</script>
<template>
  <p v-if="mode === 'idle'">Idle</p>
  <p v-else-if="mode === 'loading'">Loading</p>
  <p v-else>Done</p>
</template>`,
      {
        file: "ConditionalChain.vue",
        id: "m0",
        name: "ConditionalChain"
      }
    );

    const branches = component.template
      .filter((node): node is Extract<(typeof component.template)[number], { type: "element" }> => node.type === "element");

    expect(branches).toHaveLength(3);
    const resolveExpr = (id?: string) => component.expressions?.find((e) => e.id === id)?.transformed;
    expect(resolveExpr(branches[0].if?.expression)).toContain("mode.value === 'idle'");
    expect(resolveExpr(branches[1].if?.expression)).toContain("!(mode.value === 'idle') && (mode.value === 'loading')");
    expect(resolveExpr(branches[2].if?.expression)).toContain("!(mode.value === 'idle') && !(mode.value === 'loading')");
  });

  it("rejects orphaned v-else and v-else-if directives", () => {
    expect(() =>
      compileVueSource(
        `<template><p v-else>Orphan</p></template>`,
        {
          file: "OrphanElse.vue",
          id: "m0",
          name: "OrphanElse"
        }
      )
    ).toThrow(/must follow a sibling with v-if or v-else-if/);

    expect(() =>
      compileVueSource(
        `<template><p v-else-if="ready">Orphan</p></template>`,
        {
          file: "OrphanElseIf.vue",
          id: "m0",
          name: "OrphanElseIf"
        }
      )
    ).toThrow(/must follow a sibling with v-if or v-else-if/);
  });

  it("compiles unrecognized/custom directives as attributes", () => {
    const component = compileVueSource(
      `<template><div v-auto-animate v-my-dir:arg="val">Animate</div></template>`,
      {
        file: "CustomDirectives.vue",
        id: "m0",
        name: "CustomDirectives"
      }
    );

    const divNode = component.template[0];
    expect(divNode.type).toBe("element");
    if (divNode.type === "element") {
      const vAutoAnimateAttr = divNode.attrs.find((p) => p.name === "v-auto-animate");
      expect(vAutoAnimateAttr).toBeDefined();
      expect(vAutoAnimateAttr?.kind).toBe("static");
      expect(vAutoAnimateAttr?.value).toBe("");

      const vMyDirAttr = divNode.attrs.find((p) => p.name === "v-my-dir:arg");
      expect(vMyDirAttr).toBeDefined();
      expect(vMyDirAttr?.kind).toBe("dynamic");
      const resolveExpr = (id?: string) => component.expressions?.find((e) => e.id === id)?.transformed;
      expect(resolveExpr(vMyDirAttr?.value)).toContain("val");
    }
  });

  it("compiles event handlers capturing top-level helper functions and imports", () => {
    const component = compileVueSource(
      `<script setup>
import { helper } from './utils.js';
const active = ref('sa');
const setActiveCountry = (key) => {
  active.value = key;
  helper(key);
};
</script>
<template><div @click="setActiveCountry('sa')">Active</div></template>`,
      {
        file: "CaptureTest.vue",
        id: "m0",
        name: "CaptureTest"
      }
    );

    expect(component.template).toBeDefined();
  });

  it("compiles template loop variable captures inside event handlers", () => {
    const component = compileVueSource(
      `<script setup>
const active = ref('sa');
const setActiveCountry = (key) => {
  active.value = key;
};
const countries = { sa: 'Saudi' };
</script>
<template>
  <ul>
    <li v-for="(country, key) in countries" :key="key" @click="setActiveCountry(key)">
      {{ country }}
    </li>
  </ul>
</template>`,
      {
        file: "LoopCapture.vue",
        id: "m0",
        name: "LoopCapture"
      }
    );

    expect(component.template).toBeDefined();
  });

  it("compiles event handlers capturing top-level primitive constants", () => {
    const component = compileVueSource(
      `<script setup>
const count = ref(0);
const maxRetries = 3;
const isEnabled = true;
const label = "click";
const decrementBy = -1;
const doSomething = () => {
  if (isEnabled && count.value < maxRetries) {
    count.value += decrementBy;
    console.log(label);
  }
};
</script>
<template><button @click="doSomething">Action</button></template>`,
      {
        file: "ConstantsCapture.vue",
        id: "m0",
        name: "ConstantsCapture"
      }
    );

    expect(component.template).toBeDefined();
  });

  it("compiles event handlers capturing destructured properties from resumable initializers", () => {
    const component = compileVueSource(
      `<script setup>
const { data, refresh, error } = await useFetch('/api/clients');
const triggerRefresh = () => {
  if (!error.value) {
    refresh();
  }
};
</script>
<template><button @click="triggerRefresh">Refresh</button></template>`,
      {
        file: "DestructureCapture.vue",
        id: "m0",
        name: "DestructureCapture"
      }
    );

    expect(component.template).toBeDefined();
  });

  it("compiles plain and scoped style blocks from Resux SFCs", () => {
    const component = compileVueSource(
      `<script setup>
const title = "Home"
</script>
<template><main class="page"><h1>{{ title }}</h1></main></template>
<style>
.page { color: red; }
</style>
<style scoped>
h1 { font-weight: 700; }
</style>`,
      {
        file: "Styled.vue",
        id: "m0",
        name: "Styled"
      }
    );

    expect(component.styles).toHaveLength(2);
    expect(component.styles[0]).toMatchObject({ id: "m0-0", scoped: false });
    expect(component.styles[0].css).toContain(".page");
    expect(component.styles[1]).toMatchObject({ id: "m0-1", scoped: true });
    expect(component.styles[1].css).toContain("h1[data-v-rx-s-m0]");
    expect(component.styleScopeId).toBe("data-v-rx-s-m0");
    expect(component.serverSource).toContain("styles:");
    expect(component.serverSource).toContain("data-v-rx-s-m0");
  });

  it("rejects unsupported SFC style languages", () => {
    expect(() =>
      compileVueSource(
        `<template><main>Home</main></template><style lang="scss">.page { color: red; }</style>`,
        {
          file: "UnsupportedStyle.vue",
          id: "m0",
          name: "UnsupportedStyle"
        }
      )
    ).toThrow(/only supports plain CSS/);
  });

  it("compiles inline event expressions into resumable handlers", () => {
    const component = compileVueSource(
      `<script setup>
const count = useState("count", () => 0)
</script>
<template><button @click="count.value++">Increment</button></template>`,
      {
        file: "Inline.vue",
        id: "m0",
        name: "Inline"
      }
    );

    expect(component.handlers).toEqual(["__rx_inline_0"]);
    expect(component.serverSource).toContain("function __rx_inline_0($event, __rx_event_locals = {})");
    expect(component.serverSource).toContain("count.value++");
  });

  it("compiles resumability-safe event modifiers and v-show", () => {
    const component = compileVueSource(
      `<script setup>
const visible = useState("visible", () => true)
function save() {
  visible.value = false
}
</script>
<template>
  <form @submit.prevent.stop="save">
    <button v-show="visible.value">Save</button>
  </form>
</template>`,
      {
        file: "Form.vue",
        id: "m0",
        name: "Form"
      }
    );

    expect(component.handlers).toEqual(["save"]);
    expect(JSON.stringify(component.template)).toContain('"modifiers":["prevent","stop"]');
    expect(JSON.stringify(component.template)).toContain('"name":"hidden"');
    expect(component.expressions?.some((e) => e.transformed === "!(visible.value)")).toBe(true);
  });

  it("keeps Teleport and Transition boundaries in the resumable template", () => {
    const component = compileVueSource(
      `<script setup>
const visible = useState("visible", () => true)
</script>
<template>
  <teleport to="#teleports" disabled defer>
    <transition name="fade">
      <div v-if="visible">Overlay</div>
    </transition>
  </teleport>
</template>`,
      {
        file: "TeleportTransition.vue",
        id: "m0",
        name: "TeleportTransition"
      }
    );

    const template = JSON.stringify(component.template);
    expect(template).toContain('"tag":"teleport"');
    expect(template).toContain('"name":"to","value":"#teleports"');
    expect(template).toContain('"name":"disabled","value":""');
    expect(template).toContain('"name":"defer","value":""');
    expect(template).toContain('"tag":"transition"');
    expect(template).toContain('"name":"name","value":"fade"');
    expect(template).toContain('"expression":"__rx_expr_0"');
    expect(component.expressions?.some((entry) => entry.transformed === "visible.value")).toBe(true);
  });

  it("compiles v-text into a resumable text binding", () => {
    const component = compileVueSource(
      `<script setup>
const label = useState("label", () => "Save")
</script>
<template><button v-text="label.value">Ignored</button></template>`,
      {
        file: "Text.vue",
        id: "m0",
        name: "Text"
      }
    );

    const template = JSON.stringify(component.template);
    expect(template).toContain('"type":"interpolation"');
    expect(component.expressions?.some((e) => e.transformed === "label.value")).toBe(true);
    expect(template).not.toContain("Ignored");
  });

  it("auto-unwraps setup refs in template expressions", () => {
    const component = compileVueSource(
      `<script setup>
const count = useState("count", () => 0)
const { data, pending, error } = useAsyncData("stats", async () => ({ label: "Ready" }))
</script>
<template>
  <button :class="'count-' + count">Count: {{ count }}</button>
  <p v-if="pending">Loading</p>
  <p v-if="error">{{ error.message }}</p>
  <strong v-if="!pending && !error" v-text="data.label">Label</strong>
</template>`,
      {
        file: "Unwrap.vue",
        id: "m0",
        name: "Unwrap"
      }
    );

    expect(component.expressions?.some((e) => e.transformed === "'count-' + count.value")).toBe(true);
    expect(component.expressions?.some((e) => e.transformed === "count.value")).toBe(true);
    expect(component.expressions?.some((e) => e.transformed === "pending.value")).toBe(true);
    expect(component.expressions?.some((e) => e.transformed === "!pending.value && !error.value")).toBe(true);
    expect(component.expressions?.some((e) => e.transformed === "error.value")).toBe(true);
    expect(component.expressions?.some((e) => e.transformed === "error.value.message")).toBe(true);
    expect(component.expressions?.some((e) => e.transformed === "data.value.label")).toBe(true);
  });

  it("auto-unwraps awaited useAsyncData refs in template expressions", () => {
    const component = compileVueSource(
      `<script setup>
const { data, pending, error } = await useAsyncData("stats", async () => ({ label: "Ready" }))
</script>
<template>
  <p v-if="pending">Loading</p>
  <p v-if="error">{{ error.message }}</p>
  <strong v-if="!pending && !error && data" v-text="data.label">Label</strong>
</template>`,
      {
        file: "AwaitedUnwrap.vue",
        id: "m0",
        name: "AwaitedUnwrap"
      }
    );

    expect(component.expressions?.some((e) => e.transformed === "pending.value")).toBe(true);
    expect(component.expressions?.some((e) => e.transformed === "error.value")).toBe(true);
    expect(component.expressions?.some((e) => e.transformed === "error.value.message")).toBe(true);
    expect(component.expressions?.some((e) => e.transformed === "!pending.value && !error.value && data.value")).toBe(true);
    expect(component.expressions?.some((e) => e.transformed === "data.value.label")).toBe(true);
  });

  it("compiles advanced event modifiers", () => {
    const component = compileVueSource(
      `<script setup>
function save() {}
</script>
<template><button @keyup.enter.once.prevent="save">Save</button></template>`,
      {
        file: "Modifiers.vue",
        id: "m0",
        name: "Modifiers"
      }
    );

    expect(JSON.stringify(component.template)).toContain('"modifiers":["enter","once","prevent"]');
  });

  it("compiles sanitized v-html and resumable v-model bindings", () => {
    const component = compileVueSource(
      `<script setup>
const body = useState("body", () => "<strong>Safe</strong>")
const message = useState("message", () => "Hello")
</script>
<template>
  <article v-html="body.value">Ignored</article>
  <input v-model="message.value">
</template>`,
      {
        file: "Bindings.vue",
        id: "m0",
        name: "Bindings"
      }
    );

    const template = JSON.stringify(component.template);
    expect(template).toContain('"html"');
    expect(template).toContain('"name":"value"');
    expect(component.expressions?.some((e) => e.transformed === "body.value")).toBe(true);
    expect(component.expressions?.some((e) => e.transformed === "message.value")).toBe(true);
    expect(component.handlers).toEqual(["__rx_inline_0"]);
    expect(component.serverSource).toContain("message.value = $event.target ? $event.target.value : \"\"");
  });

  it("rejects handler captures outside resumable state", () => {
    expect(() =>
      compileVueSource(
        `<script setup>
const count = useState("count", () => 0)
const serverOnly = { secret: true }
function increment() {
  count.value += serverOnly.secret ? 1 : 0
}
</script>
<template><button @click="increment">Bad</button></template>`,
        {
          file: "Capture.vue",
          id: "m0",
          name: "Capture"
        }
      )
    ).toThrow(/not resumable/);
  });

  it("allows browser globals in resumable handlers", () => {
    const component = compileVueSource(
      `<script setup lang="ts">
const clicks = useState("perf-clicks", () => 0)
const last = useState("perf-last", () => "No browser measurement yet")
const average = useState("perf-average", () => "Run API benchmark")
function measureClick() {
  const start = performance.now()
  clicks.value++
  const end = performance.now()
  last.value = (end - start).toFixed(3) + " ms state patch"
}
async function runApiBench() {
  const start = performance.now()
  let total = 0
  for (let index = 0; index < 5; index++) {
    const response = await fetch("/api/stats?source=browser-bench&n=" + index)
    if (response.ok) total++
  }
  const end = performance.now()
  average.value = ((end - start) / 5).toFixed(2) + " ms avg across " + total + " API calls"
}
</script>
<template>
  <section>
    <button @click="measureClick">Measure state patch</button>
    <button @click="runApiBench">Run API benchmark</button>
  </section>
</template>`,
      {
        file: "Performance.vue",
        id: "m0",
        name: "Performance"
      }
    );

    expect(component.handlers).toEqual(["measureClick", "runApiBench"]);
    expect(component.serverSource).toContain("performance.now");
    expect(component.serverSource).toContain('fetch("/api/stats?source=browser-bench&n=" + index)');
  });

  it("extracts page meta and keeps definePageMeta out of setup code", () => {
    const component = compileVueSource(
      `<script setup>
definePageMeta({
  layout: "post",
  middleware: ["auth"],
  title: "Post"
})
const route = useRoute()
</script>
<template><h1>{{ route.path }}</h1></template>`,
      {
        file: "Meta.vue",
        id: "m0",
        name: "Meta"
      }
    );

    expect(component.meta).toEqual({
      layout: "post",
      middleware: ["auth"],
      title: "Post"
    });
    expect(component.serverSource).not.toContain("definePageMeta({");
  });

  it("exposes useSeoMeta to compiled setup code", () => {
    const component = compileVueSource(
      `<script setup>
useSeoMeta({
  title: "Home",
  description: "Home description",
  ogTitle: "Home OG"
})
</script>
<template><h1>Home</h1></template>`,
      {
        file: "Seo.vue",
        id: "m0",
        name: "Seo"
      }
    );

    expect(component.serverSource).toContain("useSeoMeta");
    expect(component.clientSource).toContain("useSeoMeta");
  });

  it("exposes useRouter to compiled setup code and resumable handlers", () => {
    const component = compileVueSource(
      `<script setup>
const router = useRouter()
function goAbout() {
  router.push("/about")
}
</script>
<template><button @click="goAbout">About</button></template>`,
      {
        file: "Router.vue",
        id: "m0",
        name: "Router"
      }
    );

    expect(component.handlers).toEqual(["goAbout"]);
    expect(component.serverSource).toContain("useRouter");
    expect(component.clientSource).toContain("useRouter");
  });

  it("allows calling useRouter directly inside resumable handlers", () => {
    const component = compileVueSource(
      `<script setup>
function goHome() {
  useRouter().push("/")
}
</script>
<template><button @click="goHome">Home</button></template>`,
      {
        file: "RouterDirect.vue",
        id: "m0",
        name: "RouterDirect"
      }
    );

    expect(component.handlers).toEqual(["goHome"]);
    expect(component.serverSource).toContain("useRouter");
    expect(component.clientSource).toContain("useRouter");
  });

  it("exposes apiURL to compiled setup code", () => {
    const component = compileVueSource(
      `<script setup>
const { data } = useAsyncData("test", () => $fetch(apiURL("/api/test")))
</script>
<template><pre>{{ data }}</pre></template>`,
      {
        file: "Api.vue",
        id: "m0",
        name: "Api"
      }
    );

    expect(component.serverSource).toContain("apiURL");
    expect(component.clientSource).toContain("apiURL");
  });

  it("compiles defineProps for reusable components", () => {
    const component = compileVueSource(
      `<script setup lang="ts">
const props = defineProps<{ title: string }>()
function select() {
  console.log(props.title)
}
</script>
<template><button @click="select">{{ props.title }}</button></template>`,
      {
        file: "components/CardPanel.vue",
        id: "m0",
        name: "CardPanel"
      }
    );

    expect(component.handlers).toEqual(["select"]);
    expect(component.serverSource).toContain("defineProps");
  });
});
