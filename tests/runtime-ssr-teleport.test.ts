import path from "node:path";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { defineComponent, renderApp, renderDocument, type ComponentDefinition } from "resuxjs/runtime";
import { createClientComponentRuntimeFixture, createClientRuntimeFixture, installClientRuntimeFixture, managedTeleportCommentRecords, managedTeleportSourceComment, nextRuntimeImportQuery, renderRuntimePage, resetClientRuntimeFixture, script, waitForCondition } from "./helpers/runtime-fixtures.js";

describe("runtime SSR: teleport", () => {
  it("renders Teleport as a managed boundary and provides the Nuxt-compatible target", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-teleport-ssr-adoption",
      () => "export default {};",
    );
    const page: ComponentDefinition = defineComponent({
      id: "m-teleport-ssr",
      name: "TeleportSsrPage",
      file: "TeleportSsrPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "teleport",
          attrs: [
            { kind: "static", name: "to", value: "#teleports" },
            { kind: "static", name: "disabled", value: "" },
          ],
          events: [],
          children: [{
            type: "element",
            tag: "div",
            attrs: [{ kind: "static", name: "id", value: "inline-overlay" }],
            events: [],
            children: [{ type: "text", value: "Inline" }],
          }],
        },
        {
          type: "element",
          tag: "teleport",
          attrs: [{ kind: "static", name: "to", value: "#teleports" }],
          events: [],
          children: [{
            type: "element",
            tag: "div",
            attrs: [{ kind: "static", name: "id", value: "overlay" }],
            events: [],
            children: [{ type: "text", value: "Overlay" }],
          }],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} },
    });
    const documentHtml = renderDocument(result);

    expect(result.html).toContain("<!--resux-teleport-source:");
    expect(result.html).not.toContain("<teleport");
    const parsed = new Window({ url: "http://localhost/" });
    parsed.document.body.innerHTML = result.html;
    const sources = managedTeleportCommentRecords(parsed.document.body);
    expect(sources[0]?.metadata.disabled).toBe(true);
    expect(result.html).toContain('id="inline-overlay"');
    const source = sources[1];
    expect(source?.metadata.to).toBe("#teleports");
    expect(source?.metadata.html).toContain('id="overlay"');
    expect(source?.metadata.ssrKey).toBe("t0");
    expect(result.teleports?.["#teleports"]).toContain("<!--resux-teleport-start:t0-->");
    expect(result.teleports?.["#teleports"]).toContain('<div id="overlay">Overlay</div>');
    expect(result.teleports?.["#teleports"]).toContain("<!--resux-teleport-end:t0-->");
    expect(documentHtml).toContain(
      '<div id="teleports" data-rx-teleport-fallback="true"><!--resux-teleport-start:t0--><div id="overlay">Overlay</div><!--resux-teleport-end:t0--></div>',
    );
    expect(documentHtml).toContain('<script type="module" src="/__resux/runtime-client.mjs"></script>');

    for (const appOwnedTargetHtml of [
      '<section id="teleports"><span id="explicit-target-existing">Existing</span></section>',
      '<textarea id="teleports"></textarea>',
      '<template><section id="teleports"></section></template>',
      '<iframe><div id="teleports"></div></iframe>',
      '<table id="teleports"><tr><td>App table</td></tr></table>',
    ]) {
      const dedicatedTargetDocumentHtml = renderDocument({
        ...result,
        html: result.html + appOwnedTargetHtml,
      });
      const dedicatedTargetWindow = new Window({ url: "http://localhost/" });
      dedicatedTargetWindow.document.body.innerHTML =
        /<body[^>]*>([\s\S]*?)<\/body>/.exec(dedicatedTargetDocumentHtml)?.[1] ?? "";
      const frameworkTarget = dedicatedTargetWindow.document.querySelector(
        "[data-rx-teleport-fallback='true'][id='teleports']",
      ) as HTMLElement;
      expect(frameworkTarget).toBeTruthy();
      expect(frameworkTarget.localName).toBe("div");
      expect(frameworkTarget.querySelectorAll("#overlay")).toHaveLength(1);
      const explicitExisting = dedicatedTargetWindow.document.querySelector("#explicit-target-existing");
      if (explicitExisting) {
        const appSection = explicitExisting.parentElement;
        expect(appSection?.matches("section#teleports")).toBe(true);
        expect(appSection?.querySelector("#overlay")).toBeNull();
      }
    }

    const body = /<body[^>]*>([\s\S]*?)<\/body>/.exec(documentHtml)?.[1];
    expect(body).toBeTruthy();
    parsed.document.body.innerHTML = body!;
    const target = parsed.document.getElementById("teleports")!;
    expect(target.querySelectorAll("#overlay")).toHaveLength(1);

    installClientRuntimeFixture(parsed, {}, handlerUrl);
    try {
      await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());
      await waitForCondition(() => Boolean(target.querySelector("#overlay")));
      expect(target.querySelectorAll("#overlay")).toHaveLength(1);
      expect(target.querySelector("#inline-overlay")).toBeNull();
      expect(Array.from(target.childNodes).indexOf(target.querySelector("#overlay")!)).toBeGreaterThan(1);
    } finally {
      resetClientRuntimeFixture();
    }

    const keyedFixture = await createClientComponentRuntimeFixture({
      prefix: "resux-keyed-ssr-teleport",
      componentName: "KeyedSsrTeleport",
      template: [
        { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "move" }], children: [] },
        { type: "element", tag: "teleport", attrs: [{ kind: "dynamic", name: "to", value: "target.value", bindingId: "b0" }], events: [], children: [
          { type: "element", tag: "teleport", attrs: [{ kind: "static", name: "to", value: "#teleports" }], events: [], children: [
            { type: "element", tag: "span", attrs: [{ kind: "static", name: "id", value: "nested-keyed-content" }], events: [], children: [{ type: "text", value: "Nested" }] }
          ] },
          { type: "element", tag: "span", attrs: [{ kind: "static", name: "id", value: "outer-keyed-tail" }], events: [], children: [{ type: "text", value: "Tail" }] }
        ] },
      ],
      scriptSource: `
async function script(ctx) {
  const target = ctx.useState("target", () => "#teleports");
  function move() { target.value = "#keyed-other-target"; }
  return { target, move };
}`,
      handlers: ["move"],
    });
    const nestedKeyedSource = managedTeleportSourceComment({
      to: "#teleports",
      disabled: false,
      defer: false,
      html: '<span id="nested-keyed-content">Nested</span>',
      ssrKey: "t1",
    });
    const outerKeyedSource = managedTeleportSourceComment({
      to: "#teleports",
      disabled: false,
      defer: false,
      bindings: { b0: "s0:b0" },
      html: nestedKeyedSource + '<span id="outer-keyed-tail">Tail</span>',
      ssrKey: "t0",
    });
    const keyedWindow = new Window({ url: "http://localhost/" });
    keyedWindow.document.body.innerHTML =
      '<div id="teleports"><!--resux-teleport-start:t0-->' + nestedKeyedSource
      + '<span id="outer-keyed-tail">Tail</span><!--resux-teleport-end:t0-->'
      + '<!--resux-teleport-start:t1--><span id="nested-keyed-content">Nested</span><!--resux-teleport-end:t1--></div>'
      + '<div id="__resux"><button id="move-keyed-outer" data-rx-on-click="s0:m0:move"></button>'
      + outerKeyedSource + '</div><div id="keyed-other-target"></div>';

    installClientRuntimeFixture(keyedWindow, { target: "#teleports" }, keyedFixture.handlerUrl);
    try {
      await import(keyedFixture.runtimeUrl + "?test=" + nextRuntimeImportQuery());
      const keyedTarget = keyedWindow.document.getElementById("teleports")!;
      await waitForCondition(() => Boolean(keyedTarget.querySelector("#nested-keyed-content")));
      expect(keyedTarget.querySelectorAll("#nested-keyed-content")).toHaveLength(1);
      expect(keyedTarget.querySelectorAll("#outer-keyed-tail")).toHaveLength(1);
      keyedWindow.document.getElementById("move-keyed-outer")!.dispatchEvent(
        new keyedWindow.MouseEvent("click", { bubbles: true, button: 0 }),
      );
      const otherTarget = keyedWindow.document.getElementById("keyed-other-target")!;
      await waitForCondition(() => Boolean(otherTarget.querySelector("#outer-keyed-tail")));
      expect(otherTarget.querySelector("#outer-keyed-tail")?.textContent).toBe("Tail");
      expect(keyedTarget.querySelector("#outer-keyed-tail")).toBeNull();
      expect(keyedTarget.querySelector("#nested-keyed-content")?.textContent).toBe("Nested");
    } finally {
      resetClientRuntimeFixture();
    }
  });

  it("does not commit nested #teleports SSR content while an enabled outer Teleport is client-only", async () => {
    const page: ComponentDefinition = defineComponent({
      id: "m-teleport-nested-client-only-ssr",
      name: "NestedClientOnlyTeleportSsrPage",
      file: "NestedClientOnlyTeleportSsrPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [{
        type: "element",
        tag: "teleport",
        attrs: [{ kind: "static", name: "to", value: "#missing-custom-target" }],
        events: [],
        children: [{
          type: "element",
          tag: "teleport",
          attrs: [{ kind: "static", name: "to", value: "#teleports" }],
          events: [],
          children: [{
            type: "element",
            tag: "div",
            attrs: [{ kind: "static", name: "id", value: "nested-client-only-ssr-content" }],
            events: [],
            children: [{ type: "text", value: "Nested" }],
          }],
        }],
      }],
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} },
    });
    const parsed = new Window({ url: "http://localhost/" });
    parsed.document.body.innerHTML = result.html;
    const outerSource = managedTeleportCommentRecords(parsed.document.body)[0];
    expect(outerSource?.metadata.to).toBe("#missing-custom-target");
    expect(outerSource?.metadata.html).toContain("resux-teleport-source");
    const nestedParsed = new Window({ url: "http://localhost/" });
    nestedParsed.document.body.innerHTML = outerSource?.metadata.html ?? "";
    const nestedSource = managedTeleportCommentRecords(nestedParsed.document.body)[0];
    expect(nestedSource?.metadata.html).toContain('id="nested-client-only-ssr-content"');
    expect(result.teleports?.["#teleports"] ?? "").not.toContain("nested-client-only-ssr-content");
    expect(renderDocument(result)).not.toMatch(
      /data-rx-teleport-fallback="true"[\s\S]*nested-client-only-ssr-content/,
    );
  });

  it("propagates client-only Teleport reservation suppression across render boundaries", async () => {
    const nestedTeleportTemplate = (contentId: string): ComponentDefinition["template"] => [{
      type: "element",
      tag: "teleport",
      attrs: [{ kind: "static", name: "to", value: "#teleports" }],
      events: [],
      children: [{
        type: "element",
        tag: "div",
        attrs: [{ kind: "static", name: "id", value: contentId }],
        events: [],
        children: [{ type: "text", value: "Nested" }],
      }],
    }];
    const expectSuppressed = (
      result: Awaited<ReturnType<typeof renderApp>>,
      outerTarget: string,
      contentId: string,
    ) => {
      const parsed = new Window({ url: "http://localhost/" });
      parsed.document.body.innerHTML = result.html;
      const outerSource = managedTeleportCommentRecords(parsed.document.body)[0];
      expect(outerSource?.metadata.to).toBe(outerTarget);
      expect(outerSource?.metadata.html).toContain("resux-teleport-source");
      const nestedParsed = new Window({ url: "http://localhost/" });
      nestedParsed.document.body.innerHTML = outerSource?.metadata.html ?? "";
      const nestedSource = managedTeleportCommentRecords(nestedParsed.document.body)[0];
      expect(nestedSource?.metadata.html).toContain(`id="${contentId}"`);
      expect(result.teleports?.["#teleports"] ?? "").not.toContain(contentId);
      expect(renderDocument(result)).not.toMatch(
        new RegExp(`data-rx-teleport-fallback="true"[\\s\\S]*${contentId}`),
      );
    };

    const nestedChild = defineComponent({
      id: "m-teleport-component-child",
      name: "NestedTeleportChild",
      file: "NestedTeleportChild.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: nestedTeleportTemplate("nested-component-client-only-ssr"),
    });
    const componentPage = defineComponent({
      id: "m-teleport-component-parent",
      name: "TeleportComponentParentPage",
      file: "TeleportComponentParentPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [{
        type: "element",
        tag: "teleport",
        attrs: [{ kind: "static", name: "to", value: "#missing-component-target" }],
        events: [],
        children: [{
          type: "element",
          tag: "NestedTeleportChild",
          attrs: [],
          events: [],
          children: [],
        }],
      }],
    });
    const componentResult = await renderApp({
      page: componentPage,
      route: { path: "/", params: {}, query: {} },
      components: { NestedTeleportChild: nestedChild },
    });
    expectSuppressed(
      componentResult,
      "#missing-component-target",
      "nested-component-client-only-ssr",
    );

    const slotShell = defineComponent({
      id: "m-teleport-slot-shell",
      name: "TeleportSlotShell",
      file: "TeleportSlotShell.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [{
        type: "element",
        tag: "teleport",
        attrs: [{ kind: "static", name: "to", value: "#missing-slot-target" }],
        events: [],
        children: [{ type: "element", tag: "slot", attrs: [], events: [], children: [] }],
      }],
    });
    const slotPage = defineComponent({
      id: "m-teleport-slot-parent",
      name: "TeleportSlotParentPage",
      file: "TeleportSlotParentPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [{
        type: "element",
        tag: "TeleportSlotShell",
        attrs: [],
        events: [],
        children: nestedTeleportTemplate("nested-slot-client-only-ssr"),
      }],
    });
    const slotResult = await renderApp({
      page: slotPage,
      route: { path: "/", params: {}, query: {} },
      components: { TeleportSlotShell: slotShell },
    });
    expectSuppressed(
      slotResult,
      "#missing-slot-target",
      "nested-slot-client-only-ssr",
    );

    const app = defineComponent({
      id: "m-teleport-app-boundary",
      name: "TeleportBoundaryApp",
      file: "app.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [{
        type: "element",
        tag: "teleport",
        attrs: [{ kind: "static", name: "to", value: "#missing-app-target" }],
        events: [],
        children: [{
          type: "element",
          tag: "ResuxLayout",
          attrs: [],
          events: [],
          children: [{ type: "element", tag: "ResuxPage", attrs: [], events: [], children: [] }],
        }],
      }],
    });
    const layout = defineComponent({
      id: "m-teleport-layout-boundary",
      name: "DefaultLayout",
      file: "layouts/default.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [{ type: "element", tag: "slot", attrs: [], events: [], children: [] }],
    });
    const boundaryPage = defineComponent({
      id: "m-teleport-page-boundary",
      name: "TeleportBoundaryPage",
      file: "pages/index.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: nestedTeleportTemplate("nested-page-layout-client-only-ssr"),
    });
    const boundaryResult = await renderApp({
      app,
      page: boundaryPage,
      route: { path: "/", params: {}, query: {} },
      layouts: { default: layout },
    });
    expectSuppressed(
      boundaryResult,
      "#missing-app-target",
      "nested-page-layout-client-only-ssr",
    );
  });

  it("renders parser-safe Teleport markers inside select and table contexts", async () => {
    const page: ComponentDefinition = defineComponent({
      id: "m-teleport-parser-safe",
      name: "TeleportParserSafePage",
      file: "TeleportParserSafePage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "select",
          attrs: [{ kind: "static", name: "id", value: "teleport-select" }],
          events: [],
          children: [{
            type: "element",
            tag: "teleport",
            attrs: [{ kind: "static", name: "to", value: "#select-target" }],
            events: [],
            children: [{
              type: "element",
              tag: "option",
              attrs: [{ kind: "static", name: "id", value: "teleported-option" }],
              events: [],
              children: [{ type: "text", value: "Option" }],
            }],
          }],
        },
        {
          type: "element",
          tag: "table",
          attrs: [],
          events: [],
          children: [{
            type: "element",
            tag: "tbody",
            attrs: [{ kind: "static", name: "id", value: "teleport-body" }],
            events: [],
            children: [{
              type: "element",
              tag: "teleport",
              attrs: [{ kind: "static", name: "to", value: "#table-target" }],
              events: [],
              children: [{
                type: "element",
                tag: "tr",
                attrs: [{ kind: "static", name: "id", value: "teleported-row" }],
                events: [],
                children: [{
                  type: "element",
                  tag: "td",
                  attrs: [],
                  events: [],
                  children: [{ type: "text", value: "Row" }],
                }],
              }],
            }],
          }],
        },
      ],
    });

    const { result, parsed } = await renderRuntimePage(page);

    const select = parsed.document.getElementById("teleport-select")!;
    const tableBody = parsed.document.getElementById("teleport-body")!;
    const selectSource = managedTeleportCommentRecords(select)[0];
    const tableSource = managedTeleportCommentRecords(tableBody)[0];

    expect(selectSource?.metadata.to).toBe("#select-target");
    expect(selectSource?.metadata.html).toContain('id="teleported-option"');
    expect(tableSource?.metadata.to).toBe("#table-target");
    expect(tableSource?.metadata.html).toContain('id="teleported-row"');
    expect(result.html).not.toContain("<span data-rx-teleport-source");
    expect(result.html).not.toContain("<template data-rx-teleport-source");
    expect(renderDocument(result).match(/id="teleports"/g)).toHaveLength(1);
    const dataIdOnlyHtml = result.html
      .replace('id="teleports"', 'id="not-teleports"')
      + '<div data-id="teleports"></div>';
    expect(renderDocument({ ...result, html: dataIdOnlyHtml }))
      .toContain('<div id="teleports" data-rx-teleport-fallback="true"></div>');
  });

  it("preserves Teleport row identity between equivalent table-section targets", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-teleport-table-context",
      (runtimeUrl) => `import { createClientComponent } from ${JSON.stringify(runtimeUrl)};
const template = [
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "move" }], children: [] },
  { type: "element", tag: "teleport", attrs: [{ kind: "dynamic", name: "to", value: "target.value", bindingId: "b0" }], events: [], children: [
    { type: "element", tag: "tr", attrs: [{ kind: "static", name: "id", value: "teleported-row" }], events: [], children: [
      { type: "element", tag: "td", attrs: [], events: [], children: [{ type: "text", value: "Row" }] }
    ] }
  ] }
];
async function script(ctx) {
  const target = ctx.useState("target", () => "#table-target");
  function move() { target.value = "#tbody-target"; }
  return { target, move };
}
export default createClientComponent({ id: "m0", name: "TableTeleport", file: "TableTeleport.vue", script, template, handlers: ["move"] });
`,
    );
    const source = managedTeleportSourceComment({
      to: "#table-target",
      disabled: false,
      defer: false,
      bindings: { to: "s0:b0" },
      html: '<tr id="teleported-row"><td>Row</td></tr>',
    });
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux"><button id="move-table" data-rx-on-click="s0:m0:move"></button>${source}</div>
      <table><thead id="table-target"></thead><tfoot id="tbody-target"></tfoot></table>
    `;

    installClientRuntimeFixture(window, { target: "#table-target" }, handlerUrl);
    try {
      await import(`${runtimeUrl}?test=${nextRuntimeImportQuery()}`);
      await waitForCondition(() => Boolean(window.document.getElementById("table-target")?.querySelector("#teleported-row")));
      const row = window.document.getElementById("table-target")!.querySelector("#teleported-row");
      window.document.getElementById("move-table")!.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, button: 0 }),
      );
      const target = window.document.getElementById("tbody-target")!;
      await waitForCondition(() => Boolean(target.querySelector("#teleported-row")));
      const movedRow = target.querySelector("#teleported-row");
      expect(movedRow).toBe(row);
      expect(movedRow?.localName).toBe("tr");
      expect(movedRow?.parentElement).toBe(target);
    } finally {
      resetClientRuntimeFixture();
    }

    const nestedSource = managedTeleportSourceComment({
      to: "#inner-table-target",
      disabled: false,
      defer: false,
      html: '<span id="inner-table-content">Inner</span>',
    });
    const tableSource = managedTeleportSourceComment({
      to: "#table-target",
      disabled: false,
      defer: false,
      bindings: { to: "s0:b0" },
      html: nestedSource + '<tr id="wrapped-row"><td>Wrapped</td></tr>',
    });
    const markerWindow = new Window({ url: "http://localhost/" });
    markerWindow.document.body.innerHTML =
      '<div id="__resux"><button id="move-table" data-rx-on-click="s0:m0:move"></button>'
      + tableSource + '</div><table id="table-target"></table>'
      + '<table><tbody id="tbody-target"></tbody></table><div id="inner-table-target"></div>';

    installClientRuntimeFixture(markerWindow, { target: "#table-target" }, handlerUrl);
    try {
      await import(`${runtimeUrl}?test=${nextRuntimeImportQuery()}`);
      await waitForCondition(() => Boolean(markerWindow.document.getElementById("table-target")?.querySelector("#wrapped-row")));
      markerWindow.document.getElementById("move-table")!.dispatchEvent(
        new markerWindow.MouseEvent("click", { bubbles: true, button: 0 }),
      );
      const tbodyTarget = markerWindow.document.getElementById("tbody-target")!;
      await waitForCondition(() => Boolean(tbodyTarget.querySelector("#wrapped-row")));
      expect(tbodyTarget.querySelector("#wrapped-row")?.parentElement).toBe(tbodyTarget);
      expect(tbodyTarget.querySelector("tbody")).toBeNull();
      expect(markerWindow.document.getElementById("inner-table-target")?.querySelector("#inner-table-content")).toBeTruthy();
    } finally {
      resetClientRuntimeFixture();
    }
  });

  it("applies Vue Boolean semantics to static and bound Teleport disabled props during SSR", async () => {
    const page: ComponentDefinition = defineComponent({
      id: "m-teleport-boolean-ssr",
      name: "TeleportBooleanSsrPage",
      file: "TeleportBooleanSsrPage.vue",
      handlers: [],
      async script(ctx) {
        const truthy = ctx.useState("truthy", () => 1);
        const falsy = ctx.useState("falsy", () => 0);
        return { truthy, falsy };
      },
      template: [
        {
          type: "element",
          tag: "teleport",
          attrs: [
            { kind: "static", name: "to", value: "#static-disabled" },
            { kind: "static", name: "disabled", value: "disabled" },
          ],
          events: [],
          children: [{ type: "element", tag: "div", attrs: [], events: [], children: [{ type: "text", value: "Static" }] }],
        },
        {
          type: "element",
          tag: "teleport",
          attrs: [
            { kind: "static", name: "to", value: "#truthy-disabled" },
            { kind: "dynamic", name: "disabled", value: "truthy.value", bindingId: "b-truthy-disabled" },
          ],
          events: [],
          children: [{ type: "element", tag: "div", attrs: [], events: [], children: [{ type: "text", value: "Truthy" }] }],
        },
        {
          type: "element",
          tag: "teleport",
          attrs: [
            { kind: "static", name: "to", value: "#falsy-disabled" },
            { kind: "dynamic", name: "disabled", value: "falsy.value", bindingId: "b-falsy-disabled" },
          ],
          events: [],
          children: [{ type: "element", tag: "div", attrs: [], events: [], children: [{ type: "text", value: "Falsy" }] }],
        },
      ],
    });

    const { result, parsed } = await renderRuntimePage(page);

    const records = managedTeleportCommentRecords(parsed.document.body);
    const staticSource = records.find((record) => record.metadata.to === "#static-disabled");
    const truthySource = records.find((record) => record.metadata.to === "#truthy-disabled");
    const falsySource = records.find((record) => record.metadata.to === "#falsy-disabled");

    expect(staticSource?.metadata.disabled).toBe(true);
    expect(truthySource?.metadata.disabled).toBe(true);
    expect(falsySource?.metadata.disabled).toBe(false);
  });
});
