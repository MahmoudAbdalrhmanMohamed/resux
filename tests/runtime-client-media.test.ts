import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";
import { describe, expect, it, vi } from "vitest";
import { getClientRuntimeSource } from "resuxjs/runtime";
import { nextRuntimeImportQuery, script, waitForHtml } from "./helpers/runtime-fixtures.js";

describe("client resume loader: media", () => {
  it("renders ResuxImg to native img markup during client block patches", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-client-img-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    const handlerFile = path.join(tempDir, "handler.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");
    await writeFile(
      handlerFile,
      `import { createClientComponent } from ${JSON.stringify(pathToFileURL(runtimeFile).href)};
const __template = [
  { type: "element", tag: "button", attrs: [], events: [{ name: "click", handler: "toggle" }], children: [{ type: "text", value: "Toggle" }] },
  { type: "element", tag: "section", attrs: [], events: [], if: { expression: "show.value", blockId: "b0" }, children: [
      { type: "element", tag: "ResuxImg", attrs: [
          { kind: "static", name: "src", value: "/hero.png" },
          { kind: "static", name: "alt", value: "Hero" },
          { kind: "static", name: "width", value: "560" },
          { kind: "static", name: "height", value: "280" },
          { kind: "static", name: "sizes", value: "100vw" },
          { kind: "static", name: "format", value: "webp" }
        ], events: [], children: [] }
    ] }
];
async function script(ctx) {
  const show = ctx.useState("show", () => false);
  function toggle() {
    show.value = !show.value;
  }
  return { show, toggle };
}
export default createClientComponent({ id: "m0", name: "ImagePatch", file: "ImagePatch.vue", script, template: __template, handlers: ["toggle"] });
`,
      "utf8",
    );

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <button data-rx-on-click="s0:m0:toggle">Toggle</button>
      <span data-rx-block="s0:b0" style="display: contents;"></span>
    `;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {
          s0: {
            id: "s0",
            moduleId: "m0",
            state: { show: false },
            asyncData: {}
          }
        },
        modules: {
          m0: pathToFileURL(handlerFile).href
        },
        config: {
          public: {
            image: {
              quality: 80
            }
          }
        }
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    window.document.querySelector("button")!.dispatchEvent(new window.MouseEvent("click", { bubbles: true, button: 0 }));
    await waitForHtml(window, "<img");

    const html = window.document.body.innerHTML;
    expect(html).toContain("/__resux/image?src=%2Fhero.webp&amp;original=%2Fhero.png&amp;w=560&amp;h=280&amp;q=80&amp;f=webp");
    expect(html).toContain('srcset="/__resux/image?src=%2Fhero.webp&amp;original=%2Fhero.png&amp;w=320&amp;h=160&amp;q=80&amp;f=webp 320w, /__resux/image?src=%2Fhero.webp&amp;original=%2Fhero.png&amp;w=560&amp;h=280&amp;q=80&amp;f=webp 560w"');
    expect(html).not.toContain("<ResuxImg");
  });

  it("reveals deferred lazy images only after intersection events", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-lazy-reveal-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Home</main></div>
      <picture>
        <source data-rx-lazy-srcset="/img/sample.avif 1x" type="image/avif">
        <img
          data-rx-lazy-image="true"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
          data-rx-lazy-src="/img/sample.webp"
          data-rx-lazy-srcset="/img/sample.webp 1x, /img/sample@2x.webp 2x"
          alt="Sample"
          loading="lazy"
        >
      </picture>
    `;

    let observerCallback: ((entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) | null = null;
    const observedTargets = new Set<Element>();
    class MockIntersectionObserver {
      constructor(
        callback: (entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void
      ) {
        observerCallback = callback;
      }
      observe(target: Element) {
        observedTargets.add(target);
      }
      unobserve(target: Element) {
        observedTargets.delete(target);
      }
      disconnect() {
        observedTargets.clear();
      }
    }

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      IntersectionObserver: MockIntersectionObserver,
      __RESUX__: {
        route: { path: "/", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    const image = window.document.querySelector("img[data-rx-lazy-image]") as HTMLImageElement;
    const source = window.document.querySelector("source[type='image/avif']") as HTMLSourceElement;

    expect(observedTargets.has(image)).toBe(true);
    expect(image.getAttribute("src")).toContain("data:image/gif;base64");
    expect(image.getAttribute("srcset")).toBeNull();
    expect(source.getAttribute("srcset")).toBeNull();
    expect(observerCallback).toBeTypeOf("function");

    observerCallback!([{ target: image, isIntersecting: true, intersectionRatio: 1 }]);

    expect(image.getAttribute("src")).toBe("/img/sample.webp");
    expect(image.getAttribute("srcset")).toBe("/img/sample.webp 1x, /img/sample@2x.webp 2x");
    expect(source.getAttribute("srcset")).toBe("/img/sample.avif 1x");
    expect(image.getAttribute("data-rx-lazy-ready")).toBe("true");
    expect(image.getAttribute("data-resux-revealed")).toBe("true");
    expect(image.getAttribute("data-resux-img")).toBe("loading");
  });

  it("keeps image placeholders until decode settles", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-image-decode-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <img
        data-resux-media="img"
        data-resux-img="loading"
        data-resux-loading="true"
        data-rx-placeholder-src="/__resux/resux-placeholder.svg"
        data-rx-placeholder-active="true"
        data-resux-placeholder-active="true"
        style="background-image: url('/__resux/resux-placeholder.svg'); background-size: cover; background-position: center; background-repeat: no-repeat;"
        src="/media-test/images/hero-square.jpg"
        alt="Decode test"
      >
    `;

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);

    const image = window.document.querySelector("img[data-resux-media='img']") as HTMLImageElement;
    let resolveDecode: (() => void) | null = null;
    image.decode = (() => new Promise<void>((resolve) => {
      resolveDecode = resolve;
    })) as HTMLImageElement["decode"];

    image.dispatchEvent(new window.Event("load", { bubbles: true }));
    expect(image.getAttribute("data-rx-placeholder-active")).toBe("true");
    expect(image.getAttribute("data-resux-img")).toBe("loading");

    resolveDecode?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(image.getAttribute("data-rx-placeholder-active")).toBeNull();
    expect(image.getAttribute("data-resux-img")).toBe("loaded");
  });

  it("handles lazy picture failures once and switches to fallback without reusing failed sources", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-picture-fallback-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <picture data-resux-media="picture">
        <source data-rx-lazy-srcset="/__resux/image?src=%2Fmedia-test%2Fimages%2Fmissing-picture.webp&original=%2Fmedia-test%2Fimages%2Fmissing-picture.jpg&w=840&f=webp" type="image/webp">
        <img
          data-rx-lazy-image="true"
          data-rx-fallback-src="/media-test/images/hero-square.jpg"
          data-rx-placeholder-src="/__resux/resux-placeholder.svg"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
          data-rx-lazy-src="/__resux/image?src=%2Fmedia-test%2Fimages%2Fhero-square.jpg&w=840"
          alt="Broken picture"
          loading="lazy"
        >
      </picture>
    `;

    let observerCallback: ((entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) | null = null;
    class MockIntersectionObserver {
      constructor(callback: (entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) {
        observerCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      IntersectionObserver: MockIntersectionObserver,
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    const image = window.document.querySelector("img[data-rx-lazy-image]") as HTMLImageElement;
    const source = window.document.querySelector("source[type='image/webp']") as HTMLSourceElement;

    observerCallback!([{ target: image, isIntersecting: true, intersectionRatio: 1 }]);
    expect(source.getAttribute("srcset")).toContain("missing-picture.webp");

    Object.defineProperty(image, "currentSrc", {
      configurable: true,
      value: "http://localhost/__resux/image?src=%2Fmedia-test%2Fimages%2Fmissing-picture.webp&original=%2Fmedia-test%2Fimages%2Fmissing-picture.jpg&w=840&f=webp"
    });
    image.dispatchEvent(new window.Event("error", { bubbles: true }));

    expect(source.getAttribute("srcset")).toBeNull();
    expect(image.getAttribute("src")).toBe("/media-test/images/hero-square.jpg");
    expect(image.getAttribute("data-resux-error-handled")).toBe("true");
    expect(image.getAttribute("data-resux-fallback-active")).toBe("true");

    image.dispatchEvent(new window.Event("error", { bubbles: true }));
    expect(image.getAttribute("src")).toBe("/media-test/images/hero-square.jpg");
  });

  it("reveals lazy videos once and clears failed sources without retrying", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-video-fallback-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <video
        data-rx-lazy-video="true"
        data-rx-lazy-src="/media-test/videos/missing.mp4"
        data-rx-lazy-preload="metadata"
        data-rx-fallback-poster="/media-test/videos/sample-poster.jpg"
        data-rx-placeholder-src="/__resux/resux-placeholder.svg"
        preload="none"
      >
        <source data-rx-lazy-src="/media-test/videos/missing.mp4" type="video/mp4">
      </video>
    `;

    let observerCallback: ((entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) | null = null;
    class MockIntersectionObserver {
      constructor(callback: (entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void) {
        observerCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    let loadCalls = 0;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      IntersectionObserver: MockIntersectionObserver,
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    const video = window.document.querySelector("video") as HTMLVideoElement;
    video.load = () => {
      loadCalls++;
    };

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    const source = window.document.querySelector("source") as HTMLSourceElement;

    observerCallback!([{ target: video, isIntersecting: true, intersectionRatio: 1 }]);
    expect(source.getAttribute("src")).toBe("/media-test/videos/missing.mp4");
    expect(video.getAttribute("preload")).toBe("metadata");
    expect(video.getAttribute("data-resux-revealed")).toBe("true");
    expect(video.getAttribute("data-resux-video-loading")).toBe("true");
    expect(loadCalls).toBe(1);

    Object.defineProperty(video, "currentSrc", {
      configurable: true,
      value: "http://localhost/media-test/videos/missing.mp4"
    });
    video.dispatchEvent(new window.Event("error", { bubbles: true }));

    expect(video.getAttribute("src")).toBeNull();
    expect(source.getAttribute("src")).toBeNull();
    expect(video.getAttribute("poster")).toBe("/media-test/videos/sample-poster.jpg");
    expect(video.getAttribute("data-resux-error-handled")).toBe("true");

    video.dispatchEvent(new window.Event("error", { bubbles: true }));
    expect(loadCalls).toBe(1);
  });

  it("applies video click zones, skip actions, and control-safe interactions", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-video-speed-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <div
        data-rx-video-shell="true"
        data-rx-video-controls-ready="true"
        data-rx-video-icon-play=">"
        data-rx-video-icon-pause="||"
        data-rx-video-icon-mute="M"
        data-rx-video-icon-unmute="S"
        data-rx-video-icon-fullscreen="[ ]"
        data-rx-video-icon-exit-fullscreen="X"
        data-rx-video-speed-control="true"
        data-rx-video-speeds="0.5,0.75,1,1.25,1.5,2"
        data-rx-video-default-speed="1.25"
        data-rx-video-show-speed-icon="true"
        data-rx-video-speed-label="Playback speed"
        data-rx-video-skip-controls="true"
        data-rx-video-side-click-skip="true"
        data-rx-video-click-to-play="true"
        data-rx-video-double-click-fullscreen="true"
        data-rx-video-has-interaction-zones="true"
        data-rx-video-skip-backward="5"
        data-rx-video-skip-forward="10"
        data-rx-video-show-skip-overlay="true"
        data-rx-video-disable-skip-on-controls="true"
        data-rx-video-custom-controls="true"
      >
        <video data-resux-media="video" data-rx-video-default-speed="1.25" data-resux-video="ready"></video>
        <div class="rx-video-click-zones" data-rx-video-click-zones data-rx-video-skip-overlay-zone aria-hidden="false">
          <button type="button" class="rx-video-zone rx-video-zone-left" data-rx-video-zone="left" data-resux-video-zone="left" aria-label="Skip backward 5s"></button>
          <button type="button" class="rx-video-zone rx-video-zone-center" data-rx-video-zone="center" data-resux-video-zone="center" aria-label="Toggle play or pause video"></button>
          <button type="button" class="rx-video-zone rx-video-zone-right" data-rx-video-zone="right" data-resux-video-zone="right" aria-label="Skip forward 10s"></button>
        </div>
        <div class="rx-video-controls" data-rx-video-controls data-resux-video-control="true" role="group" aria-label="Video controls">
          <button type="button" class="rx-video-btn rx-video-toggle" data-rx-video-toggle data-resux-video-control="true" aria-label="Play video">></button>
          <span class="rx-video-time" data-rx-video-current>0:00</span>
          <input class="rx-video-seek" data-rx-video-seek data-resux-video-control="true" type="range" min="0" max="100" step="0.1" value="0" aria-label="Seek video">
          <span class="rx-video-time" data-rx-video-duration>0:00</span>
          <button type="button" class="rx-video-btn rx-video-mute" data-rx-video-mute data-resux-video-control="true" aria-label="Toggle mute">S</button>
          <input class="rx-video-volume" data-rx-video-volume data-resux-video-control="true" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume">
          <button type="button" class="rx-video-btn rx-video-speed" data-rx-video-speed data-resux-video-control="true" aria-label="Playback speed">>> 1x</button>
          <button type="button" class="rx-video-btn rx-video-fullscreen" data-rx-video-fullscreen data-resux-video-control="true" aria-label="Toggle fullscreen">[ ]</button>
        </div>
      </div>
    `;

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);

    const video = window.document.querySelector("video[data-resux-media='video']") as HTMLVideoElement;
    const shell = window.document.querySelector("[data-rx-video-shell='true']") as HTMLElement;
    const speedButton = window.document.querySelector("[data-rx-video-speed]") as HTMLButtonElement;
    const leftZone = window.document.querySelector("[data-rx-video-zone='left']") as HTMLButtonElement;
    const centerZone = window.document.querySelector("[data-rx-video-zone='center']") as HTMLButtonElement;
    const rightZone = window.document.querySelector("[data-rx-video-zone='right']") as HTMLButtonElement;
    const seekInput = window.document.querySelector("[data-rx-video-seek]") as HTMLInputElement;

    let paused = true;
    let playCalls = 0;
    let pauseCalls = 0;
    Object.defineProperty(video, "paused", {
      configurable: true,
      get: () => paused,
    });
    video.play = (() => {
      paused = false;
      playCalls++;
      return Promise.resolve();
    }) as HTMLMediaElement["play"];
    video.pause = (() => {
      paused = true;
      pauseCalls++;
    }) as HTMLMediaElement["pause"];

    let fullscreenElement: Element | null = null;
    Object.defineProperty(window.document, "fullscreenElement", {
      configurable: true,
      get: () => fullscreenElement,
    });
    (shell as unknown as { requestFullscreen: () => Promise<void> }).requestFullscreen = async () => {
      fullscreenElement = shell;
    };
    (window.document as unknown as { exitFullscreen: () => Promise<void> }).exitFullscreen = async () => {
      fullscreenElement = null;
    };

    expect(video.playbackRate).toBe(1.25);
    expect(speedButton.textContent).toContain("1.25x");

    speedButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    expect(video.playbackRate).toBe(1.5);
    expect(speedButton.textContent).toContain("1.5x");

    Object.defineProperty(video, "duration", { configurable: true, value: 120 });
    video.currentTime = 40;
    leftZone.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    expect(video.currentTime).toBe(35);

    rightZone.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    expect(video.currentTime).toBe(45);

    video.currentTime = 2;
    leftZone.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    expect(video.currentTime).toBe(0);

    video.currentTime = 118;
    rightZone.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    expect(video.currentTime).toBe(120);

    centerZone.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 240));
    expect(playCalls).toBe(1);
    expect(video.getAttribute("data-resux-video")).toBe("playing");

    centerZone.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    await new Promise((resolve) => setTimeout(resolve, 240));
    expect(pauseCalls).toBe(1);

    centerZone.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true, cancelable: true, button: 0 }));
    expect(fullscreenElement).toBe(shell);

    video.currentTime = 10;
    seekInput.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    expect(video.currentTime).toBe(10);
  });

  it("preserves playback state when switching managed video quality options", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-video-quality-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const qualityOptions = [
      {
        id: "480p",
        label: "480p",
        sources: [{ src: "/media-test/videos/sample-480.mp4", type: "video/mp4" }],
      },
      {
        id: "720p",
        label: "720p",
        sources: [{ src: "/media-test/videos/sample-720.mp4", type: "video/mp4" }],
      },
    ];
    const serializedQualities = JSON.stringify(qualityOptions).replace(/"/g, "&quot;");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <div
        data-rx-video-shell="true"
        data-rx-video-controls-ready="true"
        data-rx-video-custom-controls="true"
        data-rx-video-quality-control="true"
        data-rx-video-qualities="${serializedQualities}"
        data-rx-video-default-quality="480p"
      >
        <video
          data-resux-media="video"
          data-rx-video-active-quality="480p"
          data-rx-video-active-source-signature="/media-test/videos/sample-480.mp4|video/mp4"
          data-resux-video="playing"
          src="/media-test/videos/sample-480.mp4"
        >
          <source src="/media-test/videos/sample-480.mp4" type="video/mp4">
        </video>
        <div class="rx-video-controls" data-rx-video-controls data-resux-video-control="true" role="group" aria-label="Video controls">
          <button type="button" data-rx-video-toggle data-resux-video-control="true">Play</button>
          <span data-rx-video-current>0:00</span>
          <input data-rx-video-seek data-resux-video-control="true" type="range" min="0" max="100" step="0.1" value="0">
          <span data-rx-video-duration>0:00</span>
          <button type="button" data-rx-video-mute data-resux-video-control="true">Mute</button>
          <input data-rx-video-volume data-resux-video-control="true" type="range" min="0" max="1" step="0.05" value="1">
          <label data-rx-video-quality-wrap data-resux-video-control="true">
            <select data-rx-video-quality data-resux-video-control="true">
              <option value="480p">480p</option>
              <option value="720p">720p</option>
            </select>
          </label>
          <button type="button" data-rx-video-fullscreen data-resux-video-control="true">Fullscreen</button>
        </div>
      </div>
    `;

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {},
      },
      __RESUX_INSTALLED__: false,
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);

    const video = window.document.querySelector("video[data-resux-media='video']") as HTMLVideoElement;
    const qualitySelect = window.document.querySelector("[data-rx-video-quality]") as HTMLSelectElement;
    const source = window.document.querySelector("video source") as HTMLSourceElement;

    let paused = false;
    let playCalls = 0;
    Object.defineProperty(video, "paused", {
      configurable: true,
      get: () => paused,
    });
    video.play = (() => {
      paused = false;
      playCalls++;
      return Promise.resolve();
    }) as HTMLMediaElement["play"];

    let loadCalls = 0;
    video.load = (() => {
      loadCalls++;
    }) as HTMLMediaElement["load"];

    Object.defineProperty(video, "duration", { configurable: true, value: 120 });
    video.currentTime = 42;
    video.playbackRate = 1.5;
    video.volume = 0.35;
    video.muted = true;

    qualitySelect.value = "720p";
    qualitySelect.dispatchEvent(new window.Event("change", { bubbles: true, cancelable: true }));

    expect(loadCalls).toBe(1);
    expect(source.getAttribute("src")).toBe("/media-test/videos/sample-720.mp4");
    expect(video.getAttribute("data-rx-video-active-quality")).toBe("720p");
    expect(video.getAttribute("data-rx-video-pending-quality")).toBe("720p");

    video.dispatchEvent(new window.Event("loadedmetadata", { bubbles: true }));
    video.dispatchEvent(new window.Event("canplay", { bubbles: true }));

    expect(video.currentTime).toBe(42);
    expect(video.playbackRate).toBe(1.5);
    expect(video.volume).toBeCloseTo(0.35);
    expect(video.muted).toBe(true);
    expect(playCalls).toBeGreaterThan(0);
  });

  it("renders deferred page-ready poster markup in the generated client renderer", async () => {
    const runtimeFile = path.join(os.tmpdir(), `resux-video-client-poster-${Date.now()}.mjs`);
    await writeFile(runtimeFile, getClientRuntimeSource().replace("installResux();", "export { renderClientResuxVideo };"), "utf8");
    const { renderClientResuxVideo } = await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    const attrs = Object.entries({
      src: "/media-test/videos/sample-video.mp4",
      poster: "/media-test/videos/sample-poster.jpg",
      deferUntilPageReady: "true",
      controls: "false",
    }).map(([name, value]) => ({ kind: "static", name, value }));
    const html = renderClientResuxVideo({ attrs, children: [] }, {}, {}, "");

    expect({
      nativePoster: /<video\b[^>]*\sposter="\/media-test\/videos\/sample-poster\.jpg"(?:\s|>)/.test(html),
      deferredSource: html.includes('data-rx-lazy-src="/media-test/videos/sample-video.mp4"'),
      eagerSource: html.includes(' src="/media-test/videos/sample-video.mp4"'),
    }).toEqual({ nativePoster: true, deferredSource: true, eagerSource: false });
  });

  it("waits for page-ready before revealing defer-until-page-ready videos", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-video-page-ready-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    let pageReadyState = "loading";
    Object.defineProperty(window.document, "readyState", {
      configurable: true,
      get: () => pageReadyState,
    });
    const nativeWindowAddEventListener = window.addEventListener.bind(window);
    let pageLoadListener: EventListener | null = null;
    vi.spyOn(window, "addEventListener").mockImplementation((type, listener, options) => {
      if (type === "load") {
        pageLoadListener = typeof listener === "function" ? listener : listener.handleEvent.bind(listener);
        return;
      }
      nativeWindowAddEventListener(type, listener, options);
    });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <video
        data-rx-lazy-video="true"
        data-rx-lazy-src="/media-test/videos/sample-video.mp4"
        data-rx-lazy-preload="metadata"
        data-rx-video-defer-ready="true"
        data-rx-video-ready-reveal="true"
        preload="none"
      ></video>
    `;

    let observerConstructed = 0;
    class MockIntersectionObserver {
      constructor() {
        observerConstructed++;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      IntersectionObserver: MockIntersectionObserver,
      requestIdleCallback: (callback: () => void) => {
        callback();
        return 1;
      },
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    const video = window.document.querySelector("video") as HTMLVideoElement;
    let loadCalls = 0;
    video.load = () => {
      loadCalls++;
    };

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);
    expect(video.getAttribute("data-resux-revealed")).toBeNull();
    expect(observerConstructed).toBe(0);
    expect(loadCalls).toBe(0);

    pageReadyState = "complete";
    expect(pageLoadListener).toBeTypeOf("function");
    (pageLoadListener as EventListener)(new window.Event("load"));

    expect(video.getAttribute("data-resux-revealed")).toBe("true");
    expect(video.getAttribute("data-resux-video-loading")).toBe("true");
    expect(video.getAttribute("preload")).toBe("metadata");
    expect(video.getAttribute("src")).toBe("/media-test/videos/sample-video.mp4");
    expect(loadCalls).toBe(1);
  });

  it("blocks managed media anchor navigation to generated assets", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-media-link-guard-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <a href="/_resux/generated/images/abcd1234.webp?src=%2Fmedia-test%2Fimages%2Fhero-large.jpg&cache=1d" id="media-link">
        <img data-resux-media="img" src="/resux-placeholder.svg" alt="media">
      </a>
    `;

    let routeFetchCalls = 0;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      fetch: async () => {
        routeFetchCalls++;
        return new Response(
          JSON.stringify({
            payload: {
              route: { path: "/media", params: {}, query: {} },
              scopes: {},
              modules: {},
              config: { public: {} }
            },
            html: `<main>Media</main>`,
            head: {}
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      },
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);

    const mediaImage = window.document.querySelector("img[data-resux-media='img']") as HTMLImageElement;
    const clickEvent = new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    mediaImage.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(routeFetchCalls).toBe(0);
  });

  it("blocks managed media anchor navigation for generated video assets", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-video-link-guard-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <a href="/_resux/generated/videos/abcd1234.mp4?src=%2Fmedia-test%2Fvideos%2Fsample-video.mp4&cache=1d" id="video-link">
        <video data-resux-media="video" src="/media-test/videos/sample-video.mp4"></video>
      </a>
    `;

    let routeFetchCalls = 0;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      fetch: async () => {
        routeFetchCalls++;
        return new Response(
          JSON.stringify({
            payload: {
              route: { path: "/media", params: {}, query: {} },
              scopes: {},
              modules: {},
              config: { public: {} }
            },
            html: `<main>Media</main>`,
            head: {}
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      },
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);

    const mediaVideo = window.document.querySelector("video[data-resux-media='video']") as HTMLVideoElement;
    const clickEvent = new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    mediaVideo.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(routeFetchCalls).toBe(0);
  });

  it("ignores router interception for media control targets inside anchors", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-media-click-ignore-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const window = new Window({ url: "http://localhost/media" });
    window.document.body.innerHTML = `
      <div id="__resux"><main>Media</main></div>
      <a href="/about" id="about-link">
        <button type="button" data-rx-video-toggle>Play</button>
      </a>
    `;

    let routeFetchCalls = 0;
    Object.assign(globalThis, {
      document: window.document,
      window,
      location: window.location,
      history: window.history,
      fetch: async () => {
        routeFetchCalls++;
        return new Response(
          JSON.stringify({
            payload: {
              route: { path: "/about", params: {}, query: {} },
              scopes: {},
              modules: {},
              config: { public: {} }
            },
            html: "<main>About</main>",
            head: {}
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      },
      __RESUX__: {
        route: { path: "/media", params: {}, query: {} },
        scopes: {},
        modules: {}
      },
      __RESUX_INSTALLED__: false
    });

    await import(`${pathToFileURL(runtimeFile).href}?test=${nextRuntimeImportQuery()}`);

    const playButton = window.document.querySelector("[data-rx-video-toggle]") as HTMLButtonElement;
    const clickEvent = new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    playButton.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(false);
    expect(routeFetchCalls).toBe(0);
  });
});
