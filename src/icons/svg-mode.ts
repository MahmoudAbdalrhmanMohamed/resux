import { h, type Ref, type VNode } from "vue";
import type { IconData } from "./types.js";

export function renderSvgIcon(
  data: IconData,
  size: string,
  customClass?: string,
  attrs: Record<string, unknown> = {},
  nodeRef?: Ref<HTMLElement | null>
): VNode {
  const viewBox = data.viewBox || "0 0 24 24";
  const classes = ["inline-block shrink-0 align-middle", customClass].filter(Boolean).join(" ");

  const hasPaths = Boolean(data.paths?.length || data.path);
  const childVNodes: VNode[] = [];

  if (hasPaths) {
    const paths = data.paths?.length
      ? data.paths
      : [{ d: data.path || "", opacity: data.opacity }];

    for (let i = 0; i < paths.length; i++) {
      const entry = paths[i];
      childVNodes.push(
        h("path", {
          key: i,
          d: entry.d,
          fill: entry.fill,
          stroke: entry.stroke,
          "stroke-width": entry.strokeWidth,
          "stroke-linecap": entry.strokeLinecap,
          "stroke-linejoin": entry.strokeLinejoin,
          "fill-rule": entry.fillRule || data.fillRule || "nonzero",
          "clip-rule": entry.clipRule || data.clipRule || "nonzero",
          opacity: entry.opacity,
        })
      );
    }
  } else if (data.body) {
    childVNodes.push(
      h("g", {
        innerHTML: data.body,
      })
    );
  }

  return h(
    "svg",
    {
      ref: nodeRef,
      xmlns: "http://www.w3.org/2000/svg",
      viewBox,
      width: size,
      height: size,
      fill: data.fill || "currentColor",
      stroke: data.stroke,
      "stroke-width": data.strokeWidth,
      "stroke-linecap": data.strokeLinecap,
      "stroke-linejoin": data.strokeLinejoin,
      "fill-rule": data.fillRule,
      "clip-rule": data.clipRule,
      opacity: data.paths?.length ? data.opacity : undefined,
      class: classes,
      style: { width: size, height: size },
      "aria-hidden": "true",
      ...attrs,
    },
    childVNodes
  );
}
