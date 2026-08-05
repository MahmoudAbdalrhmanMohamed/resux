import { NodeTypes, parse as parseTemplate, type ElementNode, type RootNode, type TemplateChildNode } from "@vue/compiler-dom";
import { parse as parseSfc, type SFCBlock } from "@vue/compiler-sfc";
import ts from "typescript";

export type ResuxDevWarningCode =
  | "RX_EVENT_INLINE_ATTRIBUTE"
  | "RX_EVENT_DIRECT_LISTENER";

export interface ResuxDevWarning {
  code: ResuxDevWarningCode;
  file: string;
  line: number;
  column: number;
  message: string;
}

const INLINE_DOM_EVENT_ATTRIBUTES = new Set([
  "onabort",
  "onanimationcancel",
  "onanimationend",
  "onanimationiteration",
  "onanimationstart",
  "onauxclick",
  "onbeforeinput",
  "onbeforetoggle",
  "onblur",
  "oncancel",
  "oncanplay",
  "oncanplaythrough",
  "onchange",
  "onclick",
  "onclose",
  "oncontextmenu",
  "oncopy",
  "oncut",
  "ondblclick",
  "ondrag",
  "ondragend",
  "ondragenter",
  "ondragleave",
  "ondragover",
  "ondragstart",
  "ondrop",
  "ondurationchange",
  "onemptied",
  "onended",
  "onerror",
  "onfocus",
  "onfocusin",
  "onfocusout",
  "onformdata",
  "onfullscreenchange",
  "onfullscreenerror",
  "ongotpointercapture",
  "oninput",
  "oninvalid",
  "onkeydown",
  "onkeypress",
  "onkeyup",
  "onload",
  "onloadeddata",
  "onloadedmetadata",
  "onloadstart",
  "onlostpointercapture",
  "onmousedown",
  "onmouseenter",
  "onmouseleave",
  "onmousemove",
  "onmouseout",
  "onmouseover",
  "onmouseup",
  "onpaste",
  "onpause",
  "onplay",
  "onplaying",
  "onpointercancel",
  "onpointerdown",
  "onpointerenter",
  "onpointerleave",
  "onpointermove",
  "onpointerout",
  "onpointerover",
  "onpointerup",
  "onprogress",
  "onratechange",
  "onreset",
  "onresize",
  "onscroll",
  "onscrollend",
  "onseeked",
  "onseeking",
  "onselect",
  "onselectionchange",
  "onselectstart",
  "onslotchange",
  "onstalled",
  "onsubmit",
  "onsuspend",
  "ontimeupdate",
  "ontoggle",
  "ontouchcancel",
  "ontouchend",
  "ontouchmove",
  "ontouchstart",
  "ontransitioncancel",
  "ontransitionend",
  "ontransitionrun",
  "ontransitionstart",
  "onvolumechange",
  "onwaiting",
  "onwheel",
]);

const DOM_QUERY_METHODS = new Set([
  "getElementById",
  "getElementsByClassName",
  "getElementsByName",
  "getElementsByTagName",
  "getElementsByTagNameNS",
  "querySelector",
  "querySelectorAll",
]);

const GLOBAL_EVENT_TARGETS = new Set(["document", "globalThis", "window"]);

export function collectResuxDevWarnings(source: string, file = "component.vue"): ResuxDevWarning[] {
  if (!isNormalResuxComponent(file)) {
    return [];
  }

  try {
    const parsed = parseSfc(source, { filename: file });
    if (parsed.errors.length > 0) {
      return [];
    }

    const warnings: ResuxDevWarning[] = [];
    const templateRefs = new Set<string>();
    const template = parsed.descriptor.template;

    if (template) {
      collectTemplateWarnings(source, file, template, templateRefs, warnings);
    }

    for (const block of [parsed.descriptor.script, parsed.descriptor.scriptSetup]) {
      if (block) {
        collectScriptWarnings(source, file, block, templateRefs, warnings);
      }
    }

    return dedupeWarnings(warnings);
  } catch {
    // Development diagnostics must never make a valid compilation fail.
    return [];
  }
}

