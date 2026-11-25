import { describe, expect, it } from "vitest";
import { renderDocument } from "../src/runtime/index.js";

describe("bug 4: critical meta order in head", () => {
  it("renders charset first, http-equiv second, and viewport third before links and styles", () => {
    const result = {
      html: "<div>Page</div>",
      payload: { route: { path: "/", params: {}, query: {} }, scopes: {}, modules: {}, config: {} },
      head: {
        title: "Ordering Test",
        meta: [
          { name: "description", content: "A test description" },
          { name: "viewport", content: "width=device-width, initial-scale=1" },
          { "http-equiv": "Content-Security-Policy", content: "default-src 'self'" },
          { charset: "utf-8" },
          { "http-equiv": "X-UA-Compatible", content: "IE=edge" },
        ],
        link: [
          { rel: "preload", href: "/hero.jpg", as: "image" },
          { rel: "stylesheet", href: "/app.css" },
        ],
        style: [
          { id: "custom", textContent: "body { margin: 0; }" }
        ],
        script: [
          { src: "/app.js", defer: true }
        ]
      }
    };

    const doc = renderDocument(result as any, "Ordering Test");
    const headStart = doc.indexOf("<head>") + "<head>".length;
    const headEnd = doc.indexOf("</head>");
    const headContent = doc.slice(headStart, headEnd);

    const charsetIdx = headContent.indexOf('charset="utf-8"');
    const cspIdx = headContent.indexOf('http-equiv="Content-Security-Policy"');
    const xUaIdx = headContent.indexOf('http-equiv="X-UA-Compatible"');
    const viewportIdx = headContent.indexOf('name="viewport"');
    const titleIdx = headContent.indexOf("<title>Ordering Test</title>");
    const linkIdx = headContent.indexOf('href="/hero.jpg"');
    const styleIdx = headContent.indexOf('href="/app.css"');
    const scriptIdx = headContent.indexOf('src="/app.js"');

    // Charset must be first
    expect(charsetIdx).toBeGreaterThan(-1);
    expect(cspIdx).toBeGreaterThan(charsetIdx);
    expect(xUaIdx).toBeGreaterThan(charsetIdx);

    // http-equiv must come before viewport
    expect(viewportIdx).toBeGreaterThan(cspIdx);
    expect(viewportIdx).toBeGreaterThan(xUaIdx);

    // Viewport must come before title and links/styles/scripts
    expect(titleIdx).toBeGreaterThan(viewportIdx);
    expect(linkIdx).toBeGreaterThan(titleIdx);
    expect(styleIdx).toBeGreaterThan(linkIdx);
    expect(scriptIdx).toBeGreaterThan(styleIdx);

    // Snapshot match
    expect(headContent).toMatchSnapshot();
  });
});
