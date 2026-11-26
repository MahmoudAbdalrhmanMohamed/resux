import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Window } from "happy-dom";
import { describe, expect, it, vi } from "vitest";
import { clickRuntimeFixture, createClientComponentRuntimeFixture, createClientRuntimeFixture, createDynamicTeleportRuntimeFixture, installClientRuntimeFixture, managedTeleportBindingSourceComment, managedTeleportCommentRecords, managedTeleportSourceComment, nextRuntimeImportQuery, resetClientRuntimeFixture, script, waitForCondition, waitForHtml } from "./helpers/runtime-fixtures.js";

describe("client resume loader: teleport and transitions", () => {
  it("moves teleported transition content to #teleports and keeps resumed handlers reactive", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-teleport",
      (runtimeUrl) => `import { createClientComponent } from ${JSON.stringify(runtimeUrl)};
const template = [
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "toggle" }], children: [{ type: "text", value: "Toggle" }] },
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "move" }], children: [{ type: "text", value: "Move" }] },
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "toggleDisabled" }], children: [{ type: "text", value: "Placement" }] },
  { type: "element", tag: "teleport", attrs: [
    { kind: "dynamic", name: "to", value: "target.value", bindingId: "b2" },
    { kind: "dynamic", name: "disabled", value: "disabled.value", bindingId: "b3" }
  ], events: [], children: [
    { type: "element", tag: "svg", attrs: [{ kind: "static", name: "id", value: "teleported-icon" }], events: [], children: [] },
    { type: "element", tag: "transition", attrs: [{ kind: "static", name: "name", value: "fade" }], events: [], children: [
      { type: "element", tag: "div", attrs: [], events: [], if: { expression: "visible.value", blockId: "b0" }, children: [
        { type: "element", tag: "button", attrs: [{ kind: "static", name: "id", value: "teleported-action" }], events: [{ name: "click", handler: "ping" }], children: [
          { type: "interpolation", expression: "hits.value", bindingId: "b1" }
        ] }
      ] }
    ] }
  ] }
];
async function script(ctx) {
  const visible = ctx.useState("visible", () => false);
  const hits = ctx.useState("hits", () => 0);
  const target = ctx.useState("target", () => "#teleports");
  const disabled = ctx.useState("disabled", () => false);
  function toggle() { visible.value = !visible.value; }
  function ping() { hits.value += 1; }
  function move() { target.value = target.value === "#teleports" ? "#alternate-teleports" : "#teleports"; }
  function toggleDisabled() { disabled.value = disabled.value === false ? 1 : false; }
  return { visible, hits, target, disabled, toggle, ping, move, toggleDisabled };
}
export default createClientComponent({ id: "m0", name: "TeleportPanel", file: "TeleportPanel.vue", script, template, handlers: ["toggle", "ping", "move", "toggleDisabled"] });
`,
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.head.innerHTML = `<style>
      .fade-enter-active,.fade-leave-active{transition:opacity .04s linear}
      .fade-enter-from,.fade-leave-to{opacity:0}
    </style>`;
    window.document.body.innerHTML = `
      <div id="__resux">
        <button id="toggle" data-rx-on-click="s0:m0:toggle">Toggle</button>
        <button id="move" data-rx-on-click="s0:m0:move">Move</button>
        <button id="placement" data-rx-on-click="s0:m0:toggleDisabled">Placement</button>
        <span
          data-rx-teleport-source="true"
          data-rx-teleport-to="#teleports"
          data-rx-attr-b2="s0:b2"
          data-rx-attr-b3="s0:b3"
          style="display: contents;"
        >
          <svg id="teleported-icon"></svg>
          <span data-rx-transition="fade" data-rx-block="s0:b0" style="display: contents;"></span>
        </span>
      </div>
      <div id="teleports"></div>
      <div id="alternate-teleports"></div>
    `;

    installClientRuntimeFixture(
      window,
      { visible: false, hits: 0, target: "#teleports", disabled: false },
      handlerUrl,
    );
    let pageFinishCount = 0;
    window.document.addEventListener("resux:page:finish", () => { pageFinishCount += 1; });
    await import(`${runtimeUrl}?test=${nextRuntimeImportQuery()}`);
    expect(pageFinishCount).toBe(1);

    const source = window.document.querySelector("[data-rx-teleport-source='true']") as HTMLElement;
    const target = window.document.getElementById("teleports")!;
    await waitForCondition(() => Boolean(target.querySelector("[data-rx-transition='fade']")));
    const teleportedIcon = target.querySelector("#teleported-icon");
    expect(teleportedIcon?.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(source.childNodes).toHaveLength(0);
    expect(target.firstElementChild).toBe(teleportedIcon);
    expect(target.querySelector("[data-rx-transition='fade']")?.getAttribute("data-rx-transition")).toBe("fade");
    expect(target.querySelector("[data-rx-teleport-content='true']")).toBeNull();

    window.document.getElementById("toggle")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );
    await waitForCondition(() => Boolean(window.document.getElementById("teleported-action")));
    expect(target.querySelector("#teleported-icon")).toBe(teleportedIcon);

    const action = window.document.getElementById("teleported-action")!;
    expect(target.contains(action)).toBe(true);
    expect(action.getAttribute("data-rx-on-click")).toBe("s0:m0:ping");
    action.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForCondition(() => window.document.querySelector('[data-rx-text="s0:b1"]')?.textContent === "1");
    expect((globalThis as any).__RESUX__.scopes.s0.state.hits).toBe(1);
    expect(window.document.querySelector('[data-rx-text="s0:b1"]')?.textContent).toBe("1");

    window.document.getElementById("toggle")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );
    await waitForCondition(() => !window.document.getElementById("teleported-action"), 500);
    expect(window.document.getElementById("teleported-action")).toBeNull();

    window.document.getElementById("move")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );
    const alternateTarget = window.document.getElementById("alternate-teleports")!;
    await waitForCondition(() => Boolean(alternateTarget.querySelector("[data-rx-transition='fade']")));
    expect(alternateTarget.querySelector("#teleported-icon")).toBe(teleportedIcon);
    expect(alternateTarget.querySelector("[data-rx-transition='fade']")?.getAttribute("data-rx-transition")).toBe("fade");
    expect(target.querySelector("[data-rx-transition='fade']")).toBeNull();

    window.document.getElementById("placement")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );
    await waitForCondition(() => Boolean(source.querySelector("[data-rx-transition='fade']")));
    expect(alternateTarget.querySelector("[data-rx-transition='fade']")).toBeNull();
    expect(source.getAttribute("data-rx-teleport-disabled")).toBe("true");

    window.document.getElementById("placement")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );
    await waitForCondition(() => Boolean(alternateTarget.querySelector("[data-rx-transition='fade']")));
    expect(alternateTarget.firstElementChild).toBe(teleportedIcon);
    expect(alternateTarget.querySelector("[data-rx-transition='fade']")?.getAttribute("data-rx-transition")).toBe("fade");
    expect(source.childNodes).toHaveLength(0);
    expect(source.hasAttribute("data-rx-teleport-disabled")).toBe(false);
  });

  it("mounts Teleports before initial client middleware aborts", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-teleport-middleware-abort",
      () => 'export default () => { globalThis.__RESUX_TEST_MIDDLEWARE_RAN__ = true; return false; };',
    );
    const source = managedTeleportSourceComment({
      to: "#abort-target",
      disabled: false,
      defer: false,
      bindings: {},
      html: '<div id="abort-teleport">Visible</div>',
    });
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `<div id="__resux">${source}</div><div id="abort-target"></div>`;
    installClientRuntimeFixture(window, {}, handlerUrl);
    (globalThis as any).__RESUX_TEST_MIDDLEWARE_RAN__ = false;
    (globalThis as any).__RESUX__.middleware = [{
      id: "abort", name: "abort", file: "abort.ts", global: true, mode: "client", src: handlerUrl,
    }];

    try {
      await import(`${runtimeUrl}?test=${nextRuntimeImportQuery()}`);
      await waitForCondition(() => Boolean(window.document.getElementById("abort-target")?.querySelector("#abort-teleport")));
      await waitForCondition(() => (globalThis as any).__RESUX_TEST_MIDDLEWARE_RAN__ === true);
      expect((globalThis as any).__RESUX_TEST_MIDDLEWARE_RAN__).toBe(true);
      expect(window.document.getElementById("abort-target")?.querySelector("#abort-teleport")).toBeTruthy();
    } finally {
      delete (globalThis as any).__RESUX_TEST_MIDDLEWARE_RAN__;
    }
  });

  it("recursively cleans nested Teleports when their owning reactive block is removed", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-nested-teleport",
      (runtimeUrl) => `import { createClientComponent } from ${JSON.stringify(runtimeUrl)};
const template = [
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "toggle" }], children: [{ type: "text", value: "Toggle" }] },
  { type: "element", tag: "div", attrs: [], events: [], if: { expression: "show.value", blockId: "b0" }, children: [
    { type: "element", tag: "teleport", attrs: [{ kind: "static", name: "to", value: "#outer-target" }], events: [], children: [
      { type: "element", tag: "teleport", attrs: [{ kind: "static", name: "to", value: "#inner-target" }], events: [], children: [
        { type: "element", tag: "button", attrs: [{ kind: "static", name: "id", value: "nested-action" }], events: [{ name: "click", handler: "ping" }], children: [
          { type: "interpolation", expression: "hits.value", bindingId: "b1" }
        ] }
      ] }
    ] }
  ] }
];
async function script(ctx) {
  const show = ctx.useState("show", () => false);
  const hits = ctx.useState("hits", () => 0);
  function toggle() { show.value = !show.value; }
  function ping() { hits.value += 1; }
  return { show, hits, toggle, ping };
}
export default createClientComponent({ id: "m0", name: "NestedTeleport", file: "NestedTeleport.vue", script, template, handlers: ["toggle", "ping"] });
`,
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <button id="toggle-nested" data-rx-on-click="s0:m0:toggle">Toggle</button>
        <span data-rx-block="s0:b0" style="display: contents;"></span>
      </div>
      <div id="outer-target"></div>
      <div id="inner-target"></div>
    `;

    installClientRuntimeFixture(window, { show: false, hits: 0 }, handlerUrl);
    await import(`${runtimeUrl}?test=${nextRuntimeImportQuery()}`);

    const outerTarget = window.document.getElementById("outer-target")!;
    const innerTarget = window.document.getElementById("inner-target")!;
    const toggle = window.document.getElementById("toggle-nested")!;
    toggle.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForCondition(() => Boolean(innerTarget.querySelector("#nested-action")));
    expect(managedTeleportCommentRecords(window.document.body).length).toBeGreaterThanOrEqual(2);
    expect(innerTarget.firstElementChild?.id).toBe("nested-action");

    toggle.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );
    await waitForCondition(() => !window.document.getElementById("nested-action"));
    expect(outerTarget.firstElementChild).toBeNull();
    expect(innerTarget.firstElementChild).toBeNull();
  });

  it("initializes a Vue island marker after a reactive patch moves it through Teleport", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-patched-teleport-island",
      (runtimeUrl) => `import { createClientComponent } from ${JSON.stringify(runtimeUrl)};
const template = [
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "reveal" }], children: [{ type: "text", value: "Reveal" }] },
  { type: "element", tag: "div", attrs: [], events: [], if: { expression: "visible.value", blockId: "b0" }, children: [
    { type: "element", tag: "teleport", attrs: [{ kind: "static", name: "to", value: "#teleports" }], events: [], children: [
      { type: "element", tag: "div", attrs: [
        { kind: "static", name: "id", value: "teleported-island" },
        { kind: "static", name: "data-rx-vue-island", value: "MissingIsland" }
      ], events: [], children: [] }
    ] }
  ] }
];
async function script(ctx) {
  const visible = ctx.useState("visible", () => false);
  function reveal() { visible.value = true; }
  return { visible, reveal };
}
export default createClientComponent({ id: "m0", name: "PatchedTeleportIsland", file: "PatchedTeleportIsland.vue", script, template, handlers: ["reveal"] });
`,
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <button id="reveal" data-rx-on-click="s0:m0:reveal">Reveal</button>
        <span data-rx-block="s0:b0" style="display: contents;"></span>
      </div>
      <div id="teleports"></div>
    `;

    installClientRuntimeFixture(window, { visible: false }, handlerUrl);
    (globalThis as any).__RESUX__.vueIslands = {};
    await import(`${runtimeUrl}?test=${nextRuntimeImportQuery()}`);

    window.document.getElementById("reveal")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );
    await waitForCondition(() => Boolean(window.document.getElementById("teleported-island")));
    const island = window.document.getElementById("teleported-island")!;
    expect(window.document.getElementById("teleports")!.firstElementChild).toBe(island);
    await waitForCondition(() => island.getAttribute("data-rx-vue-error") === "missing");
    expect(island.getAttribute("data-rx-vue-error")).toBe("missing");
  });

  it("restores disabled Teleport content to the source namespace", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-teleport-restore-namespace",
      (runtimeUrl) => `import { createClientComponent } from ${JSON.stringify(runtimeUrl)};
const template = [
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "disable" }], children: [{ type: "text", value: "Disable" }] },
  { type: "element", tag: "teleport", attrs: [
    { kind: "static", name: "to", value: "#svg-target" },
    { kind: "dynamic", name: "disabled", value: "disabled.value", bindingId: "b0" }
  ], events: [], children: [
    { type: "element", tag: "circle", attrs: [{ kind: "static", name: "id", value: "restore-namespace-node" }], events: [], children: [] }
  ] }
];
async function script(ctx) {
  const disabled = ctx.useState("disabled", () => false);
  function disable() { disabled.value = true; }
  return { disabled, disable };
}
export default createClientComponent({ id: "m0", name: "RestoreNamespace", file: "RestoreNamespace.vue", script, template, handlers: ["disable"] });
`,
    );

    const missingSource = managedTeleportSourceComment({
      to: "#never-target",
      disabled: false,
      defer: false,
      bindings: { b0: "s0:b0" },
      html: '<div id="missing-target-restored">Inline</div>',
    });
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <button id="disable-namespace" data-rx-on-click="s0:m0:disable">Disable</button>
        <span data-rx-teleport-source="true" data-rx-teleport-to="#svg-target" data-rx-attr-b0="s0:b0" style="display: contents;">
          <circle id="restore-namespace-node"></circle>
        </span>
        ${missingSource}
      </div>
      <svg id="svg-target"></svg>
    `;

    installClientRuntimeFixture(window, { disabled: false }, handlerUrl);
    await import(`${runtimeUrl}?test=${nextRuntimeImportQuery()}`);

    const source = window.document.querySelector("[data-rx-teleport-source='true']") as HTMLElement;
    const svgTarget = window.document.getElementById("svg-target")!;
    await waitForCondition(() => Boolean(svgTarget.querySelector("#restore-namespace-node")));
    expect(svgTarget.querySelector("#restore-namespace-node")?.namespaceURI).toBe("http://www.w3.org/2000/svg");

    window.document.getElementById("disable-namespace")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );
    await waitForCondition(() => Boolean(source.querySelector("#restore-namespace-node")));
    expect(source.querySelector("#restore-namespace-node")?.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
    await waitForCondition(() => Boolean(window.document.getElementById("missing-target-restored")));
    expect(window.document.getElementById("missing-target-restored")?.textContent).toBe("Inline");
  });

  it("uses HTML namespaces for SVG and MathML foreign-content breakout tags", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-svg-teleport-html-breakout",
      () => "export default {};",
    );
    const source = managedTeleportSourceComment({
      to: "#svg-breakout-target",
      disabled: false,
      defer: false,
      bindings: {},
      html: '<div id="svg-breakout-div">HTML</div><font id="svg-breakout-font" color="red">Font</font><font id="svg-plain-font">Plain</font>',
    });
    const mathSource = managedTeleportSourceComment({
      to: "#math-breakout-target",
      disabled: false,
      defer: false,
      bindings: {},
      html: '<div id="math-breakout-div">HTML</div><font id="math-breakout-font" size="2">Font</font><font id="math-plain-font">Plain</font>',
    });
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = '<div id="__resux">' + source + mathSource + '</div>';
    const svg = window.document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "svg-breakout-target");
    window.document.body.appendChild(svg);
    const math = window.document.createElementNS("http://www.w3.org/1998/Math/MathML", "mrow");
    math.setAttribute("id", "math-breakout-target");
    window.document.body.appendChild(math);

    installClientRuntimeFixture(window, {}, handlerUrl);
    try {
      await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());
      await waitForCondition(() => Boolean(svg.querySelector("#svg-breakout-div")));
      expect(svg.querySelector("#svg-breakout-div")?.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
      expect(svg.querySelector("#svg-breakout-font")?.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
      expect(svg.querySelector("#svg-plain-font")?.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(math.querySelector("#math-breakout-div")?.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
      expect(math.querySelector("#math-breakout-font")?.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
      expect(math.querySelector("#math-plain-font")?.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
    } finally {
      resetClientRuntimeFixture();
    }
  });

  it("preserves target order when an earlier Teleport starts disabled", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-teleport-disabled-order",
      (runtimeUrl) => `import { createClientComponent } from ${JSON.stringify(runtimeUrl)};
