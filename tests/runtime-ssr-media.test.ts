import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, renderApp, renderDocument } from "resuxjs/runtime";
import { script } from "./helpers/runtime-fixtures.js";

describe("runtime SSR: media", () => {
  it("builds image URLs with useResuxImage and provider templates", async () => {
    const page = defineComponent({
      id: "m-image-builder",
      name: "ImageBuilderPage",
      file: "ImageBuilderPage.vue",
      handlers: [],
      async script(ctx) {
        const buildImage = ctx.useResuxImage();
        return {
          url: buildImage("/hero.jpg", {
            provider: "cdn",
            width: 640
          })
        };
      },
      template: [{ type: "interpolation", expression: "url", bindingId: "b0" }]
    });

    const result = await renderApp({
      page,
      route: { path: "/gallery", params: {}, query: {} },
      runtimeConfig: {
        public: {
          image: {
            quality: 78,
            format: "webp",
            providers: {
              cdn: {
                baseURL: "https://img.example.com/{src}?w={width}&q={quality}&f={format}"
              }
            }
          }
        }
      }
    });

    expect(result.html).toContain("https://img.example.com/%2Fhero.jpg?w=640&amp;q=78&amp;f=webp");
  });

  it("renders ResuxImg and ResuxPicture with responsive attrs and preload links", async () => {
    const page = defineComponent({
      id: "m-image-components",
      name: "ImageComponentsPage",
      file: "ImageComponentsPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxImg",
          attrs: [
            { kind: "static", name: "src", value: "/images/hero.jpg" },
            { kind: "static", name: "alt", value: "Hero" },
            { kind: "static", name: "width", value: "400" },
            { kind: "static", name: "sizes", value: "100vw" },
            { kind: "static", name: "densities", value: "1,2" },
            { kind: "static", name: "format", value: "webp" },
            { kind: "static", name: "priority", value: "true" }
          ],
          events: [],
          children: []
        },
        {
          type: "element",
          tag: "ResuxPicture",
          attrs: [
            { kind: "static", name: "src", value: "/images/card.jpg" },
            { kind: "static", name: "alt", value: "Card" },
            { kind: "static", name: "widths", value: "320,640" },
            { kind: "static", name: "formats", value: "avif,webp" }
          ],
          events: [],
          children: []
        }
      ]
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} },
      appHead: {
        meta: [{ name: "description", content: "Media page" }],
        link: [
          { rel: "icon", href: "/favicon.svg" },
          { rel: "stylesheet", href: "/styles.css" },
        ],
      },
      runtimeConfig: {
        public: {
          image: {
            quality: 82
          }
        }
      }
    });

    expect(result.html).toContain("<img");
    expect(result.html).toContain("/__resux/image?src=%2Fimages%2Fhero.webp&amp;original=%2Fimages%2Fhero.jpg&amp;w=400&amp;q=82&amp;f=webp");
    expect(result.html).toContain('srcset="/__resux/image?src=%2Fimages%2Fhero.webp&amp;original=%2Fimages%2Fhero.jpg&amp;w=320&amp;q=82&amp;f=webp 320w, /__resux/image?src=%2Fimages%2Fhero.webp&amp;original=%2Fimages%2Fhero.jpg&amp;w=400&amp;q=82&amp;f=webp 400w"');
    expect(result.html).toContain("<picture");
    expect(result.html).toContain('type="image/avif"');
    expect(result.html).toContain('type="image/webp"');
    expect(result.head.link).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rel: "preload",
        as: "image",
        href: "/__resux/image?src=%2Fimages%2Fhero.webp&original=%2Fimages%2Fhero.jpg&w=400&q=82&f=webp",
        imagesrcset: "/__resux/image?src=%2Fimages%2Fhero.webp&original=%2Fimages%2Fhero.jpg&w=320&q=82&f=webp 320w, /__resux/image?src=%2Fimages%2Fhero.webp&original=%2Fimages%2Fhero.jpg&w=400&q=82&f=webp 400w",
        imagesizes: "100vw",
        fetchpriority: "high",
        type: "image/webp",
      })
    ]));

    const documentHtml = renderDocument(result);
    const preloadIndex = documentHtml.indexOf('rel="preload"');
    expect(preloadIndex).toBeGreaterThan(-1);
    expect(preloadIndex).toBeLessThan(documentHtml.indexOf('rel="icon"'));
    expect(preloadIndex).toBeLessThan(documentHtml.indexOf('name="description"'));
  });

  it("treats bare priority/preload attrs as true and emits responsive srcset for sizes-driven ResuxImg", async () => {
    const page = defineComponent({
      id: "m-image-hero-snippet",
      name: "ImageHeroSnippetPage",
      file: "ImageHeroSnippetPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxImg",
          attrs: [
            { kind: "static", name: "src", value: "/images/hero-large.jpg" },
            { kind: "static", name: "alt", value: "Hero" },
            { kind: "static", name: "width", value: "1920" },
            { kind: "static", name: "height", value: "1080" },
            { kind: "static", name: "sizes", value: "(min-width: 1280px) 960px, 100vw" },
            { kind: "static", name: "format", value: "webp" },
            { kind: "static", name: "quality", value: "82" },
            { kind: "static", name: "priority", value: "" },
            { kind: "static", name: "preload", value: "" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} },
    });

    expect(result.html).toContain('loading="eager"');
    expect(result.html).toContain('data-resux-img="loading"');
    expect(result.html).toContain('fetchpriority="high"');
    expect(result.html).toContain('width="1920"');
    expect(result.html).toContain('height="1080"');
    expect(result.html).toContain('sizes="(min-width: 1280px) 960px, 100vw"');
    expect(result.html).toContain('src="/__resux/image?src=%2Fimages%2Fhero-large.webp&amp;original=%2Fimages%2Fhero-large.jpg&amp;w=1920&amp;h=1080&amp;q=82&amp;f=webp"');
    expect(result.html).toContain('/__resux/image?src=%2Fimages%2Fhero-large.webp&amp;original=%2Fimages%2Fhero-large.jpg&amp;w=960&amp;h=540&amp;q=82&amp;f=webp 960w');
    expect(result.html).toContain('/__resux/image?src=%2Fimages%2Fhero-large.webp&amp;original=%2Fimages%2Fhero-large.jpg&amp;w=1920&amp;h=1080&amp;q=82&amp;f=webp 1920w');
    expect(result.head.link).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rel: "preload",
        as: "image",
        href: "/__resux/image?src=%2Fimages%2Fhero-large.webp&original=%2Fimages%2Fhero-large.jpg&w=1920&h=1080&q=82&f=webp",
        fetchpriority: "high",
        imagesizes: "(min-width: 1280px) 960px, 100vw",
        type: "image/webp",
      }),
    ]));
  });

  it("defers explicit lazy image loading until client runtime reveals sources", async () => {
    const page = defineComponent({
      id: "m-image-lazy",
      name: "ImageLazyPage",
      file: "ImageLazyPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxImg",
          attrs: [
            { kind: "static", name: "src", value: "/images/lazy.jpg" },
            { kind: "static", name: "alt", value: "Lazy" },
            { kind: "static", name: "width", value: "320" },
            { kind: "static", name: "loading", value: "lazy" },
          ],
          events: [],
          children: [],
        },
        {
          type: "element",
          tag: "ResuxPicture",
          attrs: [
            { kind: "static", name: "src", value: "/images/lazy-picture.jpg" },
            { kind: "static", name: "alt", value: "Lazy picture" },
            { kind: "static", name: "formats", value: "avif,webp" },
            { kind: "static", name: "loading", value: "lazy" },
            { kind: "static", name: "widths", value: "320,640" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/", params: {}, query: {} },
      runtimeConfig: {
        public: {
          image: {
            quality: 75,
          },
        },
      },
    });

    expect(result.html).toContain('data-rx-lazy-image="true"');
    expect(result.html).toContain('data-resux-img="idle"');
    expect(result.html).toContain('data-rx-lazy-src="/__resux/image?src=%2Fimages%2Flazy.jpg&amp;w=320&amp;q=75"');
    expect(result.html).toContain('data-rx-lazy-root-margin="0px 0px"');
    expect(result.html).toContain('data-rx-lazy-threshold="0"');
    expect(result.html).toContain('src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="');
    expect(result.html).toContain('data-rx-lazy-srcset="/__resux/image?src=%2Fimages%2Flazy-picture.avif&amp;original=%2Fimages%2Flazy-picture.jpg&amp;w=320&amp;q=75&amp;f=avif 320w, /__resux/image?src=%2Fimages%2Flazy-picture.avif&amp;original=%2Fimages%2Flazy-picture.jpg&amp;w=640&amp;q=75&amp;f=avif 640w"');
    expect(result.html).toContain('data-rx-lazy-srcset="/__resux/image?src=%2Fimages%2Flazy-picture.webp&amp;original=%2Fimages%2Flazy-picture.jpg&amp;w=320&amp;q=75&amp;f=webp 320w, /__resux/image?src=%2Fimages%2Flazy-picture.webp&amp;original=%2Fimages%2Flazy-picture.jpg&amp;w=640&amp;q=75&amp;f=webp 640w"');
    expect(result.html).not.toContain('<source type="image/avif" srcset=');
    expect(result.html).not.toContain('<source type="image/webp" srcset=');
  });

  it("reserves media aspect ratio from explicit width and height to reduce CLS", async () => {
    const page = defineComponent({
      id: "m-media-aspect-ratio",
      name: "MediaAspectRatioPage",
      file: "MediaAspectRatioPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxImg",
          attrs: [
            { kind: "static", name: "src", value: "/images/hero.jpg" },
            { kind: "static", name: "alt", value: "Hero" },
            { kind: "static", name: "width", value: "1280" },
            { kind: "static", name: "height", value: "720" },
            { kind: "static", name: "loading", value: "lazy" },
            { kind: "static", name: "placeholder", value: "true" },
          ],
          events: [],
          children: [],
        },
        {
          type: "element",
          tag: "ResuxVideo",
          attrs: [
            { kind: "static", name: "src", value: "/videos/hero.mp4" },
            { kind: "static", name: "width", value: "1280" },
            { kind: "static", name: "height", value: "720" },
            { kind: "static", name: "lazy", value: "true" },
            { kind: "static", name: "placeholder", value: "true" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/media", params: {}, query: {} },
    });

    expect(result.html).toContain("aspect-ratio: 1280 / 720");
    expect(result.html).toContain('style="aspect-ratio: 1280 / 720; display: block; width: 100%; max-width: 100%; height: auto"');
    expect(result.html).toContain('data-resux-video="idle"');
  });

  it("renders ResuxVideo hero preload links and skip-control shell attributes", async () => {
    const page = defineComponent({
      id: "m-video-hero-preload",
      name: "VideoHeroPreloadPage",
      file: "VideoHeroPreloadPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxVideo",
          attrs: [
            { kind: "static", name: "src", value: "/media-test/videos/sample-video.mp4" },
            { kind: "static", name: "controls", value: "true" },
            { kind: "static", name: "hero", value: "true" },
            { kind: "static", name: "priority", value: "true" },
            { kind: "static", name: "preload-link", value: "true" },
            { kind: "static", name: "skip-controls", value: "true" },
            { kind: "static", name: "skip-seconds", value: "10" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/media", params: {}, query: {} },
    });

    expect(result.html).toContain('data-rx-video-hero="true"');
    expect(result.html).toContain('fetchpriority="high"');
    expect(result.html).toContain('data-rx-video-shell="true"');
    expect(result.html).toContain('data-rx-video-skip-controls="true"');
    expect(result.html).toContain('data-rx-video-skip-backward="10"');
    expect(result.html).toContain('data-rx-video-skip-forward="10"');
    expect(result.html).toContain('data-rx-video-skip-overlay-zone');
    expect(result.html).toContain('data-rx-video-click-to-play="true"');
    expect(result.html).toContain('data-rx-video-double-click-fullscreen="true"');
    expect(result.html).toContain('data-rx-video-side-click-skip="true"');
    expect(result.html).toContain('data-resux-video-zone="left"');
    expect(result.html).toContain('data-resux-video-zone="center"');
    expect(result.html).toContain('data-resux-video-zone="right"');
    expect(result.html).toContain('data-resux-video="loading"');
    expect(result.head.link).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rel: "preload",
        as: "video",
        href: "/media-test/videos/sample-video.mp4",
        type: "video/mp4",
        fetchpriority: "high",
      })
    ]));
    const videoPreloads = (result.head.link ?? []).filter(
      (entry) => entry.rel === "preload" && entry.as === "video",
    );
    expect(videoPreloads).toHaveLength(1);
  });

  it("does not emit a video preload link for lazy videos by default", async () => {
    const page = defineComponent({
      id: "m-video-lazy-no-preload",
      name: "VideoLazyNoPreloadPage",
      file: "VideoLazyNoPreloadPage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxVideo",
          attrs: [
            { kind: "static", name: "src", value: "/media-test/videos/sample-video.mp4" },
            { kind: "static", name: "lazy", value: "true" },
            { kind: "static", name: "controls", value: "true" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/media", params: {}, query: {} },
    });

    const videoPreloads = (result.head.link ?? []).filter(
      (entry) => entry.rel === "preload" && entry.as === "video",
    );
    expect(videoPreloads).toHaveLength(0);
  });

  it("normalizes preload as values in SSR head output", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const page = defineComponent({
        id: "m-preload-normalize",
        name: "PreloadNormalizePage",
        file: "PreloadNormalizePage.vue",
        handlers: [],
        async script() {
          return {};
        },
        template: [{ type: "element", tag: "main", attrs: [], events: [], children: [{ type: "text", value: "Head" }] }],
      });

      const result = await renderApp({
        page,
        route: { path: "/head", params: {}, query: {} },
        appHead: {
          link: [
            { rel: "preload", as: "priority", href: "/images/hero.webp" },
            { rel: "preload", as: "fetchpriority", href: "/styles/app.css" },
            { rel: "preload", as: "video/mp4", href: "/media-test/videos/sample-video.mp4" },
            { rel: "preload", as: "mp4", href: "/media-test/videos/sample-video-alt.mp4" },
            { rel: "preload", as: "webp", href: "/images/poster.webp" },
            { rel: "modulepreload", as: "module", href: "/__resux/client/chunk.mjs" },
            { rel: "preload", as: "resux-image", href: "/unknown-asset" },
          ],
        },
      });
      const html = renderDocument(result);

      expect(html).toContain('rel="preload" as="image" href="/images/hero.webp"');
      expect(html).toContain('rel="preload" as="style" href="/styles/app.css"');
      expect(html).toContain('rel="preload" as="video" href="/media-test/videos/sample-video.mp4"');
      expect(html).toContain('rel="preload" as="video" href="/media-test/videos/sample-video-alt.mp4"');
      expect(html).toContain('rel="preload" as="image" href="/images/poster.webp"');
      expect(html).toContain('rel="modulepreload" href="/__resux/client/chunk.mjs"');
      expect(html).not.toContain('as="module"');
      expect(html).not.toContain('as="priority"');
      expect(html).not.toContain('as="mp4"');
      expect(html).not.toContain('as="video/mp4"');
      expect(html).not.toContain('as="webp"');
      expect(html).not.toContain('as="fetchpriority"');
      expect(html).not.toContain('as="resux-image"');
      expect(warnSpy).toHaveBeenCalledWith(
        '[resux] Skipping invalid preload link for "/unknown-asset". Unsupported as="resux-image".',
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("uses custom controls by default and supports controls load/icon configuration", async () => {
    const page = defineComponent({
      id: "m-video-controls-mode",
      name: "VideoControlsModePage",
      file: "VideoControlsModePage.vue",
      handlers: [],
      async script() {
        return {};
      },
      template: [
        {
          type: "element",
          tag: "ResuxVideo",
          attrs: [
            { kind: "static", name: "src", value: "/media-test/videos/sample-video.mp4" },
            { kind: "static", name: "controls", value: "true" },
            { kind: "static", name: "controls-load", value: "lazy" },
            { kind: "static", name: "icons-load", value: "lazy" },
            { kind: "static", name: "theme", value: "light" },
            { kind: "static", name: "accent-color", value: "#22c55e" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/video", params: {}, query: {} },
      runtimeConfig: {
        public: {
          video: {
            controlsMode: "custom",
            controlsLoad: "lazy",
            iconsLoad: "lazy",
          },
        },
      },
    });

    expect(result.html).toContain('data-rx-video-shell="true"');
    expect(result.html).toContain('data-rx-video-custom-controls="true"');
    expect(result.html).toContain('data-rx-video-controls-load="lazy"');
    expect(result.html).toContain('data-rx-video-icons-load="lazy"');
    expect(result.html).toContain('data-rx-video-theme="light"');
    expect(result.html).toContain('data-rx-video-controls-activated="false"');
    expect(result.html).toContain('data-rx-video-icon-play-fallback="Play"');
    expect(result.html).toContain('data-rx-video-show-progress="true"');
  });

  it("builds generated video transform URLs when format and quality variants are requested", async () => {
    const page = defineComponent({
      id: "m-video-transform-url",
      name: "VideoTransformUrlPage",
      file: "VideoTransformUrlPage.vue",
      handlers: [],
      async script() {
        return {
          transformFormats: ["webm", "mp4"],
          transformQualities: [480, 720],
        };
      },
      template: [
        {
          type: "element",
          tag: "ResuxVideo",
          attrs: [
            { kind: "static", name: "src", value: "/media-test/videos/sample-video.mp4" },
            { kind: "dynamic", name: "formats", value: "transformFormats", bindingId: "b0" },
            { kind: "dynamic", name: "qualities", value: "transformQualities", bindingId: "b1" },
            { kind: "static", name: "controls", value: "true" },
            { kind: "static", name: "quality-control", value: "true" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/video", params: {}, query: {} },
      runtimeConfig: {
        public: {
          video: {
            transforms: {
              enabled: true,
              cache: true,
            },
          },
        },
      },
    });

    expect(result.html).toContain("/_resux/generated/videos/");
    expect(result.html).toContain("format=webm");
    expect(result.html).toContain("quality=480");
    expect(result.html).toContain('cache=1d');
    expect(result.html).toContain('<option value="480p" selected>480p</option>');
    expect(result.html).toContain('<option value="720p">720p</option>');
    expect(result.html).toContain('data-rx-video-quality-control="true"');
  });

  it("keeps original video source when format is explicitly disabled", async () => {
    const page = defineComponent({
      id: "m-video-transform-disabled",
      name: "VideoTransformDisabledPage",
      file: "VideoTransformDisabledPage.vue",
      handlers: [],
      async script() {
        return {
          disableFormat: null,
        };
      },
      template: [
        {
          type: "element",
          tag: "ResuxVideo",
          attrs: [
            { kind: "static", name: "src", value: "/media-test/videos/sample-video.mp4" },
            { kind: "dynamic", name: "format", value: "disableFormat", bindingId: "b0" },
            { kind: "static", name: "controls", value: "true" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/video", params: {}, query: {} },
      runtimeConfig: {
        public: {
          video: {
            transforms: {
              enabled: true,
              cache: true,
            },
          },
        },
      },
    });

    expect(result.html).toContain('src="/media-test/videos/sample-video.mp4"');
    expect(result.html).not.toContain("/_resux/generated/videos/");
    expect(result.html).not.toContain("/__resux/video?");
  });

  it("derives quality selector options from source quality labels", async () => {
    const page = defineComponent({
      id: "m-video-quality-from-sources",
      name: "VideoQualityFromSourcesPage",
      file: "VideoQualityFromSourcesPage.vue",
      handlers: [],
      async script() {
        return {
          sourceVariants: [
            { src: "/media-test/videos/sample-480.mp4", type: "video/mp4", quality: "480p" },
            { src: "/media-test/videos/sample-720.mp4", type: "video/mp4", quality: "720p" },
          ],
        };
      },
      template: [
        {
          type: "element",
          tag: "ResuxVideo",
          attrs: [
            { kind: "dynamic", name: "sources", value: "sourceVariants", bindingId: "b0" },
            { kind: "static", name: "controls", value: "true" },
            { kind: "static", name: "quality-control", value: "true" },
          ],
          events: [],
          children: [],
        },
      ],
    });

    const result = await renderApp({
      page,
      route: { path: "/video", params: {}, query: {} },
    });

    expect(result.html).toContain('data-rx-video-quality-control="true"');
    expect(result.html).toContain('<option value="480p" selected>480p</option>');
    expect(result.html).toContain('<option value="720p">720p</option>');
    expect(result.html).toContain('data-rx-video-default-quality="480p"');
  });
});
