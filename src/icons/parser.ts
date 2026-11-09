import type { IconData, IconPathData } from "./types.js";

export function readSvgAttribute(source: string, name: string): string {
  const escapedName = name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const pattern = String.raw`(?:^|\s)${escapedName}\s*=\s*(?:"([^"]*)"|'([^']*)')`;
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

function updateInheritedStackForGroup(
  source: string,
  closing: boolean,
  inheritedStack: Array<Partial<IconData>>
): void {
  if (closing) {
    if (inheritedStack.length > 1) inheritedStack.pop();
    return;
  }
  inheritedStack.push({
    ...inheritedStack.at(-1),
    ...inheritedSvgPresentation(source),
  });
  if (/\/\s*>$/.test(source) && inheritedStack.length > 1) {
    inheritedStack.pop();
  }
}

function parsePathElement(
  source: string,
  inherited: Partial<IconData> | undefined
): IconPathData | null {
  const d = readSvgAttribute(source, "d").slice(0, 65_536);
  if (!d) return null;
  return {
    d,
    ...inherited,
    ...readSvgPresentationAttributes(source),
  };
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
    const closing = source.startsWith("</");
    const tag = /^<\/?([A-Za-z]+)/.exec(source)?.[1]?.toLowerCase();
    if (!tag || tag === "svg") continue;

    if (tag === "g") {
      updateInheritedStackForGroup(source, closing, inheritedStack);
      continue;
    }

    if (closing || paths.length >= 128) continue;
    const pathEntry = parsePathElement(source, inheritedStack.at(-1));
    if (pathEntry) paths.push(pathEntry);
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
