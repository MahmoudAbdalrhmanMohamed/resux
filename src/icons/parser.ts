import type { IconData, IconPathData } from "./types.js";

export function readSvgAttribute(source: string, name: string): string {
  const escapedName = name.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
  const pattern = "(?:^|\\s)" + escapedName + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')";
  const match = new RegExp(pattern, "i").exec(source);
  return (match?.[1] ?? match?.[2] ?? "").trim();
}

export function readSvgPresentationAttributes(source: string): Partial<IconData> {
  const output: Partial<IconData> = {};
  const attributes = [
    ["opacity", "opacity"],
    ["fill", "fill"],
    ["stroke", "stroke"],
    ["stroke-width", "strokeWidth"],
    ["stroke-linecap", "strokeLinecap"],
    ["stroke-linejoin", "strokeLinejoin"],
    ["fill-rule", "fillRule"],
    ["clip-rule", "clipRule"],
  ] as const;
  for (const [attributeName, propertyName] of attributes) {
    const value = readSvgAttribute(source, attributeName);
    if (value) output[propertyName] = value;
  }
  return output;
}

function inheritedSvgPresentation(source: string): Partial<IconData> {
  const { opacity: _opacity, ...inherited } = readSvgPresentationAttributes(source);
  return inherited;
}

export function parseSvgText(svgText: string): IconData | null {
  if (!svgText || typeof svgText !== "string") return null;

  const svgRoot = /<svg\b[^>]*>/i.exec(svgText)?.[0];
  if (!svgRoot) return null;

  const rootPresentation = readSvgPresentationAttributes(svgRoot);
  const inheritedStack: Array<Partial<IconData>> = [inheritedSvgPresentation(svgRoot)];
  const paths: IconPathData[] = [];

  for (const match of svgText.matchAll(/<\/?(?:svg|g|path)\b[^>]*>/gi)) {
    const source = match[0];
    const closing = /^<\//.test(source);
    const tag = /^<\/?([A-Za-z]+)/.exec(source)?.[1]?.toLowerCase();
    if (!tag || tag === "svg") continue;

    if (tag === "g") {
      if (closing) {
        if (inheritedStack.length > 1) inheritedStack.pop();
      } else {
        inheritedStack.push({
          ...inheritedStack[inheritedStack.length - 1],
          ...inheritedSvgPresentation(source),
        });
        if (/\/\s*>$/.test(source) && inheritedStack.length > 1) {
          inheritedStack.pop();
        }
      }
      continue;
    }

    if (closing || paths.length >= 128) continue;
    const d = readSvgAttribute(source, "d").slice(0, 65_536);
    if (!d) continue;
    paths.push({
      d,
      ...inheritedStack[inheritedStack.length - 1],
      ...readSvgPresentationAttributes(source),
    });
  }

  const innerMatch = /<svg\b[^>]*>([\s\S]*?)<\/svg>/i.exec(svgText);
  const innerBody = innerMatch ? innerMatch[1].trim() : "";

  if (!paths.length) {
    if (!innerBody) return null;
    return {
      body: innerBody,
      viewBox: readSvgAttribute(svgRoot, "viewBox") || "0 0 24 24",
      ...rootPresentation,
    };
  }

  return {
    path: paths[0].d,
    paths,
    body: innerBody || undefined,
    viewBox: readSvgAttribute(svgRoot, "viewBox") || "0 0 24 24",
    ...rootPresentation,
  };
}