export function emitResuxDevWarnings(
  source: string,
  file: string,
  emitted = new Set<string>(),
): void {
  for (const warning of collectResuxDevWarnings(source, file)) {
    const key = `${warning.code}:${warning.file}:${warning.line}:${warning.column}:${warning.message}`;
    if (emitted.has(key)) {
      continue;
    }
    emitted.add(key);
    console.warn(formatResuxDevWarning(warning));
  }
}

export function formatResuxDevWarning(warning: ResuxDevWarning): string {
  return `[Resux dev:${warning.code}] ${warning.file}:${warning.line}:${warning.column} ${warning.message}`;
}

function collectTemplateWarnings(
  source: string,
  file: string,
  block: SFCBlock,
  templateRefs: Set<string>,
  warnings: ResuxDevWarning[],
): void {
  const contentOffset = resolveBlockContentOffset(source, block);
  if (contentOffset < 0) {
    return;
  }

  const root = parseTemplate(block.content, { comments: false });
  visitTemplateChildren(root, (element) => {
    for (const property of element.props) {
      if (property.type !== NodeTypes.ATTRIBUTE) {
        continue;
      }

      const attributeName = property.name.toLowerCase();
      if (attributeName === "ref" && property.value?.content) {
        templateRefs.add(property.value.content);
      }

      if (!INLINE_DOM_EVENT_ATTRIBUTES.has(attributeName)) {
        continue;
      }

      const eventName = attributeName.slice(2);
      const location = locate(source, contentOffset + property.loc.start.offset);
      warnings.push({
        code: "RX_EVENT_INLINE_ATTRIBUTE",
        file,
        ...location,
        message: `Inline DOM handler \`${property.name}\` bypasses Resux event delegation. Use \`@${eventName}\` or \`rx-on:${eventName}\` instead.`,
      });
    }
  });
}

function collectScriptWarnings(
  source: string,
  file: string,
  block: SFCBlock,
  templateRefs: ReadonlySet<string>,
  warnings: ResuxDevWarning[],
): void {
  const contentOffset = resolveBlockContentOffset(source, block);
  if (contentOffset < 0) {
    return;
  }

  const sourceFile = ts.createSourceFile(
    file,
    block.content,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(block.lang),
  );
  const domTargets = new Set(templateRefs);

  walk(sourceFile, (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) {
      return;
    }

    if (
      templateRefs.has(node.name.text)
      || typeLooksLikeDomElement(node.type, sourceFile)
      || isDomQueryExpression(node.initializer)
    ) {
      domTargets.add(node.name.text);
    }
  });

  walk(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
      return;
    }
    if (node.expression.name.text !== "addEventListener") {
      return;
    }

    const receiver = unwrapExpression(node.expression.expression);
    if (isGlobalEventTarget(receiver) || !isLikelyDomElement(receiver, domTargets)) {
      return;
    }

    const eventName = readStringLiteral(node.arguments[0]);
    const eventLabel = eventName && /^[a-z][\w:-]*$/i.test(eventName)
      ? `@${eventName}`
      : "a template @event handler";
    const listenerLabel = eventName
      ? `addEventListener("${eventName}")`
      : "addEventListener";
    const location = locate(source, contentOffset + node.expression.name.getStart(sourceFile));
    warnings.push({
      code: "RX_EVENT_DIRECT_LISTENER",
      file,
      ...location,
      message: `Direct DOM \`${listenerLabel}\` bypasses Resux's resumable event delegation. Prefer \`${eventLabel}\` on the template element. Keep direct listeners for global or third-party EventTargets and always remove manually managed listeners during cleanup.`,
    });
  });
}

function visitTemplateChildren(
  root: RootNode,
  visit: (element: ElementNode) => void,
): void {
  const traverse = (children: TemplateChildNode[]): void => {
    for (const child of children) {
      if (child.type !== NodeTypes.ELEMENT) {
        continue;
      }
      visit(child);
      traverse(child.children);
    }
  };

  traverse(root.children);
}

