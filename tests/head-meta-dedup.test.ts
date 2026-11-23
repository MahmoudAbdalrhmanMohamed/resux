import { describe, expect, it } from "vitest";
import { defineComponent, renderApp, renderDocument } from "resuxjs/runtime";

function makeLayout(meta: Array<Record<string, string>>) {
  return defineComponent({
    id: "layout",
    name: "DefaultLayout",
    file: "layouts/default.vue",
    handlers: [],
    async script(ctx) {
      ctx.useHead({ meta });
      return {};
    },
    template: [
      {
        type: "element",
        tag: "section",
        attrs: [],
        events: [],
        children: [{ type: "element", tag: "slot", attrs: [], events: [], children: [] }]
      }
    ]
  });
}

function makePage(meta: Array<Record<string, string>>) {
  return defineComponent({
    id: "page",
    name: "IndexPage",
    file: "pages/index.vue",
    handlers: [],
    async script(ctx) {
      ctx.useHead({ meta });
      return {};
    },
    template: []
  });
}

async function renderHeadMeta(layoutMeta: Array<Record<string, string>>, pageMeta: Array<Record<string, string>>) {
  const app = defineComponent({
    id: "app",
    name: "App",
    file: "app.vue",
    handlers: [],
    async script() {
      return {};
    },
    template: [
      {
        type: "element",
        tag: "ResuxLayout",
        attrs: [],
        events: [],
        children: [{ type: "element", tag: "ResuxPage", attrs: [], events: [], children: [] }]
      }
    ]
  });
  const result = await renderApp({
    app,
    page: makePage(pageMeta),
    route: { path: "/", params: {}, query: {} },
    layouts: { default: makeLayout(layoutMeta) }
  });
  return result.head.meta ?? [];
}

describe("head meta deduplication", () => {
  it("lets a page override a layout meta tag with the same name", async () => {
    const meta = await renderHeadMeta(
      [{ name: "description", content: "Layout description" }],
      [{ name: "description", content: "Page description" }]
    );
    expect(meta).toEqual([{ name: "description", content: "Page description" }]);
  });

  it("deduplicates og tags by property, case-insensitively", async () => {
    const meta = await renderHeadMeta(
      [{ property: "og:title", content: "Layout title" }],
      [{ property: "OG:Title", content: "Page title" }]
    );
    expect(meta).toEqual([{ property: "OG:Title", content: "Page title" }]);
  });

  it("deduplicates charset and keeps only the last", async () => {
    const meta = await renderHeadMeta(
      [{ charset: "iso-8859-1" }],
      [{ charset: "utf-8" }]
    );
    expect(meta).toEqual([{ charset: "utf-8" }]);
  });

  it("deduplicates http-equiv and treats httpEquiv as the same key", async () => {
    const meta = await renderHeadMeta(
      [{ "http-equiv": "refresh", content: "30" }],
      [{ httpEquiv: "Refresh", content: "60" } as Record<string, string>]
    );
    expect(meta).toEqual([{ httpEquiv: "Refresh", content: "60" }]);
  });

  it("keeps distinct tags and preserves relative order", async () => {
    const meta = await renderHeadMeta(
      [
        { name: "description", content: "Layout description" },
        { name: "keywords", content: "a,b" }
      ],
      [
        { name: "description", content: "Page description" },
        { name: "author", content: "Mahmoud" }
      ]
    );
    expect(meta).toEqual([
      { name: "keywords", content: "a,b" },
      { name: "description", content: "Page description" },
      { name: "author", content: "Mahmoud" }
    ]);
  });

  it("keeps repeated same-property tags from a single entry (og:image arrays)", async () => {
    const meta = await renderHeadMeta(
      [],
      [
        { property: "og:image", content: "/a.png" },
        { property: "og:image", content: "/b.png" }
      ]
    );
    expect(meta).toEqual([
      { property: "og:image", content: "/a.png" },
      { property: "og:image", content: "/b.png" }
    ]);
  });

  it("an override entry replaces ALL earlier same-key tags", async () => {
    const meta = await renderHeadMeta(
      [
        { property: "og:image", content: "/layout-a.png" },
        { property: "og:image", content: "/layout-b.png" }
      ],
      [{ property: "og:image", content: "/page.png" }]
    );
    expect(meta).toEqual([{ property: "og:image", content: "/page.png" }]);
  });

  it("keeps meta tags without a unique key untouched", async () => {
    const meta = await renderHeadMeta(
      [{ content: "keyless one" }],
      [{ content: "keyless two" }]
    );
    expect(meta).toEqual([{ content: "keyless one" }, { content: "keyless two" }]);
  });

  it("renders a single tag in the document head for overridden meta", async () => {
    const app = defineComponent({
      id: "app",
      name: "App",
      file: "app.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxLayout",
          attrs: [],
          events: [],
          children: [{ type: "element", tag: "ResuxPage", attrs: [], events: [], children: [] }]
        }
      ]
    });
    const result = await renderApp({
      app,
      page: makePage([{ property: "og:title", content: "Page title" }]),
      route: { path: "/", params: {}, query: {} },
      layouts: { default: makeLayout([{ property: "og:title", content: "Layout title" }]) }
    });
    const html = renderDocument(result);
    const matches = html.match(/og:title/g) ?? [];
    expect(matches.length).toBe(1);
    expect(html).toContain("Page title");
    expect(html).not.toContain("Layout title");
  });
});
