import { describe, expect, it } from "vitest";
import { buildProject, compileVueSource, createRouteManifest, ResuxCompileError } from "resuxjs/compiler";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
});

describe("sfc compiler", () => {
  it("compiles the supported MVP template and script subset", () => {
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
    expect(JSON.stringify(component.template)).toContain("count.value > 0");
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
    expect(component.serverSource).toContain("function __rx_inline_0($event)");
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
    expect(JSON.stringify(component.template)).toContain("!(visible.value)");
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
    expect(template).toContain('"expression":"label.value"');
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

    const template = JSON.stringify(component.template);
    expect(template).toContain("'count-' + count.value");
    expect(template).toContain('"expression":"count.value"');
    expect(template).toContain('"expression":"pending.value"');
    expect(template).toContain('"expression":"!pending.value && !error.value"');
    expect(template).toContain('"expression":"error.value"');
    expect(template).toContain('"expression":"error.value.message"');
    expect(template).toContain('"expression":"data.value.label"');
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
    expect(template).toContain('"html":{"expression":"body.value"');
    expect(template).toContain('"name":"value","value":"message.value"');
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
    expect(manifest.runtimeConfig.public.apiBase).toBe("/api");
    expect(manifest.appHead.title).toBe("Test");
    expect(bundledManifest.appHead.title).toBe("Test");
    expect(bundledManifest.matchRoute("/").route.path).toBe("/");
    expect(manifest.serverMiddleware[0].file).toContain("headers.ts");
    const runtimeClient = await readFile(path.join(root, ".resux", "client", "runtime-client.mjs"), "utf8");
    expect(runtimeClient).toContain("createClientComponent");
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
    expect(manifest.routeRules["/__resux/handlers/**"].cache).toEqual({ maxAge: 120 });
    expect(manifest.routeRules["/__resux/route"].cache).toBe(false);
    expect(manifest.runtimeConfig.public.securityHeaders).toBe(true);
    expect(manifest.runtimeConfig.public.performanceModule.assetMaxAge).toBe(120);
    expect(manifestJson.routeRules["/__resux/runtime-client.mjs"].cache).toEqual({ maxAge: 120 });
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
