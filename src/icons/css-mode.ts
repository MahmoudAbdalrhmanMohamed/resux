import { h, type VNode } from "vue";
import type { IconData } from "./types.js";

export function iconDataToSvgString(data: IconData): string {
  const viewBox = data.viewBox || "0 0 24 24";

  if (data.body) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${data.body}</svg>`;
  }

  const paths = data.paths?.length
    ? data.paths
    : [{ d: data.path || "", opacity: data.opacity, fill: data.fill, stroke: data.stroke }];

  const pathElements = paths
    .map((p) => {
      let attrs = `d="${p.d}"`;
      if (p.fill) attrs += ` fill="${p.fill}"`;
      if (p.stroke) attrs += ` stroke="${p.stroke}"`;
      if (p.strokeWidth) attrs += ` stroke-width="${p.strokeWidth}"`;
      if (p.strokeLinecap) attrs += ` stroke-linecap="${p.strokeLinecap}"`;
      if (p.strokeLinejoin) attrs += ` stroke-linejoin="${p.strokeLinejoin}"`;
      if (p.opacity) attrs += ` opacity="${p.opacity}"`;
      return `<path ${attrs}/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${pathElements}</svg>`;
}

export function svgToDataUri(svg: string): string {
  // Clean, minimal escaping for inline svg in CSS url()
  const cleanSvg = svg.trim().replace(/\s+/g, " ");
  const encoded = encodeURIComponent(cleanSvg)
    .replace(/%20/g, " ")
    .replace(/%3D/g, "=")
    .replace(/%3A/g, ":")
    .replace(/%2F/g, "/")
    .replace(/%22/g, "'");

  return `data:image/svg+xml;utf8,${encoded}`;
}

export function buildCssMaskStyle(data: IconData, size: string): Record<string, string> {
  const svg = iconDataToSvgString(data);
  const dataUri = svgToDataUri(svg);
  const maskValue = `url("${dataUri}") no-repeat 50% 50%`;

  return {
    width: size,
    height: size,
    display: "inline-block",
    backgroundColor: "currentColor",
    mask: maskValue,
    WebkitMask: maskValue,
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
  };
}

export function renderCssMaskIcon(
  data: IconData,
  size: string,
  customClass?: string,
  attrs: Record<string, unknown> = {}
): VNode {
  const style = buildCssMaskStyle(data, size);
  const classes = ["resux-icon resux-icon--css inline-block shrink-0 align-middle", customClass]
    .filter(Boolean)
    .join(" ");

  return h("span", {
    class: classes,
    style,
    "aria-hidden": "true",
    ...attrs,
  });
}
