import { describe, expect, it } from "vitest";
import { createResuxHooks } from "../src/core/hooks.js";
import { renderDocument, renderDocumentAsync } from "../src/runtime/index.js";

describe("bug 3: render:html hook for transforming HTML response", () => {
  it("allows modifying head, bodyPrepend, body, and bodyAppend via render:html hook", async () => {
    const hooks = createResuxHooks();

    hooks.hook("render:html", (ctx) => {
      ctx.head.push('<meta name="injected-by-hook" content="true">');
      ctx.bodyPrepend.push('<div id="top-banner">Notice</div>');
      ctx.bodyAppend.push('<script src="/analytics.js"></script>');
      ctx.body = ctx.body.map((part) => part.replace("Hello World", "Hello Transformed World"));
      ctx.htmlAttrs.push('data-theme="dark"');
      ctx.bodyAttrs.push('class="custom-body"');
    });

    const result = {
      html: "<main>Hello World</main>",
      payload: { route: { path: "/", params: {}, query: {} }, scopes: {}, modules: {}, config: {} },
      head: { title: "Hook Test" }
    };

    const doc = await renderDocumentAsync(result as any, "Hook Test", { hooks });

    expect(doc).toContain('<meta name="injected-by-hook" content="true">');
    expect(doc).toContain('<div id="top-banner">Notice</div>');
    expect(doc).toContain('<script src="/analytics.js"></script>');
    expect(doc).toContain("Hello Transformed World");
    expect(doc).not.toContain("<main>Hello World</main>");
    expect(doc).toContain('data-theme="dark"');
    expect(doc).toContain('class="custom-body"');

    // Verify ordering: bodyPrepend before body, and body before bodyAppend
    const bannerIdx = doc.indexOf('<div id="top-banner">Notice</div>');
    const mainIdx = doc.indexOf("Hello Transformed World");
    const scriptIdx = doc.indexOf('<script src="/analytics.js"></script>');
    const bodyCloseIdx = doc.indexOf("</body>");

    expect(bannerIdx).toBeGreaterThan(-1);
    expect(mainIdx).toBeGreaterThan(bannerIdx);
    expect(scriptIdx).toBeGreaterThan(mainIdx);
    expect(bodyCloseIdx).toBeGreaterThan(scriptIdx);
  });
});
