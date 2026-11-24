import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  isPathWithinBoundary,
  resolveRequestPathWithinBoundary,
} from "../src/security/path-boundary.js";
import {
  renderDocument,
  renderApp,
  defineComponent,
} from "../src/runtime/index.js";
import { buildProject } from "../src/compiler/index.js";
import { createResuxNodeHandler } from "../src/cli.js";
import { Window } from "happy-dom";
import { installTestWindow } from "./helpers/install-test-window.js";

describe("framework public CSS, Windows serving, and head style retention", () => {
  const tmpDir = path.resolve(process.cwd(), "tmp-test-public-css");
  const publicDir = path.join(tmpDir, "public");
  const assetsDir = path.join(tmpDir, "assets");

  beforeAll(() => {
    mkdirSync(publicDir, { recursive: true });
    mkdirSync(assetsDir, { recursive: true });
    writeFileSync(path.join(publicDir, "styles.css"), "body { background: red; }\n.hidden { display: none; }", "utf8");
    writeFileSync(path.join(publicDir, "font.woff2"), Buffer.from([0, 1, 2, 3]));
    writeFileSync(path.join(assetsDir, "custom.css"), ".custom { color: blue; }", "utf8");
  });

  afterAll(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe("Windows path boundary resolution", () => {
    it("resolves valid paths with leading forward and backward slashes", () => {
      const resolvedForward = resolveRequestPathWithinBoundary(publicDir, publicDir, "/styles.css");
      expect(resolvedForward).toBe(path.join(publicDir, "styles.css"));

      const resolvedBackward = resolveRequestPathWithinBoundary(publicDir, publicDir, "\\styles.css");
      expect(resolvedBackward).toBe(path.join(publicDir, "styles.css"));
    });

    it("rejects path traversal attempting to escape the boundary", () => {
      expect(resolveRequestPathWithinBoundary(publicDir, publicDir, "/../package.json")).toBeNull();
      expect(resolveRequestPathWithinBoundary(publicDir, publicDir, "/..\\package.json")).toBeNull();
      expect(resolveRequestPathWithinBoundary(publicDir, publicDir, "/%2e%2e%2fpackage.json")).toBeNull();
      expect(resolveRequestPathWithinBoundary(publicDir, publicDir, "/%2e%2e%5cpackage.json")).toBeNull();
    });

    it("rejects Windows drive letters or absolute paths in the request", () => {
      expect(resolveRequestPathWithinBoundary(publicDir, publicDir, "/C:/windows/notepad.exe")).toBeNull();
      expect(resolveRequestPathWithinBoundary(publicDir, publicDir, "C:\\windows\\notepad.exe")).toBeNull();
      expect(resolveRequestPathWithinBoundary(publicDir, publicDir, "/D:/secret.txt")).toBeNull();
    });

    it("handles boundary check across different case variations on Windows", () => {
      expect(isPathWithinBoundary(publicDir, path.join(publicDir, "styles.css"))).toBe(true);
      expect(isPathWithinBoundary(publicDir.toLowerCase(), path.join(publicDir, "styles.css"))).toBe(true);
      expect(isPathWithinBoundary(publicDir.toUpperCase(), path.join(publicDir, "styles.css"))).toBe(true);
    });
  });

  describe("Head style deduplication, nonces, and SSR rendering", () => {
    it("deduplicates styles by id, keeping the latest one", () => {
      const result = {
        html: "<div>content</div>",
        payload: { route: { path: "/", params: {}, query: {} }, scopes: {}, modules: {}, config: {} },
        head: {
          style: [
            { id: "theme-style", textContent: "body { color: black; }" },
            { id: "other-style", textContent: ".other { margin: 0; }" },
            { id: "theme-style", textContent: "body { color: white; }" },
          ],
        },
      };

      const doc = renderDocument(result as any, "Title");
      expect(doc).toContain('<style data-rx-head="true" data-rx-style="theme-style">body { color: white; }</style>');
      expect(doc).not.toContain("body { color: black; }");
      expect(doc).toContain('<style data-rx-head="true" data-rx-style="other-style">.other { margin: 0; }</style>');
    });

    it("attaches nonce to styles and stylesheet links when nonce is provided", () => {
      const result = {
        html: "<div>content</div>",
        payload: { route: { path: "/", params: {}, query: {} }, scopes: {}, modules: {}, config: {} },
        head: {
          link: [
            { rel: "stylesheet", href: "/styles.css" },
          ],
          style: [
            { id: "custom", textContent: ".test { color: red; }" },
          ],
        },
      };

      const doc = renderDocument(result as any, "Title", { nonce: "secret-nonce-456" });
      expect(doc).toContain('<link data-rx-head="true" nonce="secret-nonce-456" rel="stylesheet" href="/styles.css">');
      expect(doc).toContain('<style data-rx-head="true" nonce="secret-nonce-456" data-rx-style="custom">.test { color: red; }</style>');
      expect(doc).toContain('<style nonce="secret-nonce-456">');
    });

    it("escapes closing style tags within style content", () => {
      const result = {
        html: "<div>content</div>",
        payload: { route: { path: "/", params: {}, query: {} }, scopes: {}, modules: {}, config: {} },
        head: {
          style: [
            { textContent: "/* </style><script>alert(1)</script> */" },
          ],
        },
      };

      const doc = renderDocument(result as any, "Title");
      expect(doc).toContain("<\\/style");
      expect(doc).not.toContain("</style><script>");
    });
  });

  describe("Client hydration and DOM style retention", () => {
    it("does not remove SSR style elements that do not have an id", () => {
      const win = new Window();
      const restoreWindow = installTestWindow(win, "http://localhost:3000/");

      try {
        // Simulate SSR HTML already in DOM
        const ssrStyle = win.document.createElement("style");
        ssrStyle.setAttribute("data-rx-head", "true");
        ssrStyle.textContent = "body { margin: 0; }";
        win.document.head.appendChild(ssrStyle);

        const page = defineComponent({
          id: "m-style-page",
          name: "StylePage",
          file: "pages/index.vue",
          handlers: [],
          async script(ctx) {
            ctx.useHead({
              style: [
                { textContent: "body { margin: 0; }" },
              ],
            });
            return {};
          },
          template: [{ type: "element", tag: "div", attrs: [], events: [], children: [] }],
        });

        // Ensure style tag is still in DOM and does not get attribute data-rx-style="undefined"
        expect(win.document.head.contains(ssrStyle)).toBe(true);
        expect(ssrStyle.getAttribute("data-rx-style")).toBeNull();
      } finally {
        restoreWindow();
      }
    });

    it("preserves existing html lang attribute when not specified in head.htmlAttrs", () => {
      const win = new Window();
      const restoreWindow = installTestWindow(win, "http://localhost:3000/");

      try {
        win.document.documentElement.setAttribute("lang", "fr");
        win.document.documentElement.setAttribute("dir", "rtl");

        const page = defineComponent({
          id: "m-lang-page",
          name: "LangPage",
          file: "pages/index.vue",
          handlers: [],
          async script(ctx) {
            ctx.useHead({
              title: "Page Title",
            });
            return {};
          },
          template: [{ type: "element", tag: "div", attrs: [], events: [], children: [] }],
        });

        // lang should remain "fr", dir should remain "rtl"
        expect(win.document.documentElement.getAttribute("lang")).toBe("fr");
        expect(win.document.documentElement.getAttribute("dir")).toBe("rtl");
      } finally {
        restoreWindow();
      }
    });
  });

  describe("Dev reload script stylesheet validation", () => {
    it("includes stylesheet warning logic in devReload script", () => {
      const result = {
        html: "<div>content</div>",
        payload: { route: { path: "/", params: {}, query: {} }, scopes: {}, modules: {}, config: {} },
        head: {},
      };

      const doc = renderDocument(result as any, "Title", { devReload: true });
      expect(doc).toContain("[resux] Warning: Stylesheet");
      expect(doc).toContain('link[rel="stylesheet"]');
      expect(doc).toContain("non-CSS Content-Type");
    });
  });

  describe("Node server static asset serving", () => {
    let server: any;
    let serverUrl: string;

    beforeAll(async () => {
      const pagesDir = path.join(tmpDir, "pages");
      mkdirSync(pagesDir, { recursive: true });
      writeFileSync(path.join(pagesDir, "index.vue"), "<template><main>Index</main></template>", "utf8");

      const serverMwDir = path.join(tmpDir, "server", "middleware");
      mkdirSync(serverMwDir, { recursive: true });
      writeFileSync(
        path.join(serverMwDir, "inject.ts"),
        `export default defineServerMiddleware((event) => {
          if (event.node.req.url?.includes("html-only")) {
            event.node.res.setHeader("content-type", "text/html");
          }
        });`,
        "utf8"
      );

      const outDir = path.join(tmpDir, ".resux");
      await buildProject(tmpDir, outDir);

      const handler = createResuxNodeHandler({
        appRoot: tmpDir,
        outDir,
      });

      server = createServer((req, res) => {
        handler(req, res);
      });

      await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", () => {
          const addr = server.address();
          serverUrl = `http://127.0.0.1:${typeof addr === "object" ? addr.port : 0}`;
          resolve();
        });
      });
    });

    afterAll(async () => {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    it("serves public CSS with text/css; charset=utf-8, nosniff, and ETag", async () => {
      const res = await fetch(`${serverUrl}/styles.css`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("text/css; charset=utf-8");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      const etag = res.headers.get("etag");
      expect(etag).toBeTruthy();

      const text = await res.text();
      expect(text).toContain("background: red");

      // Test ETag 304 revalidation
      const res304 = await fetch(`${serverUrl}/styles.css`, {
        headers: { "if-none-match": etag! },
      });
      expect(res304.status).toBe(304);
    });

    it("serves font files with font/woff2 MIME type and nosniff", async () => {
      const res = await fetch(`${serverUrl}/font.woff2`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("font/woff2");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    });

    it("serves assets/ directory with proper MIME and nosniff", async () => {
      const res = await fetch(`${serverUrl}/assets/custom.css`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("text/css; charset=utf-8");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      const text = await res.text();
      expect(text).toContain("color: blue");
    });

    it("serves error 404 with no-store cache-control", async () => {
      const res = await fetch(`${serverUrl}/not-a-real-file-or-page.xyz`);
      expect(res.status).toBe(404);
      expect(res.headers.get("cache-control")).toContain("no-store");
    });
  });
});
