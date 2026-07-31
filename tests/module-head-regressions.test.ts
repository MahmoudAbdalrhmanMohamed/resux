import { describe, expect, it } from "vitest";
import { createResuxHooks } from "../src/core/hooks.js";
import { ResuxModuleContainer } from "../src/core/module-container.js";
import fontsModule from "../src/fonts/index.js";

describe("module head composition regressions", () => {
  it("merges script, style, link, metadata, and document attributes", () => {
    const config: Record<string, any> = {};
    const container = new ResuxModuleContainer();
    const context = container.createContext(
      config,
      "/workspace/project",
      "/workspace/project/.resux",
      createResuxHooks(),
    );

    context.addHead({
      meta: [{ name: "first", content: "1" }],
      link: [{ rel: "first", href: "/first.css" }],
      style: [{ innerHTML: ".first{}" }],
      script: [{ innerHTML: "first()" }],
      noscript: [{ innerHTML: "first" }],
      htmlAttrs: { lang: "en", dir: "ltr" },
      bodyAttrs: { class: "first" },
    });
    context.addHead({
      meta: [{ name: "second", content: "2" }],
      link: [{ rel: "second", href: "/second.css" }],
      style: [{ innerHTML: ".second{}" }],
      script: [{ innerHTML: "second()" }],
      noscript: [{ innerHTML: "second" }],
      htmlAttrs: { dir: "rtl" },
      bodyAttrs: { id: "app" },
    });

    expect(config.app.head.meta).toHaveLength(2);
    expect(config.app.head.link).toHaveLength(2);
    expect(config.app.head.style).toHaveLength(2);
    expect(config.app.head.script).toHaveLength(2);
    expect(config.app.head.noscript).toHaveLength(2);
    expect(config.app.head.htmlAttrs).toEqual({ lang: "en", dir: "rtl" });
    expect(config.app.head.bodyAttrs).toEqual({ class: "first", id: "app" });
  });

  it("serializes lazy font URLs safely inside the loader script", () => {
    const addedHeads: Array<Record<string, any>> = [];
    fontsModule.setup({
      google: [{
        name: "Unsafe ' Font </script><script>alert(1)</script>",
        weights: [400, "100..900", "invalid"],
        strategy: "lazy",
      }],
      preconnect: false,
      strategy: "lazy",
      deferUntilPageLoad: true,
    }, {
      addHead(head: Record<string, any>) {
        addedHeads.push(head);
      },
      extendRuntimeConfig() {},
    } as any);

    const script = addedHeads[0].script[0].innerHTML as string;
    const href = addedHeads[0].link[0].href as string;

    expect(href).toContain("family=");
    expect(href).not.toContain("</script>");
    expect(script).toContain(JSON.stringify(href));
    expect(script).not.toContain("l.href='https://");
    expect(href).not.toContain("invalid");
  });
});
