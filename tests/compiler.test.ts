import { describe, expect, it } from "vitest";
import { buildProject, compileVueSource, createRouteManifest, ResuxCompileError } from "resuxjs/compiler";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

describe("route manifest", () => {
  it("creates Resux-style routes with dynamic params", () => {
    const root = "/app";
    const routes = createRouteManifest(root, [
      "/app/pages/index.vue",
      "/app/pages/about.vue",
      "/app/pages/post/[id].vue",
      "/app/pages/docs/[section]/index.vue",
      "/app/pages/docs/[...slug].vue"
    ]);

    expect(routes.map((route) => route.path)).toEqual(["/docs/:section", "/docs/:slug*", "/post/:id", "/about", "/"]);
    expect(routes.find((route) => route.path === "/post/:id")?.params).toEqual(["id"]);
    expect(routes.find((route) => route.path === "/docs/:slug*")?.params).toEqual(["slug"]);
  });

  it("matches catch-all route params from generated manifests", async () => {
    const root = path.join(os.tmpdir(), `resux-catch-all-${Date.now()}`);
    await mkdir(path.join(root, "pages", "docs"), { recursive: true });
    await writeFile(path.join(root, "pages", "docs", "[...slug].vue"), "<template><main>Docs</main></template>");

    await buildProject(root);
    const manifest = await import(`${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}`);

    expect(manifest.routes[0].path).toBe("/docs/:slug*");
    expect(manifest.routes[0].params).toEqual(["slug"]);
    expect(manifest.matchRoute("/docs/guide/intro")?.params).toEqual({ slug: "guide/intro" });
    expect(manifest.matchRoute("/docs")?.params).toEqual({ slug: "" });
  }, 20000);

  it("generates localized routes only when i18n module is enabled", async () => {
    const root = path.join(os.tmpdir(), `resux-i18n-routes-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(path.join(root, "pages", "about.vue"), "<template><main>About</main></template>");
    await writeFile(path.join(root, "resux.config.ts"), `export default defineResuxConfig({
  modules: ["resuxjs/i18n"],
  i18n: {
    defaultLocale: "en",
    fallbackLocale: "en",
    strategy: "prefix_except_default",
    locales: [
      { code: "en", name: "English", dir: "ltr" },
      { code: "ar", name: "Arabic", dir: "rtl" }
    ],
    messages: {
      en: { demo: { title: "Home" } },
      ar: { demo: { title: "Home AR" } }
    }
  }
})`, "utf8");

    await buildProject(root);
    const manifest = JSON.parse(await readFile(path.join(root, ".resux", "manifest.json"), "utf8")) as {
      routes: Array<{ path: string }>;
    };
    const paths = manifest.routes.map((route) => route.path);

    expect(paths).toEqual(expect.arrayContaining(["/", "/about", "/ar", "/ar/about"]));
    expect(paths).not.toContain("/en");
    expect(new Set(paths).size).toBe(paths.length);
  }, 20000);

  it("keeps incremental dev builds stable without wiping generated directories", async () => {
    const root = path.join(os.tmpdir(), `resux-dev-incremental-${Date.now()}`);
    const outDir = path.join(root, ".resux");
    const indexFile = path.join(root, "pages", "index.vue");
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(indexFile, "<template><main>Initial</main></template>");

    await buildProject(root, outDir, { vite: "dev" });
    const sentinel = path.join(outDir, "vite-client", "sentinel.mjs");
    await writeFile(sentinel, "export const preserved = true;\n", "utf8");

    await writeFile(indexFile, "<template><main>Updated</main></template>");
    await buildProject(root, outDir, { vite: "dev", changedPath: indexFile });

    const sentinelSource = await readFile(sentinel, "utf8");
    expect(sentinelSource).toContain("preserved");

    const manifest = JSON.parse(await readFile(path.join(outDir, "manifest.json"), "utf8")) as {
      routes: Array<{ path: string }>;
    };
    expect(manifest.routes.some((route) => route.path === "/")).toBe(true);
  }, 25000);
});

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

describe("project build manifest", () => {
  it("discovers layouts, middleware, plugins, server handlers, public config, and page meta", async () => {
    const root = path.join(os.tmpdir(), `resux-build-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "layouts"), { recursive: true });
    await mkdir(path.join(root, "middleware"), { recursive: true });
    await mkdir(path.join(root, "plugins"), { recursive: true });
    await mkdir(path.join(root, "server", "middleware"), { recursive: true });
    await mkdir(path.join(root, "server", "api"), { recursive: true });
    await writeFile(path.join(root, "app.vue"), "<template><ResuxLayout><ResuxPage /></ResuxLayout></template>");
    await writeFile(path.join(root, "layouts", "default.vue"), "<template><div><slot /></div></template>");
    await writeFile(
      path.join(root, "pages", "index.vue"),
      `<script setup>definePageMeta({ middleware: "auth", title: "Home" })</script><template><h1 class="page-title">Home</h1></template>`
    );
    await writeFile(path.join(root, "middleware", "auth.ts"), "export default defineResuxRouteMiddleware(() => {})");
    await writeFile(path.join(root, "plugins", "app.ts"), "export default defineResuxPlugin(() => {})");
    await writeFile(path.join(root, "server", "middleware", "headers.ts"), "export default defineServerMiddleware((event) => { setHeader(event, 'x-server-middleware', 'true') })");
    await writeFile(path.join(root, "server", "api", "hello.ts"), "export default defineEventHandler(() => ({ hello: 'world' }))");
    await writeFile(
      path.join(root, "resux.config.ts"),
      "export default defineResuxConfig({ runtimeConfig: { public: { apiBase: '/api' } }, app: { head: { title: 'Test' } } })"
    );

    const result = await buildProject(root);
    const manifest = await import(`${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}`);
    const bundledManifest = await import(`${pathToFileURL(path.join(root, ".resux", "server-bundle", "index.mjs")).href}?t=${Date.now()}`);

    expect(result.layouts).toHaveLength(1);
    expect(result.middleware[0].name).toBe("auth");
    expect(result.serverMiddleware[0].id).toBe("s0");
    expect(result.plugins[0].id).toBe("p0");
    expect(result.serverHandlers[0].path).toBe("/api/hello");
    expect(result.routes[0].meta?.middleware).toBe("auth");
    expect((manifest as { resuxPlugins?: unknown[] }).resuxPlugins).toHaveLength(1);
    expect((manifest as { plugins?: unknown[] }).plugins).toBeUndefined();
    expect((bundledManifest as { resuxPlugins?: unknown[] }).resuxPlugins).toHaveLength(1);
    expect((bundledManifest as { plugins?: unknown[] }).plugins).toBeUndefined();
    expect(manifest.runtimeConfig.public.apiBase).toBe("/api");
    expect(manifest.appHead.title).toBe("Test");
    expect(bundledManifest.appHead.title).toBe("Test");
    expect(bundledManifest.matchRoute("/").route.path).toBe("/");
    expect(manifest.serverMiddleware[0].file).toContain("headers.ts");
    const runtimeClient = await readFile(path.join(root, ".resux", "client", "runtime-client.mjs"), "utf8");
    expect(runtimeClient).toContain("createClientComponent");
  }, 20000);

  it("discovers plugins and route middleware recursively with stable mode-aware outputs", async () => {
    const root = path.join(os.tmpdir(), `resux-support-files-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "plugins", "nested"), { recursive: true });
    await mkdir(path.join(root, "middleware", "nested"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(path.join(root, "plugins", "01.auth.ts"), "export default defineResuxPlugin(() => {})");
    await writeFile(path.join(root, "plugins", "02.analytics.ts"), "export default defineResuxPlugin(() => {})");
    await writeFile(path.join(root, "plugins", "client-only.client.ts"), "const browserPath = window.location.pathname; export default defineResuxPlugin((app) => { app.provide('browserPath', browserPath) })");
    await writeFile(path.join(root, "plugins", "server-only.server.ts"), "export default defineResuxPlugin((app) => { app.provide('serverOnly', true) })");
    await writeFile(path.join(root, "plugins", "nested", "03.shared.ts"), "export default defineResuxPlugin(() => {})");
    await writeFile(path.join(root, "middleware", "log.global.ts"), "export default defineResuxRouteMiddleware(() => {})");
    await writeFile(path.join(root, "middleware", "auth.ts"), "export default defineResuxRouteMiddleware(() => {})");
    await writeFile(path.join(root, "middleware", "nested", "admin.client.ts"), "const browserPath = window.location.pathname; export default defineResuxRouteMiddleware(() => browserPath)");
    await writeFile(path.join(root, "middleware", "secret.server.ts"), "export default defineResuxRouteMiddleware(() => {})");

    const result = await buildProject(root);
    const manifest = await import(`${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}`);
    const relativePlugins = result.plugins.map((entry) => path.relative(root, entry.file).replaceAll("\\", "/"));
    const relativeMiddleware = result.middleware.map((entry) => path.relative(root, entry.file).replaceAll("\\", "/"));

    expect(relativePlugins).toEqual([
      "plugins/01.auth.ts",
      "plugins/02.analytics.ts",
      "plugins/client-only.client.ts",
      "plugins/nested/03.shared.ts",
      "plugins/server-only.server.ts"
    ]);
    expect(relativeMiddleware).toEqual([
      "middleware/auth.ts",
      "middleware/log.global.ts",
      "middleware/nested/admin.client.ts",
      "middleware/secret.server.ts"
    ]);
    expect(manifest.clientPlugins.map((entry: { file: string }) => path.relative(root, entry.file).replaceAll("\\", "/"))).toEqual([
      "plugins/01.auth.ts",
      "plugins/02.analytics.ts",
      "plugins/client-only.client.ts",
      "plugins/nested/03.shared.ts"
    ]);
    expect(manifest.clientMiddleware.map((entry: { file: string }) => path.relative(root, entry.file).replaceAll("\\", "/"))).toEqual([
      "middleware/auth.ts",
      "middleware/log.global.ts",
      "middleware/nested/admin.client.ts"
    ]);
    expect(manifest.middleware.map((entry: { file: string }) => path.relative(root, entry.file).replaceAll("\\", "/"))).toEqual([
      "middleware/auth.ts",
      "middleware/log.global.ts",
      "middleware/secret.server.ts"
    ]);

    const pluginByFile = new Map(result.plugins.map((entry) => [path.basename(entry.file), entry]));
    const middlewareByFile = new Map(result.middleware.map((entry) => [path.basename(entry.file), entry]));
    const clientOnlyPlugin = pluginByFile.get("client-only.client.ts");
    const serverOnlyPlugin = pluginByFile.get("server-only.server.ts");
    const clientOnlyMiddleware = middlewareByFile.get("admin.client.ts");
    const serverOnlyMiddleware = middlewareByFile.get("secret.server.ts");

    expect(clientOnlyPlugin).toBeDefined();
    expect(serverOnlyPlugin).toBeDefined();
    expect(clientOnlyMiddleware).toBeDefined();
    expect(serverOnlyMiddleware).toBeDefined();
    await expect(readFile(path.join(root, ".resux", "server", "resux-plugins", `${clientOnlyPlugin!.id}.mjs`), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(root, ".resux", "client", "plugins", `${serverOnlyPlugin!.id}.mjs`), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(root, ".resux", "server", "resux-middleware", `${clientOnlyMiddleware!.id}.mjs`), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(root, ".resux", "client", "middleware", `${serverOnlyMiddleware!.id}.mjs`), "utf8")).rejects.toThrow();
  }, 20000);

  it("auto-discovers client enhancement files and injects runtime helper imports", async () => {
    const root = path.join(os.tmpdir(), `resux-client-enhancements-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "client-enhancements"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(
      path.join(root, "client-enhancements", "swiper-carousel.client.ts"),
      `defineClientEnhancement("swiper-carousel", async (target) => {
  await useClientPackage("swiper", { css: ["swiper/css"] });
  target.setAttribute("data-ready", "true");
});`,
    );

    const result = await buildProject(root, undefined, { vite: "dev" });
    const enhancementPlugin = result.plugins.find((entry) => entry.file.endsWith("swiper-carousel.client.ts"));
    expect(enhancementPlugin).toBeDefined();
    expect(enhancementPlugin?.mode).toBe("client");
    const clientModule = await readFile(
      path.join(root, ".resux", "vite-client", "plugins", `${enhancementPlugin!.id}.mjs`),
      "utf8",
    );
    const enhancementManifest = await readFile(path.join(root, ".resux", "client-enhancements.mjs"), "utf8");
    const viteEnhancementManifest = await readFile(path.join(root, ".resux", "vite-client", "client-enhancements.mjs"), "utf8");
    const clientEnhancementManifest = await readFile(path.join(root, ".resux", "client", "client-enhancements.mjs"), "utf8");
    const runtimeClient = await readFile(path.join(root, ".resux", "vite-client", "runtime-client.mjs"), "utf8");

    expect(clientModule).toMatch(
      /import\s+\{\s*(?:defineClientEnhancement,\s*useClientPackage|useClientPackage,\s*defineClientEnhancement)\s*\}\s+from\s+"\/__resux\/runtime-client\.mjs";/,
    );
    expect(clientModule).toContain('defineClientEnhancement("swiper-carousel"');
    expect(enhancementManifest).toContain(`import "/__resux/plugins/${enhancementPlugin!.id}.mjs";`);
    expect(enhancementManifest).toContain('"swiper-carousel"');
    expect(viteEnhancementManifest).toContain(`import "/__resux/plugins/${enhancementPlugin!.id}.mjs";`);
    expect(clientEnhancementManifest).toContain(`import "/__resux/plugins/${enhancementPlugin!.id}.mjs";`);
    expect(runtimeClient).toContain("export {");
    expect(runtimeClient).toContain("defineClientEnhancement");
    expect(runtimeClient).toContain("useClientPackage");
    expect(runtimeClient).toContain('[data-resux-enhancement], [use-client-enhancement]');
    expect(runtimeClient).toContain('data-resux-trigger');
  }, 20000);

  it("injects definePackageAdapter from runtime client helpers for enhancement adapters", async () => {
    const root = path.join(os.tmpdir(), `resux-client-enhancement-adapter-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "client-enhancements"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(
      path.join(root, "client-enhancements", "adapter-demo.client.ts"),
      `definePackageAdapter({
  name: "adapter-demo",
  imports: [],
  enhance(target) {
    target.setAttribute("data-adapter-ready", "true");
  }
});`,
    );

    const result = await buildProject(root, undefined, { vite: "dev" });
    const enhancementPlugin = result.plugins.find((entry) => entry.file.endsWith("adapter-demo.client.ts"));
    expect(enhancementPlugin).toBeDefined();
    const clientModule = await readFile(
      path.join(root, ".resux", "vite-client", "plugins", `${enhancementPlugin!.id}.mjs`),
      "utf8",
    );

    expect(clientModule).toMatch(
      /import\s+\{\s*definePackageAdapter\s*\}\s+from\s+"\/__resux\/runtime-client\.mjs";/,
    );
    expect(clientModule).toContain('name: "adapter-demo"');
  }, 20000);

  it("rewrites resuxjs imports in client enhancement files to runtime-client helpers", async () => {
    const root = path.join(os.tmpdir(), `resux-client-enhancement-rewrite-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "client-enhancements"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(
      path.join(root, "client-enhancements", "imported-helper.client.ts"),
      `import { defineClientEnhancement } from "resuxjs";
defineClientEnhancement("imported-helper", async (target) => {
  target.setAttribute("data-imported", "true");
});`,
    );

    const result = await buildProject(root, undefined, { vite: "dev" });
    const enhancementPlugin = result.plugins.find((entry) => entry.file.endsWith("imported-helper.client.ts"));
    expect(enhancementPlugin).toBeDefined();
    const clientModule = await readFile(
      path.join(root, ".resux", "vite-client", "plugins", `${enhancementPlugin!.id}.mjs`),
      "utf8",
    );

    expect(clientModule).toContain('from "/__resux/runtime-client.mjs"');
    expect(clientModule).not.toContain('from "resuxjs"');
  }, 20000);

  it("builds client enhancement chunks with __resux asset base paths for preview serving", async () => {
    const root = path.join(os.tmpdir(), `resux-enhancement-preview-base-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "client-enhancements"), { recursive: true });
    await writeFile(
      path.join(root, "pages", "index.vue"),
      `<template><main use-client-enhancement="style-demo" data-trigger="immediate">Preview Base</main></template>`,
      "utf8",
    );
    await writeFile(
      path.join(root, "client-enhancements", "style-demo.client.ts"),
      `defineClientEnhancement("style-demo", async (target) => {
  const vueModule = await import("vue");
  target.setAttribute("data-style-demo", typeof vueModule.reactive === "function" ? "ready" : "missing");
});`,
      "utf8",
    );

    const result = await buildProject(root, undefined, { vite: "build" });
    const enhancementPlugin = result.plugins.find((entry) => entry.file.endsWith("style-demo.client.ts"));
    expect(enhancementPlugin).toBeDefined();

    const pluginModule = await readFile(
      path.join(root, ".resux", "client", "plugins", `${enhancementPlugin!.id}.mjs`),
      "utf8",
    );
    expect(pluginModule).toContain("../chunks/");

    const chunkFiles = await readdir(path.join(root, ".resux", "client", "chunks"));
    const preloadHelperFile = chunkFiles.find((file) => file.startsWith("preload-helper-"));
    expect(preloadHelperFile).toBeDefined();
    const preloadHelperSource = await readFile(
      path.join(root, ".resux", "client", "chunks", preloadHelperFile!),
      "utf8",
    );
    expect(preloadHelperSource).toContain("/__resux/");
  }, 20000);

  it("generates an empty client enhancement manifest when no enhancement files are present", async () => {
    const root = path.join(os.tmpdir(), `resux-empty-enhancements-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");

    await buildProject(root, undefined, { vite: "dev" });

    const enhancementManifest = await readFile(path.join(root, ".resux", "client-enhancements.mjs"), "utf8");
    const viteEnhancementManifest = await readFile(path.join(root, ".resux", "vite-client", "client-enhancements.mjs"), "utf8");
    const clientEnhancementManifest = await readFile(path.join(root, ".resux", "client", "client-enhancements.mjs"), "utf8");

    expect(enhancementManifest).toContain("export const clientEnhancements = [];");
    expect(viteEnhancementManifest).toContain("export const clientEnhancements = [];");
    expect(clientEnhancementManifest).toContain("export const clientEnhancements = [];");
    expect(enhancementManifest).not.toContain('import "/__resux/plugins/');
  }, 20000);

  it("keeps Resux plugins separate from Nitro plugin auto-discovery folders", async () => {
    const root = path.join(os.tmpdir(), `resux-nitro-separation-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "plugins"), { recursive: true });
    await mkdir(path.join(root, "server", "plugins"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(path.join(root, "plugins", "01.lab.ts"), "export default defineResuxPlugin((app) => app.provide('labPlugin', { ok: true }))");
    await writeFile(path.join(root, "server", "plugins", "01.nitro.ts"), "export default () => {}");

    const result = await buildProject(root);
    const manifestSource = await readFile(path.join(root, ".resux", "server", "manifest.mjs"), "utf8");

    expect(result.plugins.map((entry) => path.relative(root, entry.file).replaceAll("\\", "/"))).toEqual(["plugins/01.lab.ts"]);
    expect(manifestSource).toContain('./resux-plugins/');
    expect(manifestSource).not.toContain('./plugins/');
    await expect(readFile(path.join(root, ".resux", "server", "resux-plugins", "p0.mjs"), "utf8")).resolves.toContain("defineResuxPlugin");
    await expect(readFile(path.join(root, ".resux", "server", "plugins", "p0.mjs"), "utf8")).rejects.toThrow();
  }, 20000);

  it("runs configured modules and emits route rules", async () => {
    const root = path.join(os.tmpdir(), `resux-modules-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "modules"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(
      path.join(root, "modules", "security.ts"),
      `export default defineResuxModule({
  defaults: { header: "default" },
  setup(options, resux) {
    resux.addCss("/module.css")
    resux.addHead({ meta: [{ name: "module", content: options.header }] })
    resux.addRouteRule("/admin/**", { headers: { "x-module": options.header } })
    resux.extendRuntimeConfig({ public: { fromModule: options.header } })
  }
})`
    );
    await writeFile(
      path.join(root, "resux.config.ts"),
      `export default defineResuxConfig({
  modules: [["./modules/security", { header: "enabled" }]],
  routeRules: {
    "/old": { redirect: { to: "/", statusCode: 301 } },
    "/api/**": {
      statusCode: 202,
      cache: { maxAge: 60, swr: 30 },
      cors: { origin: "https://example.com", methods: ["GET"], headers: ["content-type"], credentials: true }
    }
  }
})`
    );

    const result = await buildProject(root);
    const manifest = await import(`${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}`);
    const manifestJson = JSON.parse(await readFile(path.join(root, ".resux", "manifest.json"), "utf8"));

    expect(result.routeRules["/admin/**"].headers?.["x-module"]).toBe("enabled");
    expect(manifest.appHead.link).toEqual(expect.arrayContaining([{ rel: "stylesheet", href: "/module.css" }]));
    expect(manifest.appHead.meta).toEqual(expect.arrayContaining([{ name: "module", content: "enabled" }]));
    expect(manifest.runtimeConfig.public.fromModule).toBe("enabled");
    expect(manifest.routeRules["/old"].redirect).toEqual({ to: "/", statusCode: 301 });
    expect(manifest.routeRules["/admin/**"].headers["x-module"]).toBe("enabled");
    expect(manifest.routeRules["/api/**"].statusCode).toBe(202);
    expect(manifest.routeRules["/api/**"].cache).toEqual({ maxAge: 60, swr: 30 });
    expect(manifest.routeRules["/api/**"].cors).toEqual({
      origin: "https://example.com",
      methods: ["GET"],
      headers: ["content-type"],
      credentials: true
    });
    expect(manifestJson.routeRules["/admin/**"].headers["x-module"]).toBe("enabled");
  }, 20000);

  it("runs built-in module presets", async () => {
    const root = path.join(os.tmpdir(), `resux-builtin-modules-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Home</main></template>");
    await writeFile(
      path.join(root, "resux.config.ts"),
      `export default defineResuxConfig({
  modules: [
    ["resux:security", { contentSecurityPolicy: "default-src 'self'", headers: { "x-app": "resux" } }],
    ["resux:performance", { assetMaxAge: 120 }]
  ]
})`
    );

    await buildProject(root);
    const manifest = await import(`${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}`);
    const manifestJson = JSON.parse(await readFile(path.join(root, ".resux", "manifest.json"), "utf8"));

    expect(manifest.routeRules["/**"].headers["x-app"]).toBe("resux");
    expect(manifest.routeRules["/**"].headers["content-security-policy"]).toBe("default-src 'self'");
    expect(manifest.routeRules["/__resux/handlers/**"].cache).toBe(false);
    expect(manifest.routeRules["/__resux/route"].cache).toBe(false);
    expect(manifest.runtimeConfig.public.securityHeaders).toBe(true);
    expect(manifest.runtimeConfig.public.performanceModule.assetMaxAge).toBe(120);
    expect(manifestJson.routeRules["/__resux/runtime-client.mjs"].cache).toBe(false);
  }, 20000);

  it("runs tree-shakable UI, icon, and font module subpaths", async () => {
    const root = path.join(os.tmpdir(), `resux-ui-modules-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><main>Design modules</main></template>");
    await writeFile(
      path.join(root, "resux.config.ts"),
      `export default defineResuxConfig({
  modules: [
    ["resuxjs/fonts", { google: [{ name: "Inter", weights: [400, 700] }] }],
    ["resuxjs/icons", { component: "Icon", collections: ["material-symbols"] }],
    ["resuxjs/ui", { tokens: { accent: "#03C8BF" } }]
  ]
})`,
    );

    await buildProject(root);
    const manifest = await import(`${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}`);

    expect(manifest.appHead.link).toEqual(expect.arrayContaining([
      expect.objectContaining({ rel: "stylesheet", href: expect.stringContaining("fonts.googleapis.com") })
    ]));
    expect(manifest.runtimeConfig.public.icons.collections).toEqual(["material-symbols"]);
    expect(manifest.runtimeConfig.public.ui.tokens.accent).toBe("#03C8BF");
  }, 20000);

  it("can emit Vite dev client inputs without production bundling", async () => {
    const root = path.join(os.tmpdir(), `resux-vite-dev-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), "<template><button>Home</button></template>");

    await buildProject(root, undefined, { vite: "dev" });
    const manifest = JSON.parse(await readFile(path.join(root, ".resux", "manifest.json"), "utf8"));
    const runtimeClient = await readFile(path.join(root, ".resux", "vite-client", "runtime-client.mjs"), "utf8");
    const handler = await readFile(path.join(root, ".resux", "vite-client", "handlers", "m0.mjs"), "utf8");

    expect(manifest.features.vite).toBe("dev");
    expect(manifest.features.server).toBe("modules");
    expect(runtimeClient).toContain("createClientComponent");
    expect(handler).toContain("/__resux/runtime-client.mjs");
    await expect(readFile(path.join(root, ".resux", "client", "runtime-client.mjs"), "utf8")).rejects.toThrow();
    await expect(readFile(path.join(root, ".resux", "server-bundle", "index.mjs"), "utf8")).rejects.toThrow();
  });

  it("generates a static client package importer registry without raw import(packageName)", async () => {
    const root = path.join(process.cwd(), `.resux-test-package-registry-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(
      path.join(root, "pages", "index.vue"),
      `<script setup>
const loadVue = defineClientOnlyPackage("vue", { css: ["vue"] })
</script>
<template><main>Package Registry</main></template>`,
    );
    await writeFile(
      path.join(root, "resux.config.ts"),
      `export default defineResuxConfig({
  packages: {
    lazy: ["vue"],
    clientOnly: ["vue"],
    css: {
      vue: ["vue"]
    }
  }
})`,
    );

    await buildProject(root, undefined, { vite: "dev" });
    const runtimeClient = await readFile(path.join(root, ".resux", "vite-client", "runtime-client.mjs"), "utf8");

    expect(runtimeClient).toContain("const resuxPackageImporters = {");
    expect(runtimeClient).toContain('"vue": () => import("vue")');
    expect(runtimeClient).toContain('const resuxPackageCssImports = {"vue":["vue"]}');
    expect(runtimeClient).not.toContain("await import(packageName)");
    expect(runtimeClient).not.toContain("import(/* @vite-ignore */ packageName)");
  }, 20000);

  it("detects package API calls that use const string identifiers", async () => {
    const root = path.join(process.cwd(), `.resux-test-package-registry-const-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(
      path.join(root, "pages", "index.vue"),
      `<script setup>
const DEMO_PACKAGE = "vite"
const loadPackage = useClientPackage<Record<string, unknown>>(DEMO_PACKAGE, {
  css: ["vite"],
})
void loadPackage
</script>
<template><main>Package Registry Const</main></template>`,
    );

    await buildProject(root, undefined, { vite: "dev" });
    const runtimeClient = await readFile(path.join(root, ".resux", "vite-client", "runtime-client.mjs"), "utf8");

    expect(runtimeClient).toContain('"vite": () => import("vite")');
    expect(runtimeClient).toContain('const resuxPackageCssImports = {"vite":["vite"]}');
    expect(runtimeClient).not.toContain("await import(packageName)");
    expect(runtimeClient).not.toContain("import(/* @vite-ignore */ packageName)");
  }, 20000);

  it("registers package subpath specifiers used by package APIs", async () => {
    const root = path.join(process.cwd(), `.resux-test-package-subpaths-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await writeFile(
      path.join(root, "pages", "index.vue"),
      `<script setup>
const COMPILER_DOM_PACKAGE = "@vue/compiler-dom/dist/compiler-dom.cjs.js"
const loadCompilerDom = useClientPackage<Record<string, unknown>>(COMPILER_DOM_PACKAGE)
void loadCompilerDom
</script>
<template><main>Package Subpaths</main></template>`,
    );

    await buildProject(root, undefined, { vite: "dev" });
    const runtimeClient = await readFile(path.join(root, ".resux", "vite-client", "runtime-client.mjs"), "utf8");

    expect(runtimeClient).toContain('"@vue/compiler-dom/dist/compiler-dom.cjs.js": () => import("@vue/compiler-dom/dist/compiler-dom.cjs.js")');
    expect(runtimeClient).not.toContain("await import(packageName)");
    expect(runtimeClient).not.toContain("import(/* @vite-ignore */ packageName)");
  }, 20000);

  it("discovers and bundles Vue islands", async () => {
    const root = path.join(os.tmpdir(), `resux-vue-islands-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "islands", "vue"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), `<template><main><VueIsland name="CounterIsland" :props="{ start: 2 }" /></main></template>`);
    await writeFile(
      path.join(root, "islands", "vue", "CounterIsland.vue"),
      `<script setup>import { ref } from "vue"; const props = defineProps({ start: Number }); const count = ref(props.start)</script><template><button @click="count++">{{ count }}</button></template>`
    );

    const result = await buildProject(root);
    const manifest = await import(`${pathToFileURL(path.join(root, ".resux", "server", "manifest.mjs")).href}?t=${Date.now()}`);
    const html = result.components[0].serverSource;

    expect(result.vueIslands).toEqual([{ name: "CounterIsland", file: path.join(root, "islands", "vue", "CounterIsland.vue") }]);
    expect(manifest.vueIslands.CounterIsland).toBe("/__resux/vue-islands/CounterIsland.mjs");
    expect(html).toContain("VueIsland");
    await readFile(path.join(root, ".resux", "client", "vue-islands", "CounterIsland.mjs"), "utf8");
  }, 20000);
});