function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node);
  node.forEachChild((child) => walk(child, visit));
}

function isLikelyDomElement(expression: ts.Expression, domTargets: ReadonlySet<string>): boolean {
  const value = unwrapExpression(expression);

  if (ts.isIdentifier(value)) {
    return domTargets.has(value.text);
  }

  if (ts.isCallExpression(value)) {
    return isDomQueryExpression(value);
  }

  if (ts.isPropertyAccessExpression(value)) {
    if (value.name.text === "value") {
      const root = rootIdentifier(value.expression);
      return Boolean(root && domTargets.has(root));
    }
    const root = rootIdentifier(value);
    return Boolean(root && domTargets.has(root));
  }

  if (ts.isElementAccessExpression(value)) {
    const root = rootIdentifier(value.expression);
    return Boolean(root && domTargets.has(root));
  }

  return false;
}

function isGlobalEventTarget(expression: ts.Expression): boolean {
  const root = rootIdentifier(expression);
  return Boolean(root && GLOBAL_EVENT_TARGETS.has(root));
}

function rootIdentifier(expression: ts.Expression): string | undefined {
  const value = unwrapExpression(expression);
  if (ts.isIdentifier(value)) {
    return value.text;
  }
  if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
    return rootIdentifier(value.expression);
  }
  return undefined;
}

function isDomQueryExpression(expression: ts.Expression | undefined): boolean {
  if (!expression) {
    return false;
  }
  const value = unwrapExpression(expression);
  if (!ts.isCallExpression(value) || !ts.isPropertyAccessExpression(value.expression)) {
    return false;
  }
  if (!DOM_QUERY_METHODS.has(value.expression.name.text)) {
    return false;
  }
  const root = rootIdentifier(value.expression.expression);
  return root === "document";
}

function typeLooksLikeDomElement(type: ts.TypeNode | undefined, sourceFile: ts.SourceFile): boolean {
  if (!type) {
    return false;
  }
  return /\b(?:Element|[A-Z][A-Za-z0-9]*Element)\b/.test(type.getText(sourceFile));
}

function readStringLiteral(node: ts.Expression | undefined): string | undefined {
  if (!node) {
    return undefined;
  }
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : undefined;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let value = expression;
  while (
    ts.isParenthesizedExpression(value)
    || ts.isAsExpression(value)
    || ts.isTypeAssertionExpression(value)
    || ts.isNonNullExpression(value)
    || ts.isSatisfiesExpression(value)
  ) {
    value = value.expression;
  }
  return value;
}

function scriptKindFor(lang: string | undefined): ts.ScriptKind {
  switch (lang?.toLowerCase()) {
    case "js":
      return ts.ScriptKind.JS;
    case "jsx":
      return ts.ScriptKind.JSX;
    case "tsx":
      return ts.ScriptKind.TSX;
    default:
      return ts.ScriptKind.TS;
  }
}

function resolveBlockContentOffset(source: string, block: SFCBlock): number {
  const reportedOffset = block.loc.start.offset;
  if (source.slice(reportedOffset, reportedOffset + block.content.length) === block.content) {
    return reportedOffset;
  }
  const fallback = source.indexOf(block.content, Math.max(0, reportedOffset));
  return fallback >= 0 ? fallback : source.indexOf(block.content);
}

function locate(source: string, offset: number): { line: number; column: number } {
  const safeOffset = Math.max(0, Math.min(offset, source.length));
  const before = source.slice(0, safeOffset);
  const lastNewline = before.lastIndexOf("\n");
  return {
    line: before.split("\n").length,
    column: safeOffset - lastNewline,
  };
}

function isNormalResuxComponent(file: string): boolean {
  const normalized = file.replaceAll("\\", "/").toLowerCase();
  return normalized.endsWith(".vue")
    && !/(?:^|\/)node_modules\//.test(normalized)
    && !/(?:^|\/)islands\/vue\//.test(normalized);
}

function dedupeWarnings(warnings: ResuxDevWarning[]): ResuxDevWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.code}:${warning.line}:${warning.column}:${warning.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