const template = [
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "enableFirst" }], children: [{ type: "text", value: "Enable" }] },
  { type: "element", tag: "teleport", attrs: [
    { kind: "static", name: "to", value: "#ordered-target" },
    { kind: "dynamic", name: "disabled", value: "firstDisabled.value", bindingId: "b0" }
  ], events: [], children: [
    { type: "element", tag: "div", attrs: [{ kind: "static", name: "id", value: "first-teleport" }], events: [], children: [{ type: "text", value: "First" }] }
  ] },
  { type: "element", tag: "teleport", attrs: [{ kind: "static", name: "to", value: "#ordered-target" }], events: [], children: [
    { type: "element", tag: "div", attrs: [{ kind: "static", name: "id", value: "second-teleport" }], events: [], children: [{ type: "text", value: "Second" }] }
  ] }
];
async function script(ctx) {
  const firstDisabled = ctx.useState("firstDisabled", () => true);
  function enableFirst() { firstDisabled.value = false; }
  return { firstDisabled, enableFirst };
}
export default createClientComponent({ id: "m0", name: "TeleportOrder", file: "TeleportOrder.vue", script, template, handlers: ["enableFirst"] });
`,
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <button id="enable-first" data-rx-on-click="s0:m0:enableFirst">Enable</button>
        <span data-rx-teleport-source="true" data-rx-teleport-to="#ordered-target" data-rx-teleport-disabled="true" data-rx-attr-b0="s0:b0" style="display: contents;">
          <div id="first-teleport">First</div>
        </span>
        <span data-rx-teleport-source="true" data-rx-teleport-to="#ordered-target" style="display: contents;">
          <div id="second-teleport">Second</div>
        </span>
      </div>
      <div id="ordered-target"></div>
    `;

    installClientRuntimeFixture(window, { firstDisabled: true }, handlerUrl);
    await import(`${runtimeUrl}?test=${nextRuntimeImportQuery()}`);

    const target = window.document.getElementById("ordered-target")!;
    await waitForCondition(() => Boolean(target.querySelector("#second-teleport")));
    window.document.getElementById("enable-first")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );
    await waitForCondition(() => Boolean(target.querySelector("#first-teleport")));
    expect(Array.from(target.children).map((element) => element.id)).toEqual(["first-teleport", "second-teleport"]);
  });

  it("recreates Teleport children in SVG namespaces without recreating equivalent-context nodes", async () => {
    const { runtimeUrl, handlerUrl } = await createDynamicTeleportRuntimeFixture({
      prefix: "resux-svg-teleport",
      componentName: "SvgTeleport",
      initialTarget: "#svg-target",
      nextTarget: "#svg-defs-target",
      children: [
        { type: "element", tag: "svg", attrs: [{ kind: "static", name: "id", value: "teleported-svg" }], events: [], children: [] },
        { type: "element", tag: "circle", attrs: [{ kind: "static", name: "id", value: "teleported-circle" }], events: [], children: [] },
      ],
    });

    const source = managedTeleportBindingSourceComment(
      "#svg-target",
      '<svg id="teleported-svg"></svg><circle id="teleported-circle"></circle>',
    );
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="move-svg-target" data-rx-on-click="s0:m0:move">Move</button>'
      + source
      + '<span data-rx-teleport-source="true" data-rx-teleport-to="#foreign-target" style="display: contents;">'
      + '<div id="foreign-html">HTML</div></span></div>';

    const svgRoot = window.document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const target = window.document.createElementNS("http://www.w3.org/2000/svg", "g");
    const nextTarget = window.document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const foreignTarget = window.document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    target.setAttribute("id", "svg-target");
    nextTarget.setAttribute("id", "svg-defs-target");
    foreignTarget.setAttribute("id", "foreign-target");
    svgRoot.append(target, nextTarget, foreignTarget);
    window.document.body.appendChild(svgRoot);

    installClientRuntimeFixture(window, { target: "#svg-target" }, handlerUrl);
    await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());

    await waitForCondition(() => Boolean(target.querySelector("#teleported-circle")));
    const nestedSvg = target.querySelector("#teleported-svg")!;
    const circle = target.querySelector("#teleported-circle")!;
    expect(nestedSvg.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(circle.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(target.firstElementChild).toBe(nestedSvg);
    expect(foreignTarget.querySelector("#foreign-html")?.namespaceURI).toBe("http://www.w3.org/1999/xhtml");

    circle.setAttribute("data-live-state", "preserved");
    clickRuntimeFixture(window, "move-svg-target");
    await waitForCondition(() => Boolean(nextTarget.querySelector("#teleported-circle")));
    expect(nextTarget.querySelector("#teleported-circle")).toBe(circle);
    expect(circle.getAttribute("data-live-state")).toBe("preserved");
    resetClientRuntimeFixture();

    const htmlContextFixture = await createDynamicTeleportRuntimeFixture({
      prefix: "resux-svg-html-context-teleport",
      componentName: "SvgHtmlContextTeleport",
      initialTarget: "#foreign-html-target",
      nextTarget: "#plain-html-target",
      children: [{
        type: "element",
        tag: "input",
        attrs: [
          { kind: "static", name: "id", value: "html-context-input" },
          { kind: "static", name: "value", value: "Server" },
        ],
        events: [],
        children: [],
      }],
    });
    const htmlContextSource = managedTeleportBindingSourceComment(
      "#foreign-html-target",
      '<input id="html-context-input" value="Server">',
    );
    const htmlContextWindow = new Window({ url: "http://localhost/" });
    htmlContextWindow.document.body.innerHTML =
      '<div id="__resux"><button id="move-html-context" data-rx-on-click="s0:m0:move">Move</button>'
      + htmlContextSource + '</div><div id="plain-html-target"></div>';
    const integrationSvg = htmlContextWindow.document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const integrationTarget =
      htmlContextWindow.document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    integrationTarget.setAttribute("id", "foreign-html-target");
    integrationSvg.appendChild(integrationTarget);
    htmlContextWindow.document.body.appendChild(integrationSvg);

    installClientRuntimeFixture(
      htmlContextWindow,
      { target: "#foreign-html-target" },
      htmlContextFixture.handlerUrl,
    );
    try {
      await import(htmlContextFixture.runtimeUrl + "?test=" + nextRuntimeImportQuery());
      await waitForCondition(() => Boolean(integrationTarget.querySelector("#html-context-input")));
      const input = integrationTarget.querySelector("#html-context-input") as HTMLInputElement;
      input.value = "Edited";
      input.focus();
      expect(htmlContextWindow.document.activeElement).toBe(input);
      htmlContextWindow.document.getElementById("move-html-context")!.dispatchEvent(
        new htmlContextWindow.MouseEvent("click", { bubbles: true, button: 0 }),
      );
      const htmlTarget = htmlContextWindow.document.getElementById("plain-html-target")!;
      await waitForCondition(() => Boolean(htmlTarget.querySelector("#html-context-input")));
      const movedInput = htmlTarget.querySelector("#html-context-input") as HTMLInputElement;
      expect(movedInput).toBe(input);
      expect(movedInput.value).toBe("Edited");
    } finally {
      resetClientRuntimeFixture();
    }
  });

  it("preserves an authoritative foreign namespace when the target tag name is misleading", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-teleport-authoritative-namespace",
      () => "export default {};",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><span data-rx-teleport-source="true" data-rx-teleport-to="#foreign-named-target" style="display: contents;"><circle id="foreign-named-circle"></circle></span></div>';
    const svg = window.document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const target = window.document.createElementNS("http://www.w3.org/2000/svg", "math");
    target.setAttribute("id", "foreign-named-target");
    svg.appendChild(target);
    window.document.body.appendChild(svg);

    installClientRuntimeFixture(window, {}, handlerUrl);
    await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());

    await waitForCondition(() => Boolean(target.querySelector("#foreign-named-circle")));
    expect(target.querySelector("#foreign-named-circle")?.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });

  it("creates MathML roots when targeting a MathML text integration point", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-teleport-mathml-integration",
      () => "export default {};",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><span id="math-source" data-rx-teleport-source="true" data-rx-teleport-to="#math-text-target" style="display: contents;"></span></div>';
    const source = window.document.getElementById("math-source")!;
    const mathChild = window.document.createElement("math");
    mathChild.setAttribute("id", "teleported-math-root");
    const miChild = window.document.createElement("mi");
    miChild.textContent = "x";
    mathChild.appendChild(miChild);
    source.appendChild(mathChild);

    const math = window.document.createElementNS("http://www.w3.org/1998/Math/MathML", "math");
    const target = window.document.createElementNS("http://www.w3.org/1998/Math/MathML", "mi");
    target.setAttribute("id", "math-text-target");
    math.appendChild(target);
    window.document.body.appendChild(math);

    installClientRuntimeFixture(window, {}, handlerUrl);
    await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());

    await waitForCondition(() => Boolean(target.querySelector("#teleported-math-root")));
    const teleportedMath = target.querySelector("#teleported-math-root")!;
    expect(teleportedMath.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
    expect(teleportedMath.firstElementChild?.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
  });

  it("keeps the Nuxt-compatible default Teleport target framework-owned when app ids change", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-teleport-reactive-framework-target",
      (runtimeUrl) =>
        'import { createClientComponent } from ' + JSON.stringify(runtimeUrl) + ';\n'
        + 'const template = ['
        + '{ type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "moveId" }], children: [{ type: "text", value: "Move" }] },'
        + '{ type: "element", tag: "div", attrs: [{ kind: "dynamic", name: "id", value: "targetId.value", bindingId: "b0" }], events: [], children: [] }'
        + '];\n'
        + 'async function script(ctx) { const targetId = ctx.useState("targetId", () => "teleports"); function moveId() { targetId.value = "moved-target"; } return { targetId, moveId }; }\n'
        + 'export default createClientComponent({ id: "m0", name: "ReactiveTeleportFrameworkTarget", file: "ReactiveTeleportFrameworkTarget.vue", script, template, handlers: ["moveId"] });\n',
    );

    const metadata = encodeURIComponent(JSON.stringify({
      to: "#teleports",
      disabled: false,
      defer: false,
      bindings: {},
      html: '<p id="framework-teleport-content">Framework</p>',
    })).replaceAll("-", "%2D");
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="move-framework-id" data-rx-on-click="s0:m0:moveId">Move</button>'
      + '<div id="teleports" data-rx-attr-b0="s0:b0"></div>'
      + '<!--resux-teleport-source:' + metadata + '--><!--resux-teleport-end--></div>'
      + '<div id="teleports" data-rx-teleport-fallback="true"></div>';

    installClientRuntimeFixture(window, { targetId: "teleports" }, handlerUrl);
    await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());

    const appOwnedTarget = window.document.querySelector('[data-rx-attr-b0="s0:b0"]') as HTMLElement;
    const frameworkTarget = window.document.querySelector("[data-rx-teleport-fallback='true']") as HTMLElement;
    await waitForCondition(() => Boolean(frameworkTarget.querySelector("#framework-teleport-content")));
    expect(frameworkTarget.id).toBe("teleports");
    expect(frameworkTarget.querySelector("#framework-teleport-content")).toBeTruthy();
    expect(appOwnedTarget.querySelector("#framework-teleport-content")).toBeNull();

    window.document.getElementById("move-framework-id")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );

    await waitForCondition(() => appOwnedTarget.id === "moved-target");
    expect(frameworkTarget.id).toBe("teleports");
    expect(frameworkTarget.querySelector("#framework-teleport-content")).toBeTruthy();
    expect(appOwnedTarget.querySelector("#framework-teleport-content")).toBeNull();
  });

  it("avoids full-document Teleport rescans for local block patches", async () => {
    const fixture = await createClientComponentRuntimeFixture({
      prefix: "resux-local-patch-teleport-scan",
      componentName: "LocalPatchTeleportScan",
      template: [
        { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "toggle" }], children: [{ type: "text", value: "Toggle" }] },
        { type: "element", tag: "div", attrs: [], events: [], if: { expression: "visible.value", blockId: "b0" }, children: [
          { type: "element", tag: "p", attrs: [{ kind: "static", name: "id", value: "local-patch-content" }], events: [], children: [{ type: "text", value: "Local" }] },
        ] },
      ],
      scriptSource: `
async function script(ctx) {
  const visible = ctx.useState("visible", () => false);
  function toggle() { visible.value = true; }
  return { visible, toggle };
}`,
      handlers: ["toggle"],
    });
    const source = managedTeleportSourceComment({
      to: "#teleports",
      disabled: false,
      defer: false,
      bindings: {},
      html: '<p id="unrelated-default-teleport">Default</p>',
    });
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="toggle-local-patch" data-rx-on-click="s0:m0:toggle">Toggle</button>'
      + '<span data-rx-block="s0:b0" style="display: contents;"></span>' + source + '</div>'
      + '<div id="teleports" data-rx-teleport-fallback="true"></div>';

    installClientRuntimeFixture(window, { visible: false }, fixture.handlerUrl);
    try {
      await import(fixture.runtimeUrl + "?test=" + nextRuntimeImportQuery());
      const fallback = window.document.querySelector("[data-rx-teleport-fallback='true']") as HTMLElement;
      await waitForCondition(() => Boolean(fallback.querySelector("#unrelated-default-teleport")));

      const treeWalkerSpy = vi.spyOn(window.document, "createTreeWalker");
      try {
        clickRuntimeFixture(window, "toggle-local-patch");
        await waitForCondition(() => Boolean(window.document.getElementById("local-patch-content")));
        expect(treeWalkerSpy.mock.calls.some(([root]) => root === window.document)).toBe(false);
        expect(fallback.querySelector("#unrelated-default-teleport")).toBeTruthy();
      } finally {
        treeWalkerSpy.mockRestore();
      }
    } finally {
      resetClientRuntimeFixture();
    }
  });

  it("preserves an element-valued reactive Teleport target", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-teleport-element-target",
      (runtimeUrl) =>
        'import { createClientComponent } from ' + JSON.stringify(runtimeUrl) + ';\n'
        + 'const template = ['
        + '{ type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "move" }], children: [{ type: "text", value: "Move" }] },'
        + '{ type: "element", tag: "teleport", attrs: [{ kind: "dynamic", name: "to", value: "target.value", bindingId: "b0" }], events: [], children: [{ type: "element", tag: "p", attrs: [{ kind: "static", name: "id", value: "element-target-content" }], events: [], children: [{ type: "text", value: "Element target" }] }] }'
        + '];\n'
        + 'async function script(ctx) { const target = ctx.useState("target", () => "#first-element-target"); function move() { target.value = document.getElementById("second-element-target"); } return { target, move }; }\n'
        + 'export default createClientComponent({ id: "m0", name: "ElementTeleportTarget", file: "ElementTeleportTarget.vue", script, template, handlers: ["move"] });\n',
    );

    const metadata = encodeURIComponent(JSON.stringify({
      to: "#first-element-target",
      toBinding: "s0:b0",
      disabled: false,
      defer: false,
      bindings: { b0: "s0:b0" },
      html: '<p id="element-target-content">Element target</p>',
    })).replaceAll("-", "%2D");
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="move-element-target" data-rx-on-click="s0:m0:move">Move</button>'
      + '<!--resux-teleport-source:' + metadata + '--><!--resux-teleport-end--></div>'
      + '<div id="first-element-target"></div><div id="second-element-target"></div>';

    installClientRuntimeFixture(window, { target: "#first-element-target" }, handlerUrl);
    await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());

    const first = window.document.getElementById("first-element-target")!;
    const second = window.document.getElementById("second-element-target")!;
    await waitForCondition(() => Boolean(first.querySelector("#element-target-content")));

    window.document.getElementById("move-element-target")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );

    await waitForCondition(() => Boolean(second.querySelector("#element-target-content")));
    expect(first.querySelector("#element-target-content")).toBeNull();
  });

  it("rejects a Teleport target inside its already-mounted content", async () => {
    const { runtimeUrl, handlerUrl } = await createDynamicTeleportRuntimeFixture({
      prefix: "resux-teleport-mounted-self-target",
      componentName: "MountedSelfTarget",
      initialTarget: "#outer-self-target",
      nextTarget: "#inside-self-target",
      children: [{
        type: "element",
        tag: "div",
        attrs: [{ kind: "static", name: "id", value: "inside-self-target" }],
        events: [],
        children: [{
          type: "element",
          tag: "span",
          attrs: [{ kind: "static", name: "id", value: "self-target-content" }],
          events: [],
          children: [{ type: "text", value: "Safe" }],
        }],
      }],
    });

    const source = managedTeleportBindingSourceComment(
      "#outer-self-target",
      '<div id="inside-self-target"><span id="self-target-content">Safe</span></div>',
    );
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="move-self-target" data-rx-on-click="s0:m0:move">Move</button>'
      + source + '</div><div id="outer-self-target"></div>';

    installClientRuntimeFixture(window, { target: "#outer-self-target" }, handlerUrl);
    await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());

    const root = window.document.getElementById("__resux")!;
    const outer = window.document.getElementById("outer-self-target")!;
    await waitForCondition(() => Boolean(outer.querySelector("#inside-self-target")));
    expect(outer.querySelector("#inside-self-target")).toBeTruthy();

    clickRuntimeFixture(window, "move-self-target");

    await waitForCondition(() => Boolean(root.querySelector("#inside-self-target")));
    expect(root.querySelector("#inside-self-target")).toBeTruthy();
    expect(root.querySelector("#self-target-content")?.textContent).toBe("Safe");
    expect(outer.querySelector("#inside-self-target")).toBeNull();
  });

  it("rejects a Teleport target inside a nested Teleport destination", async () => {
    const fixture = await createClientComponentRuntimeFixture({
      prefix: "resux-teleport-nested-self-target",
      componentName: "NestedSelfTarget",
      template: [
        {
          type: "element",
          tag: "button",
          attrs: [],
          events: [{ name: "click", handler: "move" }],
          children: [{ type: "text", value: "Move" }],
        },
        {
          type: "element",
          tag: "teleport",
          attrs: [{ kind: "dynamic", name: "to", value: "target.value", bindingId: "b0" }],
          events: [],
          children: [
            {
              type: "element",
              tag: "teleport",
              attrs: [{ kind: "static", name: "to", value: "#inner-nested-self-target" }],
              events: [],
              children: [{
                type: "element",
                tag: "div",
                attrs: [{ kind: "static", name: "id", value: "nested-self-target" }],
                events: [],
                children: [{ type: "text", value: "Nested target" }],
              }],
            },
            {
              type: "element",
              tag: "span",
              attrs: [{ kind: "static", name: "id", value: "outer-nested-tail" }],
              events: [],
              children: [{ type: "text", value: "Tail" }],
            },
          ],
        },
      ],
      scriptSource: `
async function script(ctx) {
  const target = ctx.useState("target", () => "#outer-nested-self-target");
  function move() { target.value = "#nested-self-target"; }
  return { target, move };
}`,
      handlers: ["move"],
    });
    const nestedSource = managedTeleportSourceComment({
      to: "#inner-nested-self-target",
      disabled: false,
      defer: false,
      html: '<div id="nested-self-target">Nested target</div>',
    });
    const outerSource = managedTeleportSourceComment({
      to: "#outer-nested-self-target",
      disabled: false,
      defer: false,
      bindings: { b0: "s0:b0" },
      html: nestedSource + '<span id="outer-nested-tail">Tail</span>',
    });
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="move-nested-self-target" data-rx-on-click="s0:m0:move">Move</button>'
      + outerSource + '</div><div id="outer-nested-self-target"></div><div id="inner-nested-self-target"></div>';

    installClientRuntimeFixture(window, { target: "#outer-nested-self-target" }, fixture.handlerUrl);
    try {
      await import(fixture.runtimeUrl + "?test=" + nextRuntimeImportQuery());
      const root = window.document.getElementById("__resux")!;
      const outerTarget = window.document.getElementById("outer-nested-self-target")!;
      const innerTarget = window.document.getElementById("inner-nested-self-target")!;
      await waitForCondition(() => Boolean(innerTarget.querySelector("#nested-self-target")));
      expect(outerTarget.querySelector("#outer-nested-tail")).toBeTruthy();

      clickRuntimeFixture(window, "move-nested-self-target");

      await waitForCondition(() => Boolean(root.querySelector("#outer-nested-tail")));
      expect(root.querySelector("#outer-nested-tail")?.textContent).toBe("Tail");
      expect(root.querySelector("#nested-self-target")).toBeNull();
      expect(outerTarget.querySelector("#outer-nested-tail")).toBeNull();
      expect(innerTarget.querySelector("#nested-self-target")?.textContent).toBe("Nested target");
    } finally {
      resetClientRuntimeFixture();
    }
  });

  it("moves a disabled table Teleport across multiple implicit table wrappers", async () => {
    const fixture = await createClientComponentRuntimeFixture({
      prefix: "resux-disabled-table-teleport",
      componentName: "DisabledTableTeleport",
      template: [
        {
          type: "element",
          tag: "button",
          attrs: [],
          events: [{ name: "click", handler: "enable" }],
          children: [{ type: "text", value: "Enable" }],
        },
        {
          type: "element",
          tag: "button",
          attrs: [],
          events: [{ name: "click", handler: "disable" }],
          children: [{ type: "text", value: "Disable" }],
        },
        {
          type: "element",
          tag: "button",
          attrs: [],
          events: [{ name: "click", handler: "enableSvg" }],
          children: [{ type: "text", value: "Enable SVG" }],
        },
        {
          type: "element",
          tag: "table",
          attrs: [{ kind: "static", name: "id", value: "disabled-teleport-table" }],
          events: [],
          children: [{
            type: "element",
            tag: "teleport",
            attrs: [
              { kind: "dynamic", name: "to", value: "target.value", bindingId: "b1" },
              { kind: "dynamic", name: "disabled", value: "disabled.value", bindingId: "b0" },
            ],
            events: [],
            children: [
              {
                type: "element",
                tag: "col",
                attrs: [{ kind: "static", name: "id", value: "disabled-table-col" }],
                events: [],
                children: [],
              },
              {
                type: "element",
                tag: "tr",
                attrs: [{ kind: "static", name: "id", value: "disabled-table-row" }],
                events: [],
                children: [{
                  type: "element",
                  tag: "td",
                  attrs: [],
                  events: [],
                  children: [{ type: "text", value: "Row" }],
                }],
              },
            ],
          }],
        },
      ],
      scriptSource: `
async function script(ctx) {
  const disabled = ctx.useState("disabled", () => true);
  const target = ctx.useState("target", () => "#teleports");
  function enable() { disabled.value = false; }
  function disable() { disabled.value = true; }
  function enableSvg() {
    target.value = document.getElementById("disabled-table-svg-target");
    disabled.value = false;
  }
  return { disabled, target, enable, disable, enableSvg };
}`,
      handlers: ["enable", "disable", "enableSvg"],
    });

    const metadata = encodeURIComponent(JSON.stringify({
      to: "#teleports",
      toBinding: "s0:b1",
      disabled: true,
      defer: false,
      bindings: { b0: "s0:b0", b1: "s0:b1" },
      html: '<col id="disabled-table-col"><tr id="disabled-table-row"><td>Row</td></tr>',
    })).replaceAll("-", "%2D");
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="enable-disabled-table" data-rx-on-click="s0:m0:enable">Enable</button>'
      + '<button id="disable-disabled-table" data-rx-on-click="s0:m0:disable">Disable</button>'
      + '<button id="enable-disabled-table-svg" data-rx-on-click="s0:m0:enableSvg">Enable SVG</button>'
      + '<table id="disabled-teleport-table"></table></div>'
      + '<div id="teleports" data-rx-teleport-fallback="true"></div>'
      + '<svg id="disabled-table-svg-target"></svg>';
    const table = window.document.getElementById("disabled-teleport-table")!;
    table.appendChild(window.document.createComment("resux-teleport-source:" + metadata));
    const colgroup = window.document.createElement("colgroup");
    const col = window.document.createElement("col");
    col.id = "disabled-table-col";
    colgroup.appendChild(col);
    table.appendChild(colgroup);
    const tbody = window.document.createElement("tbody");
    const row = window.document.createElement("tr");
    row.id = "disabled-table-row";
    const cell = window.document.createElement("td");
    cell.textContent = "Row";
    row.appendChild(cell);
    tbody.appendChild(row);
    tbody.appendChild(window.document.createComment("resux-teleport-end"));
    table.appendChild(tbody);

    installClientRuntimeFixture(window, { disabled: true, target: "#teleports" }, fixture.handlerUrl);
    try {
      await import(fixture.runtimeUrl + "?test=" + nextRuntimeImportQuery());
      const target = window.document.querySelector("[data-rx-teleport-fallback='true']") as HTMLElement;
      expect(col).toBeTruthy();
      expect(row).toBeTruthy();

      clickRuntimeFixture(window, "enable-disabled-table");

      await waitForCondition(() => Boolean(target.querySelector("#disabled-table-row")), 5000);
      expect(target.querySelectorAll("#disabled-table-col")).toHaveLength(1);
      expect(target.querySelectorAll("#disabled-table-row")).toHaveLength(1);
      expect(target.querySelector("#disabled-table-col")).toBe(col);
      expect(target.querySelector("#disabled-table-row")).toBe(row);
      expect(table.querySelector("#disabled-table-col")).toBeNull();
      expect(table.querySelector("#disabled-table-row")).toBeNull();

      clickRuntimeFixture(window, "disable-disabled-table");
      await waitForCondition(() => Boolean(table.querySelector("#disabled-table-row")));
      expect(table.querySelector("#disabled-table-col")).toBe(col);
      expect(table.querySelector("#disabled-table-row")).toBe(row);
      expect(col.parentElement?.localName).toBe("colgroup");
      expect(row.parentElement?.localName).toBe("tbody");
      expect(target.querySelector("#disabled-table-col")).toBeNull();
      expect(target.querySelector("#disabled-table-row")).toBeNull();

      clickRuntimeFixture(window, "enable-disabled-table-svg");
      const svgTarget = window.document.getElementById("disabled-table-svg-target")!;
      await waitForCondition(() => Boolean(svgTarget.querySelector("#disabled-table-row")));
      expect(svgTarget.querySelector("#disabled-table-col")?.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(svgTarget.querySelector("#disabled-table-row")?.namespaceURI).toBe("http://www.w3.org/2000/svg");

      clickRuntimeFixture(window, "disable-disabled-table");
      await waitForCondition(() => Boolean(table.querySelector("#disabled-table-row")));
      const restoredCol = table.querySelector("#disabled-table-col")!;
      const restoredRow = table.querySelector("#disabled-table-row")!;
      expect(restoredCol.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
      expect(restoredRow.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
      expect(restoredCol.parentElement?.localName).toBe("colgroup");
      expect(restoredRow.parentElement?.localName).toBe("tbody");
      expect(svgTarget.querySelector("#disabled-table-col")).toBeNull();
      expect(svgTarget.querySelector("#disabled-table-row")).toBeNull();
    } finally {
      resetClientRuntimeFixture();
    }
  });

  it("removes foster-parented disabled table content without claiming identical app siblings", async () => {
    const fixture = await createClientComponentRuntimeFixture({
      prefix: "resux-fostered-disabled-teleport",
      componentName: "FosteredDisabledTeleport",
      template: [
        { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "enable" }], children: [] },
        { type: "element", tag: "teleport", attrs: [
          { kind: "static", name: "to", value: "#teleports" },
          { kind: "dynamic", name: "disabled", value: "disabled.value", bindingId: "b0" },
        ], events: [], children: [
          { type: "element", tag: "div", attrs: [{ kind: "static", name: "class", value: "fostered-disabled-content" }], events: [], children: [{ type: "text", value: "Same" }] },
        ] },
      ],
      scriptSource: `
async function script(ctx) {
  const disabled = ctx.useState("disabled", () => true);
  function enable() { disabled.value = false; }
  return { disabled, enable };
}`,
      handlers: ["enable"],
    });

    const metadata = encodeURIComponent(JSON.stringify({
      to: "#teleports",
      disabled: true,
      defer: false,
      bindings: { b0: "s0:b0" },
      html: '<div class="fostered-disabled-content">Same</div>',
    })).replaceAll("-", "%2D");
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="enable-fostered" data-rx-on-click="s0:m0:enable">Enable</button>'
      + '<div class="fostered-disabled-content">Same</div><div class="fostered-disabled-content">Same</div>'
      + '<table id="fostered-source-table"></table></div>'
      + '<div id="teleports" data-rx-teleport-fallback="true"></div>';
    const unrelated = window.document.querySelector(".fostered-disabled-content") as HTMLElement;
    const unrelatedParent = unrelated.parentElement;
    const table = window.document.getElementById("fostered-source-table")!;
    table.appendChild(window.document.createComment("resux-teleport-source:" + metadata));
    table.appendChild(window.document.createComment("resux-teleport-end"));

    installClientRuntimeFixture(window, { disabled: true }, fixture.handlerUrl);
    try {
      await import(fixture.runtimeUrl + "?test=" + nextRuntimeImportQuery());
      expect(window.document.querySelectorAll(".fostered-disabled-content")).toHaveLength(2);

      clickRuntimeFixture(window, "enable-fostered");
      const target = window.document.querySelector("[data-rx-teleport-fallback='true']") as HTMLElement;
      await waitForCondition(() => Boolean(target.querySelector(".fostered-disabled-content")));
      expect(unrelated.isConnected).toBe(true);
      expect(unrelated.parentElement).toBe(unrelatedParent);
      expect(window.document.querySelectorAll(".fostered-disabled-content")).toHaveLength(2);
      expect(target.querySelectorAll(".fostered-disabled-content")).toHaveLength(1);
      expect(target.querySelector(".fostered-disabled-content")?.textContent).toBe("Same");
    } finally {
      resetClientRuntimeFixture();
    }
  });

  it("reparses first table-context moves", async () => {
    const fixture = await createClientComponentRuntimeFixture({
      prefix: "resux-teleport-context-and-missing",
      componentName: "TeleportContextAndMissing",
      template: [
        { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "enableTable" }], children: [] },
        { type: "element", tag: "teleport", attrs: [
          { kind: "static", name: "to", value: "#table-target" },
          { kind: "dynamic", name: "disabled", value: "tableDisabled.value", bindingId: "b0" },
        ], events: [], children: [
          { type: "element", tag: "tr", attrs: [{ kind: "static", name: "id", value: "context-row" }], events: [], children: [
            { type: "element", tag: "td", attrs: [], events: [], children: [{ type: "text", value: "Row" }] },
          ] },
        ] },
      ],
      scriptSource: `
async function script(ctx) {
  const tableDisabled = ctx.useState("tableDisabled", () => true);
  function enableTable() { tableDisabled.value = false; }
  return { tableDisabled, enableTable };
}`,
      handlers: ["enableTable"],
    });

    const tableMarkup = '<tr id="context-row"><td>Row</td></tr>';
    const tableSource = managedTeleportSourceComment({
      to: "#table-target",
      disabled: true,
      defer: false,
      bindings: { b0: "s0:b0" },
      html: tableMarkup,
    }).replace("<!--resux-teleport-end-->", tableMarkup + "<!--resux-teleport-end-->");
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="enable-context-table" data-rx-on-click="s0:m0:enableTable"></button>'
      + '<table id="source-table"><tbody>' + tableSource + '</tbody></table>'
      + '</div><table id="table-target"></table>';

    installClientRuntimeFixture(
      window,
      { tableDisabled: true },
      fixture.handlerUrl,
    );
    try {
      await import(fixture.runtimeUrl + "?test=" + nextRuntimeImportQuery());
      const sourceRow = window.document.querySelector("#source-table #context-row");
      expect(sourceRow).toBeTruthy();
      clickRuntimeFixture(window, "enable-context-table");
      const tableTarget = window.document.getElementById("table-target") as HTMLTableElement;
      await waitForCondition(() => Boolean(tableTarget.querySelector("#context-row")));
      const movedRow = tableTarget.querySelector("#context-row");
      expect(tableTarget.tBodies).toHaveLength(1);
      expect(movedRow?.parentElement?.localName).toBe("tbody");
      expect(movedRow).not.toBe(sourceRow);

    } finally {
      resetClientRuntimeFixture();
    }
  });

  it("preserves Teleport node identity between HTML annotation-xml and ordinary HTML", async () => {
    const { runtimeUrl, handlerUrl } = await createDynamicTeleportRuntimeFixture({
      prefix: "resux-teleport-annotation-html-identity",
      componentName: "AnnotationHtmlIdentityTeleport",
      initialTarget: "#annotation-html-target",
      nextTarget: "#ordinary-html-target",
      children: [{
        type: "element",
        tag: "input",
        attrs: [
          { kind: "static", name: "id", value: "annotation-html-input" },
          { kind: "static", name: "value", value: "Server" },
        ],
        events: [],
        children: [],
      }],
    });
    const source = managedTeleportBindingSourceComment(
      "#annotation-html-target",
      '<input id="annotation-html-input" value="Server">',
    );
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="move-annotation-html" data-rx-on-click="s0:m0:move">Move</button>'
      + source + '</div><div id="ordinary-html-target"></div>';

    const math = window.document.createElementNS("http://www.w3.org/1998/Math/MathML", "math");
    const annotation = window.document.createElementNS("http://www.w3.org/1998/Math/MathML", "annotation-xml");
    annotation.setAttribute("id", "annotation-html-target");
    annotation.setAttribute("encoding", "text/html");
    math.appendChild(annotation);
    window.document.body.appendChild(math);

    installClientRuntimeFixture(window, { target: "#annotation-html-target" }, handlerUrl);
    try {
      await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());
      await waitForCondition(() => Boolean(annotation.querySelector("#annotation-html-input")));
      const input = annotation.querySelector("#annotation-html-input") as HTMLInputElement;
      input.value = "Edited";

      clickRuntimeFixture(window, "move-annotation-html");

      const htmlTarget = window.document.getElementById("ordinary-html-target")!;
      await waitForCondition(() => Boolean(htmlTarget.querySelector("#annotation-html-input")));
      const movedInput = htmlTarget.querySelector("#annotation-html-input") as HTMLInputElement;
      expect(movedInput).toBe(input);
      expect(movedInput.value).toBe("Edited");
    } finally {
      resetClientRuntimeFixture();
    }
  });

  it("keeps svg-named Teleport children in an ordinary MathML namespace", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-teleport-ordinary-mathml-svg-name",
      () => "export default {};",
    );
    const source = managedTeleportSourceComment({
      to: "#ordinary-math-target",
      disabled: false,
      defer: false,
      html: '<svg id="math-svg-name"><circle id="math-circle-name"></circle></svg>',
    });
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = '<div id="__resux">' + source + '</div>';

    const math = window.document.createElementNS("http://www.w3.org/1998/Math/MathML", "math");
    const mrow = window.document.createElementNS("http://www.w3.org/1998/Math/MathML", "mrow");
    mrow.setAttribute("id", "ordinary-math-target");
    math.appendChild(mrow);
    window.document.body.appendChild(math);

    installClientRuntimeFixture(window, {}, handlerUrl);
    try {
      await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());
      await waitForCondition(() => Boolean(mrow.querySelector("#math-svg-name")));
      expect(mrow.querySelector("#math-svg-name")?.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
      expect(mrow.querySelector("#math-circle-name")?.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
    } finally {
      resetClientRuntimeFixture();
    }
  });

  it("reparses Teleport content when MathML annotation integration status changes", async () => {
    const { runtimeUrl, handlerUrl } = await createDynamicTeleportRuntimeFixture({
      prefix: "resux-teleport-annotation-context",
      componentName: "AnnotationContextTeleport",
      initialTarget: "#html-annotation-target",
      nextTarget: "#math-annotation-target",
      children: [{
        type: "element",
        tag: "div",
        attrs: [{ kind: "static", name: "id", value: "annotation-child" }],
        events: [],
        children: [{ type: "text", value: "Annotation" }],
      }],
    });

    const source = managedTeleportBindingSourceComment(
      "#html-annotation-target",
      '<div id="annotation-child">Annotation</div>',
    );
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="move-annotation-target" data-rx-on-click="s0:m0:move">Move</button>'
      + source + '</div>';

    const mathRoot = window.document.createElementNS("http://www.w3.org/1998/Math/MathML", "math");
    const htmlAnnotation = window.document.createElementNS("http://www.w3.org/1998/Math/MathML", "annotation-xml");
    htmlAnnotation.setAttribute("id", "html-annotation-target");
    htmlAnnotation.setAttribute("encoding", "text/html");
    const mathAnnotation = window.document.createElementNS("http://www.w3.org/1998/Math/MathML", "annotation-xml");
    mathAnnotation.setAttribute("id", "math-annotation-target");
    mathAnnotation.setAttribute("encoding", " text/html ");
    mathRoot.appendChild(htmlAnnotation);
    mathRoot.appendChild(mathAnnotation);
    window.document.body.appendChild(mathRoot);

    installClientRuntimeFixture(window, { target: "#html-annotation-target" }, handlerUrl);
    await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());

    await waitForCondition(() => Boolean(htmlAnnotation.querySelector("#annotation-child")));
    expect(htmlAnnotation.querySelector("#annotation-child")?.namespaceURI).toBe("http://www.w3.org/1999/xhtml");

    clickRuntimeFixture(window, "move-annotation-target");

    await waitForCondition(() => Boolean(mathAnnotation.querySelector("#annotation-child")));
    expect(mathAnnotation.querySelector("#annotation-child")?.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
    expect(htmlAnnotation.querySelector("#annotation-child")).toBeNull();
  });

  it("mounts and patches Teleport content before a slow client plugin finishes", async () => {
    const { runtimeUrl, handlerUrl } = await createClientComponentRuntimeFixture({
      prefix: "resux-teleport-plugin-startup-mount",
      componentName: "PluginStartupTeleport",
      template: [
        {
          type: "element",
          tag: "button",
          attrs: [],
          events: [{ name: "click", handler: "move" }],
          children: [{ type: "text", value: "Move" }],
        },
        {
          type: "element",
          tag: "teleport",
          attrs: [{ kind: "dynamic", name: "to", value: "target.value", bindingId: "b0" }],
          events: [],
          children: [{
            type: "element",
            tag: "p",
            attrs: [{ kind: "static", name: "id", value: "plugin-gated-teleport" }],
            events: [],
            children: [{ type: "interpolation", expression: "label.value", bindingId: "b1" }],
          }],
        },
      ],
      scriptSource: `
async function script(ctx) {
  const target = ctx.useState("target", () => "#plugin-first-target");
  const label = ctx.useState("label", () => "Plugin");
  function move() {
    target.value = "#plugin-second-target";
    label.value = "Updated";
  }
  return { target, label, move };
}`,
      handlers: ["move"],
    });

    const pluginUrl = handlerUrl.replace(/handler\.mjs$/, "slow-plugin.mjs");
    await writeFile(
      new URL(pluginUrl),
      'export default async () => { globalThis.__RESUX_TEST_PLUGIN_STARTED__ = true; await globalThis.__RESUX_TEST_PLUGIN_GATE__; globalThis.__RESUX_TEST_PLUGIN_FINISHED__ = true; };',
      "utf8",
    );

    const source = managedTeleportSourceComment({
      to: "#plugin-first-target",
      disabled: false,
      defer: false,
      bindings: { b0: "s0:b0" },
      html: '<p id="plugin-gated-teleport"><span data-rx-text="s0:b1">Plugin</span></p>',
    });
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="move-during-plugin" data-rx-on-click="s0:m0:move">Move</button>'
      + source + '</div><div id="plugin-first-target"></div><div id="plugin-second-target"></div>';

    let releasePlugin: (() => void) | undefined;
    (globalThis as any).__RESUX_TEST_PLUGIN_STARTED__ = false;
    (globalThis as any).__RESUX_TEST_PLUGIN_FINISHED__ = false;
    (globalThis as any).__RESUX_TEST_PLUGIN_GATE__ = new Promise<void>((resolve) => {
      releasePlugin = resolve;
    });

    try {
      installClientRuntimeFixture(
        window,
        { target: "#plugin-first-target", label: "Plugin" },
        handlerUrl,
      );
      (globalThis as any).__RESUX__.plugins = [{
        id: "slow-plugin",
        mode: "client",
        src: pluginUrl,
      }];

      await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());
      await waitForCondition(() => (globalThis as any).__RESUX_TEST_PLUGIN_STARTED__ === true);
      expect((globalThis as any).__RESUX_TEST_PLUGIN_STARTED__).toBe(true);

      const first = window.document.getElementById("plugin-first-target")!;
      const second = window.document.getElementById("plugin-second-target")!;
      await waitForCondition(() => Boolean(first.querySelector("#plugin-gated-teleport")));
      expect(first.querySelector("#plugin-gated-teleport")).toBeTruthy();

      clickRuntimeFixture(window, "move-during-plugin");
      await waitForCondition(() =>
        second.querySelector('[data-rx-text="s0:b1"]')?.textContent === "Updated",
      );
      expect(second.querySelector('[data-rx-text="s0:b1"]')?.textContent).toBe("Updated");

      releasePlugin?.();
      await waitForCondition(() => (globalThis as any).__RESUX_TEST_PLUGIN_FINISHED__ === true);
      expect((globalThis as any).__RESUX_TEST_PLUGIN_FINISHED__).toBe(true);
      await waitForCondition(() => Boolean(second.querySelector("#plugin-gated-teleport")));
      expect(second.querySelector('[data-rx-text="s0:b1"]')?.textContent).toBe("Updated");
      expect(first.querySelector("#plugin-gated-teleport")).toBeNull();
    } finally {
      releasePlugin?.();
      delete (globalThis as any).__RESUX_TEST_PLUGIN_GATE__;
      delete (globalThis as any).__RESUX_TEST_PLUGIN_STARTED__;
      delete (globalThis as any).__RESUX_TEST_PLUGIN_FINISHED__;
    }
  });

  it("retokenizes nested live targets on the first outer context reparse", async () => {
    const fixture = await createClientComponentRuntimeFixture({
      prefix: "resux-nested-live-target-first-reparse",
      componentName: "NestedLiveTargetFirstReparse",
      template: [
        { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "showOuter" }], children: [{ type: "text", value: "Show" }] },
        { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "enableOuter" }], children: [{ type: "text", value: "Enable" }] },
        { type: "element", tag: "div", attrs: [], events: [], if: { expression: "show.value", blockId: "b0" }, children: [
          { type: "element", tag: "teleport", attrs: [
            { kind: "static", name: "to", value: "#outer-live-svg-target" },
            { kind: "dynamic", name: "disabled", value: "disabled.value", bindingId: "b1" },
          ], events: [], children: [
            { type: "element", tag: "circle", attrs: [{ kind: "static", name: "id", value: "outer-live-circle" }], events: [], children: [] },
            { type: "element", tag: "teleport", attrs: [
              { kind: "dynamic", name: "to", value: "document.getElementById('nested-live-target')", bindingId: "b2" },
            ], events: [], children: [
              { type: "element", tag: "span", attrs: [{ kind: "static", name: "id", value: "nested-live-content" }], events: [], children: [{ type: "text", value: "Nested" }] },
            ] },
          ] },
        ] },
      ],
      scriptSource: `
async function script(ctx) {
  const show = ctx.useState("show", () => false);
  const disabled = ctx.useState("disabled", () => true);
  function showOuter() { show.value = true; }
  function enableOuter() { disabled.value = false; }
  return { show, disabled, showOuter, enableOuter };
}`,
      handlers: ["showOuter", "enableOuter"],
    });

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="show-live-outer" data-rx-on-click="s0:m0:showOuter">Show</button>'
      + '<button id="enable-live-outer" data-rx-on-click="s0:m0:enableOuter">Enable</button>'
      + '<span data-rx-block="s0:b0" style="display: contents;"></span></div>'
      + '<svg id="outer-live-svg-target"></svg><div id="nested-live-target"></div>'
      + '<div id="teleports" data-rx-teleport-fallback="true"></div>';

    installClientRuntimeFixture(window, { show: false, disabled: true }, fixture.handlerUrl);
    try {
      await import(fixture.runtimeUrl + "?test=" + nextRuntimeImportQuery());
      clickRuntimeFixture(window, "show-live-outer");
      const nestedTarget = window.document.getElementById("nested-live-target")!;
      await waitForCondition(() => Boolean(nestedTarget.querySelector("#nested-live-content")));
      expect(nestedTarget.querySelector("#nested-live-content")?.textContent).toBe("Nested");

      clickRuntimeFixture(window, "enable-live-outer");
      const outerTarget = window.document.getElementById("outer-live-svg-target")!;
      await waitForCondition(() => Boolean(outerTarget.querySelector("#outer-live-circle")));
      expect(outerTarget.querySelector("#outer-live-circle")?.namespaceURI).toBe("http://www.w3.org/2000/svg");
      await waitForCondition(() => Boolean(nestedTarget.querySelector("#nested-live-content")));
      expect(nestedTarget.querySelector("#nested-live-content")?.textContent).toBe("Nested");
      expect(window.document.querySelector("[data-rx-teleport-fallback='true']")
        ?.querySelector("#nested-live-content")).toBeNull();
    } finally {
      resetClientRuntimeFixture();
    }
  });

  it("preserves an element-valued Teleport target across structural block replacement", async () => {
    const { runtimeUrl, handlerUrl } = await createClientComponentRuntimeFixture({
      prefix: "resux-teleport-structural-element-target",
      componentName: "StructuralElementTargetTeleport",
      template: [
        {
          type: "element",
          tag: "button",
          attrs: [],
          events: [{ name: "click", handler: "move" }],
          children: [{ type: "text", value: "Move" }],
        },
        {
          type: "element",
          tag: "teleport",
          attrs: [{ kind: "dynamic", name: "to", value: "target.value", bindingId: "b0" }],
          events: [],
          if: { expression: "show.value", blockId: "structural-target-block" },
          children: [{
            type: "element",
            tag: "p",
            attrs: [{ kind: "static", name: "id", value: "structural-element-target-content" }],
            events: [],
            children: [{ type: "text", value: "Structural" }],
          }],
        },
      ],
      scriptSource: `
async function script(ctx) {
  const target = ctx.useState("target", () => "#structural-first-target");
  const show = ctx.useState("show", () => true);
  function move() { target.value = document.getElementById("structural-second-target"); }
  return { target, show, move };
}`,
      handlers: ["move"],
    });

    const source = managedTeleportBindingSourceComment(
      "#structural-first-target",
      '<p id="structural-element-target-content">Structural</p>',
    );
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="move-structural-target" data-rx-on-click="s0:m0:move">Move</button>'
      + '<span data-rx-block="s0:structural-target-block" style="display: contents;">'
      + source + '</span></div>'
      + '<div id="structural-first-target"></div><div id="structural-second-target"></div>';

    installClientRuntimeFixture(window, { target: "#structural-first-target", show: true }, handlerUrl);
    await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());

    const first = window.document.getElementById("structural-first-target")!;
    const second = window.document.getElementById("structural-second-target")!;
    await waitForCondition(() => Boolean(first.querySelector("#structural-element-target-content")));
    expect(first.querySelector("#structural-element-target-content")).toBeTruthy();

    clickRuntimeFixture(window, "move-structural-target");

    await waitForCondition(() => Boolean(second.querySelector("#structural-element-target-content")));
    expect(second.querySelector("#structural-element-target-content")).toBeTruthy();
    expect(first.querySelector("#structural-element-target-content")).toBeNull();
  });

  it("keeps element-valued Teleport targets distinct for each v-for instance", async () => {
    const { runtimeUrl, handlerUrl } = await createClientComponentRuntimeFixture({
      prefix: "resux-teleport-loop-element-targets",
      componentName: "LoopElementTargetsTeleport",
      template: [
        {
          type: "element",
          tag: "button",
          attrs: [],
          events: [{ name: "click", handler: "populate" }],
          children: [{ type: "text", value: "Populate" }],
        },
        {
          type: "element",
          tag: "teleport",
          attrs: [{
            kind: "dynamic",
            name: "to",
            value: "document.getElementById(item.targetId)",
            bindingId: "b0",
          }],
          events: [],
          for: { source: "items.value", value: "item", blockId: "loop-target-block" },
          children: [{
            type: "element",
            tag: "p",
            attrs: [{ kind: "static", name: "class", value: "loop-target-content" }],
            events: [],
            children: [{ type: "interpolation", expression: "item.label", bindingId: "b1" }],
          }],
        },
      ],
      scriptSource: `
async function script(ctx) {
  const items = ctx.useState("items", () => []);
  function populate() {
    items.value = [
      { label: "Alpha", targetId: "loop-target-a" },
      { label: "Beta", targetId: "loop-target-b" },
    ];
  }
  return { items, populate };
}`,
      handlers: ["populate"],
    });

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="populate-loop-targets" data-rx-on-click="s0:m0:populate">Populate</button>'
      + '<span data-rx-block="s0:loop-target-block" style="display: contents;"></span></div>'
      + '<div id="loop-target-a"></div><div id="loop-target-b"></div>';

    installClientRuntimeFixture(window, { items: [] }, handlerUrl);
    await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());

    clickRuntimeFixture(window, "populate-loop-targets");

    const targetA = window.document.getElementById("loop-target-a")!;
    const targetB = window.document.getElementById("loop-target-b")!;
    await waitForCondition(() =>
      Boolean(targetA.querySelector(".loop-target-content"))
      && Boolean(targetB.querySelector(".loop-target-content")),
    );
    expect(targetA.querySelectorAll(".loop-target-content")).toHaveLength(1);
    expect(targetB.querySelectorAll(".loop-target-content")).toHaveLength(1);
  });

  it("restores MathML definitionURL casing during contextual Teleport cloning", async () => {
    const { runtimeUrl, handlerUrl } = await createClientComponentRuntimeFixture({
      prefix: "resux-teleport-mathml-attribute-case",
      componentName: "MathMlAttributeTeleport",
      template: [],
      scriptSource: "async function script() { return {}; }",
      handlers: [],
    });

    const source = managedTeleportSourceComment({
      to: "#math-attribute-target",
      disabled: false,
      defer: false,
      html: '<annotation-xml id="math-attribute-child" xmlns="http://www.w3.org/1998/Math/MathML" xmlns:xlink="http://www.w3.org/1999/xlink" definitionurl="https://example.test/definition"></annotation-xml>',
    });
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = '<div id="__resux">' + source + '</div>';

    const mathTarget = window.document.createElementNS("http://www.w3.org/1998/Math/MathML", "math");
    mathTarget.setAttribute("id", "math-attribute-target");
    window.document.body.appendChild(mathTarget);

    installClientRuntimeFixture(window, {}, handlerUrl);
    await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());

    await waitForCondition(() => Boolean(mathTarget.querySelector("#math-attribute-child")));
    const annotation = mathTarget.querySelector("#math-attribute-child")!;
    expect(annotation.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
    expect(annotation.getAttributeNames()).toContain("definitionURL");
    expect(annotation.getAttributeNames()).not.toContain("definitionurl");
    expect(annotation.getAttribute("definitionURL")).toBe("https://example.test/definition");
    expect(annotation.getAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns")).toBe("http://www.w3.org/1998/Math/MathML");
    expect(annotation.getAttributeNS("http://www.w3.org/2000/xmlns/", "xlink")).toBe("http://www.w3.org/1999/xlink");
  });

  it("reinitializes managed content after a Teleport changes target namespaces", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-teleport-namespace-reinit",
      (runtimeUrl) => `import { createClientComponent } from ${JSON.stringify(runtimeUrl)};
const template = [
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "move" }], children: [{ type: "text", value: "Move" }] },
  { type: "element", tag: "teleport", attrs: [
    { kind: "dynamic", name: "to", value: "target.value", bindingId: "b0" }
  ], events: [], children: [
    { type: "element", tag: "g", attrs: [
      { kind: "static", name: "id", value: "namespace-island" },
      { kind: "static", name: "data-rx-vue-island", value: "MissingIsland" }
    ], events: [], children: [] }
  ] }
];
async function script(ctx) {
  const target = ctx.useState("target", () => "#html-target");
  function move() { target.value = "#svg-target"; }
  return { target, move };
}
export default createClientComponent({ id: "m0", name: "TeleportNamespaceReinit", file: "TeleportNamespaceReinit.vue", script, template, handlers: ["move"] });
`,
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <button id="move-namespace" data-rx-on-click="s0:m0:move">Move</button>
        <span
          data-rx-teleport-source="true"
          data-rx-teleport-to="#html-target"
          data-rx-attr-b0="s0:b0"
          style="display: contents;"
        >
          <g id="namespace-island" data-rx-vue-island="MissingIsland"></g>
        </span>
      </div>
      <div id="html-target"></div>
      <svg id="svg-target" viewBox="0 0 24 24"></svg>
    `;

    installClientRuntimeFixture(window, { target: "#html-target" }, handlerUrl);
    (globalThis as any).__RESUX__.vueIslands = {};
    await import(`${runtimeUrl}?test=${nextRuntimeImportQuery()}`);

    const htmlTarget = window.document.getElementById("html-target")!;
    await waitForCondition(() => Boolean(htmlTarget.querySelector("#namespace-island")));
    const initialIsland = htmlTarget.querySelector("#namespace-island") as Element;
    await waitForCondition(() => initialIsland.getAttribute("data-rx-vue-error") === "missing");
    initialIsland.removeAttribute("data-rx-vue-error");

    window.document.getElementById("move-namespace")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );

    const svgTarget = window.document.getElementById("svg-target")!;
    await waitForCondition(() => Boolean(svgTarget.querySelector("#namespace-island")));
    const recreatedIsland = svgTarget.querySelector("#namespace-island") as Element;
    expect(recreatedIsland).not.toBe(initialIsland);
    expect(recreatedIsland.namespaceURI).toBe("http://www.w3.org/2000/svg");
    await waitForCondition(() => recreatedIsland.getAttribute("data-rx-vue-error") === "missing");
    expect(recreatedIsland.getAttribute("data-rx-vue-error")).toBe("missing");
  });

  it("resolves a deferred Teleport after a later patch creates its target in the same tick", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-deferred-teleport",
      (runtimeUrl) => `import { createClientComponent } from ${JSON.stringify(runtimeUrl)};
const template = [
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "show" }], children: [{ type: "text", value: "Show" }] },
  { type: "element", tag: "div", attrs: [], events: [], if: { expression: "showTeleport.value", blockId: "b0" }, children: [
    { type: "element", tag: "teleport", attrs: [
      { kind: "static", name: "to", value: "#late-target" },
      { kind: "static", name: "defer", value: "" }
    ], events: [], children: [
      { type: "element", tag: "p", attrs: [{ kind: "static", name: "id", value: "deferred-content" }], events: [], children: [{ type: "text", value: "Deferred" }] }
    ] }
  ] },
  { type: "element", tag: "div", attrs: [{ kind: "static", name: "id", value: "late-target" }], events: [], if: { expression: "showTarget.value", blockId: "b1" }, children: [] },
  { type: "element", tag: "div", attrs: [], events: [], if: { expression: "showTeleport.value", blockId: "b2" }, children: [
    { type: "element", tag: "teleport", attrs: [
      { kind: "static", name: "to", value: "#late-target-no-defer" }
    ], events: [], children: [
      { type: "element", tag: "p", attrs: [{ kind: "static", name: "id", value: "non-deferred-content" }], events: [], children: [{ type: "text", value: "Immediate" }] }
    ] }
  ] },
  { type: "element", tag: "div", attrs: [{ kind: "static", name: "id", value: "late-target-no-defer" }], events: [], if: { expression: "showTarget.value", blockId: "b3" }, children: [] },
  { type: "element", tag: "div", attrs: [{ kind: "static", name: "id", value: "teleports" }], events: [], if: { expression: "showTarget.value", blockId: "b4" }, children: [] }
];
async function script(ctx) {
  const showTeleport = ctx.useState("showTeleport", () => false);
  const showTarget = ctx.useState("showTarget", () => false);
  function show() {
    showTeleport.value = true;
    showTarget.value = true;
  }
  return { showTeleport, showTarget, show };
}
export default createClientComponent({ id: "m0", name: "DeferredTeleport", file: "DeferredTeleport.vue", script, template, handlers: ["show"] });
`,
    );

    const defaultSource = managedTeleportSourceComment({
      to: "#teleports",
      disabled: false,
      defer: false,
      html: '<p id="structural-default-content">Default</p>',
    });
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux">
        <button id="show-deferred" data-rx-on-click="s0:m0:show">Show</button>
        ${defaultSource}
        <span data-rx-block="s0:b0" style="display: contents;"></span>
        <span data-rx-block="s0:b1" style="display: contents;"></span>
        <span data-rx-block="s0:b2" style="display: contents;"></span>
        <span data-rx-block="s0:b3" style="display: contents;"></span>
        <span data-rx-block="s0:b4" style="display: contents;"></span>
      </div>
      <div id="teleports" data-rx-teleport-fallback="true"></div>
    `;

    installClientRuntimeFixture(window, { showTeleport: false, showTarget: false }, handlerUrl);
    await import(`${runtimeUrl}?test=${nextRuntimeImportQuery()}`);
    const fallback = window.document.querySelector("[data-rx-teleport-fallback='true']") as HTMLElement;
    await waitForCondition(() => Boolean(fallback.querySelector("#structural-default-content")));

    window.document.getElementById("show-deferred")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );

    await waitForCondition(() => Boolean(window.document.getElementById("late-target")));
    await waitForCondition(() => Boolean(window.document.getElementById("late-target")?.querySelector("#deferred-content")));
    const source = managedTeleportCommentRecords(window.document.body)
      .find((record) => record.metadata.to === "#late-target");
    expect(source?.metadata.defer).toBe(true);
    expect(source?.node.nextSibling?.nodeType).toBe(8);
    expect(window.document.getElementById("late-target")?.firstElementChild?.id).toBe("deferred-content");

    const nonDeferredTarget = window.document.getElementById("late-target-no-defer")!;
    const nonDeferredSource = managedTeleportCommentRecords(window.document.body)
      .find((record) => record.metadata.to === "#late-target-no-defer");
    expect(nonDeferredSource?.metadata.defer).toBe(false);
    expect(nonDeferredTarget.querySelector("#non-deferred-content")).toBeNull();
    expect(nonDeferredSource?.metadata.html).toContain('id="non-deferred-content"');

    const structuralDefaultTarget = window.document.querySelector('[data-rx-block="s0:b4"] #teleports') as HTMLElement;
    await waitForCondition(() => Boolean(structuralDefaultTarget));
    expect(structuralDefaultTarget.querySelector("#structural-default-content")).toBeNull();
    expect(fallback.id).toBe("teleports");
    expect(fallback.querySelector("#structural-default-content")).toBeTruthy();
  });

  it("retries deferred Teleports after later sources create their targets during navigation mount", async () => {
    const fixture = await createClientRuntimeFixture(
      "resux-deferred-mount-pass",
      (runtimeUrl) => `import { createClientComponent } from ${JSON.stringify(runtimeUrl)};
const template = [];
async function script(ctx) {
  const pending = ctx.useAsyncData("pending", () => new Promise((resolve) => {
    globalThis.__RESUX_RELEASE_MOUNT_PASS__ = resolve;
  }));
  return { pending };
}
export default createClientComponent({ id: "m0", name: "PendingMountPass", file: "PendingMountPass.vue", script, template, handlers: [] });
`,
    );

    const earlySource = managedTeleportSourceComment({
      to: "#mount-pass-target-a",
      disabled: false,
      defer: true,
      bindings: {},
      html: '<p id="mount-pass-content">Mounted</p>',
    });
    const middleSource = managedTeleportSourceComment({
      to: "#mount-pass-target-b",
      disabled: false,
      defer: true,
      bindings: {},
      html: '<div id="mount-pass-target-a"></div>',
    });
    const laterSource = managedTeleportSourceComment({
      to: "#mount-pass-host",
      disabled: false,
      defer: false,
      bindings: {},
      html: '<div id="mount-pass-target-b"></div>',
    });
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><a id="go-mount-pass" href="/next">Next</a><main>Home</main></div>';
    const originalFetch = globalThis.fetch;

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      scrollTo: () => undefined,
      fetch: async () => new Response(
        JSON.stringify({
          html: '<main>Next</main>' + earlySource + middleSource + laterSource + '<div id="mount-pass-host"></div>',
          head: { title: "Next" },
          payload: {
            route: { path: "/next", params: {}, query: {} },
            scopes: {
              s0: {
                id: "s0",
                moduleId: "m0",
                state: {},
                asyncData: { pending: { value: null, pending: true, error: null } },
              },
            },
            modules: { m0: fixture.handlerUrl },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {},
      },
      __RESUX_INSTALLED__: false,
    });

    try {
      await import(fixture.runtimeUrl + "?test=" + nextRuntimeImportQuery());
      clickRuntimeFixture(window, "go-mount-pass");
      await waitForHtml(window, "<main>Next</main>");
      const target = window.document.getElementById("mount-pass-target-a");
      expect(target).toBeTruthy();
      expect(target?.querySelector("#mount-pass-content")?.textContent).toBe("Mounted");

      await waitForCondition(() => typeof (globalThis as any).__RESUX_RELEASE_MOUNT_PASS__ === "function");
      (globalThis as any).__RESUX_RELEASE_MOUNT_PASS__({ done: true });
      await waitForCondition(() => (globalThis as any).__RESUX__.scopes.s0.asyncData.pending.pending === false);
    } finally {
      const release = (globalThis as any).__RESUX_RELEASE_MOUNT_PASS__;
      if (typeof release === "function") release({ done: true });
      delete (globalThis as any).__RESUX_RELEASE_MOUNT_PASS__;
      Object.assign(globalThis, { fetch: originalFetch });
      resetClientRuntimeFixture();
    }
  });

  it("keeps full deferred patches until another scope creates the target", async () => {
    const fixture = await createClientComponentRuntimeFixture({
      prefix: "resux-deferred-teleport-replay",
      componentName: "DeferredTeleportReplay",
      template: [
        { type: "element", tag: "teleport", attrs: [
          { kind: "static", name: "to", value: "#late-replay-target" },
          { kind: "dynamic", name: "defer", value: "defer.value", bindingId: "b1" },
        ], events: [], children: [
          { type: "element", tag: "p", attrs: [{ kind: "static", name: "id", value: "deferred-replay-content" }], events: [], children: [
            { type: "interpolation", expression: "count.value", bindingId: "b0" },
          ] },
        ] },
      ],
      scriptSource: `
async function script(ctx) {
  const count = ctx.useState("count", () => 0);
  const defer = ctx.useState("defer", () => true);
  function bump() { count.value += 1; }
  return { count, defer, bump };
}`,
      handlers: ["bump"],
    });

    const targetHandlerUrl = fixture.handlerUrl.replace(/handler\.mjs$/, "target-handler.mjs");
    await writeFile(
      new URL(targetHandlerUrl),
      `import { createClientComponent } from ${JSON.stringify(fixture.runtimeUrl)};
const template = [
  { type: "element", tag: "div", attrs: [{ kind: "static", name: "id", value: "late-replay-target" }], events: [], if: { expression: "visible.value", blockId: "b0" }, children: [] }
];
async function script(ctx) {
  const visible = ctx.useState("visible", () => false);
  function show() { visible.value = true; }
  return { visible, show };
}
export default createClientComponent({ id: "m1", name: "DeferredTarget", file: "DeferredTarget.vue", script, template, handlers: ["show"] });
`,
      "utf8",
    );

    const source = managedTeleportSourceComment({
      to: "#late-replay-target",
      disabled: false,
      defer: true,
      bindings: { b1: "s0:b1" },
      html: '<p id="deferred-replay-content"><span data-rx-text="s0:b0">0</span></p>',
    });
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="bump-deferred" data-rx-on-click="s0:m0:bump"></button>'
      + '<button id="show-deferred-target" data-rx-on-click="s1:m1:show"></button>'
      + source + '<span data-rx-block="s1:b0" style="display: contents;"></span></div>';

    installClientRuntimeFixture(window, { count: 0, defer: true }, fixture.handlerUrl);
    const payload = (globalThis as any).__RESUX__;
    payload.scopes.s1 = { id: "s1", moduleId: "m1", state: { visible: false }, asyncData: {} };
    payload.modules.m1 = targetHandlerUrl;

    try {
      await import(fixture.runtimeUrl + "?test=" + nextRuntimeImportQuery());
      clickRuntimeFixture(window, "bump-deferred");
      await waitForCondition(() => payload.scopes.s0.state.count === 1);
      expect(window.document.getElementById("late-replay-target")).toBeNull();

      clickRuntimeFixture(window, "show-deferred-target");
      await waitForCondition(() =>
        window.document.querySelector("#late-replay-target [data-rx-text='s0:b0']")?.textContent === "1",
      );
      expect(window.document.querySelector("#late-replay-target [data-rx-text='s0:b0']")?.textContent).toBe("1");
      expect(window.document.getElementById("late-replay-target")
        ?.querySelector("#deferred-replay-content")).toBeTruthy();
    } finally {
      resetClientRuntimeFixture();
    }
  });

  it("clears stale deferred patches across route cleanup with or without surviving waiters", async () => {
    const fixture = await createClientComponentRuntimeFixture({
      prefix: "resux-deferred-teleport-route-cleanup",
      componentName: "DeferredRouteCleanup",
      template: [
        { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "bump" }], children: [{ type: "text", value: "Bump" }] },
        { type: "interpolation", expression: "count.value", bindingId: "b0" },
      ],
      scriptSource: `
async function script(ctx) {
  const count = ctx.useState("count", () => 0);
  function bump() { count.value += 1; }
  return { count, bump };
}`,
      handlers: ["bump"],
    });

    const targetHandlerUrl = fixture.handlerUrl.replace(/handler\.mjs$/, "route-target-handler.mjs");
    await writeFile(
      new URL(targetHandlerUrl),
      `import { createClientComponent } from ${JSON.stringify(fixture.runtimeUrl)};
const template = [
  { type: "element", tag: "div", attrs: [{ kind: "static", name: "id", value: "route-b-late-target" }], events: [], if: { expression: "visible.value", blockId: "b0" }, children: [] }
];
async function script(ctx) {
  const visible = ctx.useState("visible", () => false);
  function show() { visible.value = true; }
  return { visible, show };
}
export default createClientComponent({ id: "m1", name: "RouteBTarget", file: "RouteBTarget.vue", script, template, handlers: ["show"] });
`,
      "utf8",
    );

    const routeASource = managedTeleportSourceComment({
      to: "#route-a-missing-target",
      disabled: false,
      defer: true,
      bindings: {},
      html: '<p><span data-rx-text="s0:b0">0</span></p>',
    });
    const routeBSource = managedTeleportSourceComment({
      to: "#route-b-late-target",
      disabled: false,
      defer: true,
      bindings: {},
      html: '<p id="route-b-deferred"><span data-rx-text="s0:b0">Route B</span></p>',
    });

    const runCase = async (layoutSource = "") => {
      const routeAPage =
        '<a id="go-route-b" href="/route-b">Route B</a>'
        + '<button id="bump-route-a" data-rx-on-click="s0:m0:bump">Bump</button>'
        + routeASource;
      const routeBPage =
        '<main>Route B</main><button id="show-route-b-target" data-rx-on-click="s1:m1:show">Show</button>'
        + routeBSource
        + '<span data-rx-block="s1:b0" style="display: contents;"></span>';
      const wrapPage = (page: string) => layoutSource
        ? '<section data-rx-layout="default">' + layoutSource + '<span data-rx-page="">' + page + '</span></section>'
        : page;
      const window = new Window({ url: "http://localhost/" });
      window.document.body.innerHTML = '<div id="__resux">' + wrapPage(routeAPage) + '</div>';

      const originalFetch = globalThis.fetch;
      installClientRuntimeFixture(window, { count: 0 }, fixture.handlerUrl);
      Object.assign(globalThis, {
        fetch: async () => new Response(
          JSON.stringify({
            html: wrapPage(routeBPage),
            head: { title: "Route B" },
            payload: {
              route: { path: "/route-b", params: {}, query: {} },
              scopes: {
                s0: { id: "s0", moduleId: "m0", state: { count: 7 }, asyncData: {} },
                s1: { id: "s1", moduleId: "m1", state: { visible: false }, asyncData: {} },
              },
              modules: { m0: fixture.handlerUrl, m1: targetHandlerUrl },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      });

      try {
        await import(fixture.runtimeUrl + "?test=" + nextRuntimeImportQuery());
        clickRuntimeFixture(window, "bump-route-a");
        await waitForCondition(() => (globalThis as any).__RESUX__.scopes.s0.state.count === 1);
        expect(window.document.getElementById("route-a-missing-target")).toBeNull();

        clickRuntimeFixture(window, "go-route-b");
        await waitForCondition(() => window.location.pathname === "/route-b");
        await waitForHtml(window, "<main>Route B</main>");
        expect(window.document.getElementById("route-b-late-target")).toBeNull();

        clickRuntimeFixture(window, "show-route-b-target");
        await waitForCondition(() =>
          window.document.querySelector("#route-b-late-target [data-rx-text='s0:b0']")?.textContent === "Route B",
        );
        expect(window.document.querySelector("#route-b-late-target [data-rx-text='s0:b0']")?.textContent).toBe("Route B");
        expect(window.document.getElementById("route-b-late-target")
          ?.querySelector("#route-b-deferred")).toBeTruthy();
      } finally {
        Object.assign(globalThis, { fetch: originalFetch });
        resetClientRuntimeFixture();
      }
    };

    await runCase();
    await runCase(managedTeleportSourceComment({
      to: "#layout-never-target",
      disabled: false,
      defer: true,
      bindings: {},
      html: '<span id="layout-deferred-content">Layout</span>',
    }));
  });

  it("remounts live Teleport state when a reactive block replaces its target context", async () => {
    const { runtimeUrl, handlerUrl } = await createClientComponentRuntimeFixture({
      prefix: "resux-external-teleport-target",
      componentName: "ExternalTeleportTarget",
      template: [
        {
          type: "element",
          tag: "button",
          attrs: [],
          events: [{ name: "click", handler: "replace" }],
          children: [{ type: "text", value: "Replace" }],
        },
        {
          type: "element",
          tag: "teleport",
          attrs: [
            { kind: "static", name: "to", value: "#replaceable-target" },
            { kind: "static", name: "defer", value: "" },
          ],
          events: [],
          children: [{
            type: "element",
            tag: "g",
            attrs: [{ kind: "static", name: "id", value: "external-teleport-content" }],
            events: [],
            children: [{ type: "interpolation", expression: "label.value", bindingId: "b1" }],
          }],
        },
        {
          type: "element",
          tag: "div",
          attrs: [{ kind: "static", name: "id", value: "replaceable-target" }],
          events: [],
          if: { expression: "!svg.value", blockId: "b0" },
          children: [],
        },
        {
          type: "element",
          tag: "svg",
          attrs: [{ kind: "static", name: "id", value: "replaceable-target" }],
          events: [],
          if: { expression: "svg.value", blockId: "b2" },
          children: [],
        },
      ],
      scriptSource: `
async function script(ctx) {
  const label = ctx.useState("label", () => "External");
  const svg = ctx.useState("svg", () => false);
  function replace() {
    label.value = "Updated";
    svg.value = true;
  }
  return { label, svg, replace };
}`,
      handlers: ["replace"],
    });

    const source = managedTeleportSourceComment({
      to: "#replaceable-target",
      disabled: false,
      defer: true,
      html: '<g id="external-teleport-content"><span data-rx-text="s0:b1">External</span></g>',
    });
    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML =
      '<div id="__resux"><button id="replace-target" data-rx-on-click="s0:m0:replace">Replace</button>'
      + source
      + '<span data-rx-block="s0:b0" style="display: contents;"><div id="replaceable-target"></div></span>'
      + '<span data-rx-block="s0:b2" style="display: contents;"></span></div>';

    installClientRuntimeFixture(window, { label: "External", svg: false }, handlerUrl);
    await import(runtimeUrl + "?test=" + nextRuntimeImportQuery());

    const originalTarget = window.document.getElementById("replaceable-target")!;
    await waitForCondition(() => Boolean(originalTarget.querySelector("#external-teleport-content")));

    clickRuntimeFixture(window, "replace-target");
    await waitForCondition(() => {
      const target = window.document.getElementById("replaceable-target");
      return Boolean(
        target
        && target !== originalTarget
        && target.namespaceURI === "http://www.w3.org/2000/svg"
        && target.querySelector('[data-rx-text="s0:b1"]')?.textContent === "Updated"
      );
    });

    const nextTarget = window.document.getElementById("replaceable-target")!;
    const content = nextTarget.querySelector("#external-teleport-content")!;
    expect(nextTarget).not.toBe(originalTarget);
    expect(content.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(content.querySelector('[data-rx-text="s0:b1"]')?.textContent).toBe("Updated");
  });

  it("cleans Teleports owned by removed TransitionGroup children", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-transition-group-teleport",
      (runtimeUrl) => `import { createClientComponent } from ${JSON.stringify(runtimeUrl)};
const template = [
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "removeFirst" }], children: [{ type: "text", value: "Remove" }] },
  { type: "element", tag: "transition-group", attrs: [
    { kind: "static", name: "name", value: "list" },
    { kind: "static", name: "tag", value: "div" }
  ], events: [], children: [
    { type: "element", tag: "article", attrs: [{ kind: "dynamic", name: "key", value: "item" }], events: [], for: { source: "items.value", value: "item", blockId: "b0" }, children: [
      { type: "element", tag: "teleport", attrs: [{ kind: "static", name: "to", value: "#portals" }], events: [], children: [
        { type: "element", tag: "div", attrs: [{ kind: "dynamic", name: "id", value: '"portal-" + item', bindingId: "b2" }], events: [], children: [
          { type: "interpolation", expression: "item", bindingId: "b1" }
        ] }
      ] }
    ] }
  ] }
];
async function script(ctx) {
  const items = ctx.useState("items", () => [1, 2]);
  function removeFirst() { items.value = [2]; }
  return { items, removeFirst };
}
export default createClientComponent({ id: "m0", name: "TransitionTeleportList", file: "TransitionTeleportList.vue", script, template, handlers: ["removeFirst"] });
`,
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.head.innerHTML = `<style>
      .list-enter-active,.list-leave-active{transition:opacity .04s linear}
      .list-enter-from,.list-leave-to{opacity:0}
    </style>`;
    window.document.body.innerHTML = `
      <div id="__resux">
        <button id="remove-first" data-rx-on-click="s0:m0:removeFirst">Remove</button>
        <div data-rx-transition="list" data-rx-transition-group="true" data-rx-block="s0:b0">
          <article key="1">
            <span data-rx-teleport-source="true" data-rx-teleport-to="#portals" style="display: contents;">
              <div id="portal-1"><span data-rx-text="s0:b1">1</span></div>
            </span>
          </article>
          <article key="2">
            <span data-rx-teleport-source="true" data-rx-teleport-to="#portals" style="display: contents;">
              <div id="portal-2"><span data-rx-text="s0:b1">2</span></div>
            </span>
          </article>
        </div>
      </div>
      <div id="portals"></div>
    `;

    installClientRuntimeFixture(window, { items: [1, 2] }, handlerUrl);
    await import(`${runtimeUrl}?test=${nextRuntimeImportQuery()}`);

    const portals = window.document.getElementById("portals")!;
    await waitForCondition(() => Boolean(portals.querySelector("#portal-1") && portals.querySelector("#portal-2")));

    window.document.getElementById("remove-first")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );

    await waitForCondition(() => !portals.querySelector("#portal-1"));
    await waitForCondition(() => Boolean(portals.querySelector("#portal-2")));
    expect(portals.querySelector("#portal-1")).toBeNull();
    expect(portals.querySelector("#portal-2")).toBeTruthy();
  });

  it("commits keyed TransitionGroup additions immediately while removed items leave", async () => {
    const { runtimeUrl, handlerUrl } = await createClientRuntimeFixture(
      "resux-transition-group",
      (runtimeUrl) => `import { createClientComponent } from ${JSON.stringify(runtimeUrl)};
const template = [
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "swap" }], children: [{ type: "text", value: "Swap" }] },
  { type: "element", tag: "transition-group", attrs: [{ kind: "static", name: "name", value: "list" }, { kind: "static", name: "tag", value: "ul" }], events: [], children: [
    { type: "element", tag: "li", attrs: [{ kind: "dynamic", name: "key", value: "item" }], events: [], for: { source: "items.value", value: "item", blockId: "b0" }, children: [
      { type: "interpolation", expression: "item", bindingId: "b1" }
    ] }
  ] }
];
async function script(ctx) {
  const items = ctx.useState("items", () => [1, 2]);
  function swap() { items.value = [2, 3]; }
  return { items, swap };
}
export default createClientComponent({ id: "m0", name: "TransitionList", file: "TransitionList.vue", script, template, handlers: ["swap"] });
`,
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.head.innerHTML = `<style>
      .list-enter-active,.list-leave-active{transition:opacity .05s linear}
      .list-enter-from,.list-leave-to{opacity:0}
    </style>`;
    window.document.body.innerHTML = `
      <button id="swap" data-rx-on-click="s0:m0:swap">Swap</button>
      <ul data-rx-transition="list" data-rx-transition-group="true" data-rx-block="s0:b0">
        <li key="1">1</li><li key="2">2</li>
      </ul>
    `;

    installClientRuntimeFixture(window, { items: [1, 2] }, handlerUrl);

    await import(`${runtimeUrl}?test=${nextRuntimeImportQuery()}`);
    window.document.getElementById("swap")!.dispatchEvent(
      new window.MouseEvent("click", { bubbles: true, button: 0 }),
    );

    await waitForCondition(() => Boolean(window.document.querySelector('li[key="3"]')));
    expect(window.document.querySelector('li[key="3"]')?.textContent).toContain("3");
    expect(window.document.querySelector('li[key="1"][data-rx-transition-leaving="true"]')).toBeTruthy();

    await waitForCondition(() => !window.document.querySelector('li[key="1"]'), 500);
    expect(window.document.querySelector('li[key="1"]')).toBeNull();
    expect(window.document.querySelector('li[key="2"]')).toBeTruthy();
    expect(window.document.querySelector('li[key="3"]')).toBeTruthy();
  });
});
