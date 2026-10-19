import { DEFAULT_ICON_SIZE } from "./constants.js";
import { buildCssMaskStyle } from "./css-mode.js";
import { resolveIconSync } from "./resolver.js";
import type { IconData, ResuxIconsConfig } from "./types.js";

function readAttr(tag: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(tag);
  return match?.[1] ?? match?.[2] ?? null;
}

function hasBooleanAttr(tag: string, name: string, value: string): boolean {
  return new RegExp(`(?:^|\\s):?${name}\\s*=\\s*(?:"${value}"|'${value}')`, "i").test(tag);
}

function iconDataToSvgMarkup(data: IconData, size: string, customClass: string): string {
  const viewBox = data.viewBox || "0 0 24 24";
  const fill = data.fill || "currentColor";
  const classes = ["inline-block shrink-0 align-middle", customClass].filter(Boolean).join(" ");

  let content = "";
  if (data.body) {
    content = data.body;
  } else if (data.paths?.length) {
    content = data.paths
      .map((p) => {
        let attrs = `d="${p.d}"`;
        if (p.fill) attrs += ` fill="${p.fill}"`;
        if (p.stroke) attrs += ` stroke="${p.stroke}"`;
        if (p.strokeWidth) attrs += ` stroke-width="${p.strokeWidth}"`;
        if (p.opacity) attrs += ` opacity="${p.opacity}"`;
        return `<path ${attrs}/>`;
      })
      .join("");
  } else if (data.path) {
    content = `<path d="${data.path}"${data.opacity ? ` opacity="${data.opacity}"` : ""}/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size}" height="${size}" fill="${fill}" class="${classes}" style="width: ${size}; height: ${size};" aria-hidden="true">${content}</svg>`;
}

export function transformStaticIcons(templateCode: string, config?: ResuxIconsConfig): string {
  if (!templateCode || typeof templateCode !== "string") return templateCode;

  const iconTagPattern = /<(Icon|ResuxIcon)\b([^>]*?)(?:\/?>|>.*?<\/\1>)/gis;

  return templateCode.replace(iconTagPattern, (fullMatch, _tag, attrs) => {
    // If name is dynamic (:name="..."), skip compile-time inlining
    if (/\s:name\s*=/i.test(attrs)) {
      return fullMatch;
    }

    const name = readAttr(attrs, "name");
    if (!name) return fullMatch;

    const size = readAttr(attrs, "size") || String(config?.defaultSize || DEFAULT_ICON_SIZE);
    const mode = readAttr(attrs, "mode") || config?.mode || "svg";
    const customClass = readAttr(attrs, "class") || "";
    const isSsrDisabled = hasBooleanAttr(attrs, "ssr", "false") || config?.ssr === false;

    // If SSR is disabled, emit a lightweight placeholder
    if (isSsrDisabled) {
      const placeholderClasses = ["resux-icon-placeholder inline-block shrink-0 align-middle", customClass]
        .filter(Boolean)
        .join(" ");
      return `<span class="${placeholderClasses}" data-icon-name="${name}" data-icon-ssr="false" style="width: ${size}; height: ${size}; display: inline-block;" aria-hidden="true"></span>`;
    }

    // Try resolving statically at build time
    const data = resolveIconSync(name, config);
    if (!data) {
      // Leave intact for runtime component resolution
      return fullMatch;
    }

    if (mode === "css") {
      const style = buildCssMaskStyle(data, size);
      const styleString = Object.entries(style)
        .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`)
        .join("; ");
      const cssClasses = ["resux-icon resux-icon--css inline-block shrink-0 align-middle", customClass]
        .filter(Boolean)
        .join(" ");
      return `<span class="${cssClasses}" style="${styleString};" aria-hidden="true"></span>`;
    }

    return iconDataToSvgMarkup(data, size, customClass);
  });
}

export function createIconsVitePlugin(config?: ResuxIconsConfig) {
  return {
    name: "resux:icons-static-transform",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      if (id.endsWith(".vue") || id.includes("vue&type=template")) {
        return {
          code: transformStaticIcons(code, config),
          map: null,
        };
      }
      return null;
    },
  };
}
