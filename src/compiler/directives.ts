import { parse as parseSfc } from "@vue/compiler-sfc";

const RX_DIRECTIVE_PREFIX = "rx-";
const VUE_DIRECTIVE_PREFIX = "v-";

/**
 * Converts Resux-branded directive attributes (`rx-*`) to the directive names
 * understood by Vue's template parser. Only attribute names inside opening
 * template tags are changed; text, comments and attribute values are preserved.
 */
export function normalizeResuxDirectiveSyntax(template: string): string {
  let output = "";
  let cursor = 0;

  while (cursor < template.length) {
    const tagStart = template.indexOf("<", cursor);
    if (tagStart === -1) {
      output += template.slice(cursor);
      break;
    }

    output += template.slice(cursor, tagStart);

    if (template.startsWith("<!--", tagStart)) {
      const commentEnd = template.indexOf("-->", tagStart + 4);
      if (commentEnd === -1) {
        output += template.slice(tagStart);
        break;
      }
      output += template.slice(tagStart, commentEnd + 3);
      cursor = commentEnd + 3;
      continue;
    }

    const tagEnd = findTagEnd(template, tagStart + 1);
    if (tagEnd === -1) {
      output += template.slice(tagStart);
      break;
    }

    output += normalizeOpeningTag(template.slice(tagStart, tagEnd + 1));
    cursor = tagEnd + 1;
  }

  return output;
}

/**
 * Normalizes only the `<template>` block of a Vue SFC. Script and style blocks
 * are intentionally untouched, so strings such as `"rx-if"` keep their value.
 */
export function normalizeResuxSfcSource(source: string, filename = "component.vue"): string {
  if (!source.includes(RX_DIRECTIVE_PREFIX)) {
    return source;
  }

  const parsed = parseSfc(source, { filename });
  const template = parsed.descriptor.template;
  if (!template || !template.content.includes(RX_DIRECTIVE_PREFIX)) {
    return source;
  }

  const normalizedTemplate = normalizeResuxDirectiveSyntax(template.content);
  if (normalizedTemplate === template.content) {
    return source;
  }

  const bounds = resolveTemplateContentBounds(source, template.content, template.loc.start.offset);
  if (!bounds) {
    return source;
  }

  return `${source.slice(0, bounds.start)}${normalizedTemplate}${source.slice(bounds.end)}`;
}

/** Rewords compiler diagnostics so the public API always speaks Resux syntax. */
export function rethrowWithResuxDirectiveBrand(error: unknown): never {
  if (error instanceof Error) {
    error.message = brandDirectiveText(error.message);
    if (error.stack) {
      error.stack = brandDirectiveText(error.stack);
    }
  }
  throw error;
}

function brandDirectiveText(value: string): string {
  return value.replace(/\bv-(?=[a-z][\w-]*)/gi, RX_DIRECTIVE_PREFIX);
}

function resolveTemplateContentBounds(
  source: string,
  content: string,
  reportedOffset: number,
): { start: number; end: number } | null {
  if (source.slice(reportedOffset, reportedOffset + content.length) === content) {
    return { start: reportedOffset, end: reportedOffset + content.length };
  }

  const templateOpen = /<template(?:\s[^>]*)?>/i.exec(source);
  if (!templateOpen || templateOpen.index === undefined) {
    return null;
  }

  const openingEnd = templateOpen.index + templateOpen[0].length;
  const fallbackStart = source.indexOf(content, openingEnd);
  if (fallbackStart === -1) {
    return null;
  }

  return { start: fallbackStart, end: fallbackStart + content.length };
}

function findTagEnd(source: string, start: number): number {
  let quote: '"' | "'" | null = null;

  for (let index = start; index < source.length; index++) {
    const char = source[index];
    if (quote) {
      if (char === quote && source[index - 1] !== "\\") {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === ">") {
      return index;
    }
  }

  return -1;
}

function normalizeOpeningTag(tag: string): string {
  if (/^<\s*(?:\/|!|\?)/.test(tag)) {
    return tag;
  }

  let output = "";
  let cursor = 0;
  let expectsUnquotedValue = false;

  // Copy the opening bracket, whitespace and element name unchanged.
  while (cursor < tag.length && !/\s/.test(tag[cursor]) && tag[cursor] !== ">") {
    output += tag[cursor++];
  }

  while (cursor < tag.length) {
    const char = tag[cursor];

    if (char === '"' || char === "'") {
      const quote = char;
      const valueStart = cursor;
      cursor++;
      while (cursor < tag.length) {
        if (tag[cursor] === quote && tag[cursor - 1] !== "\\") {
          cursor++;
          break;
        }
        cursor++;
      }
      output += tag.slice(valueStart, cursor);
      expectsUnquotedValue = false;
      continue;
    }

    if (/\s/.test(char) || char === "/" || char === ">") {
      output += char;
      cursor++;
      continue;
    }

    if (char === "=") {
      output += char;
      cursor++;
      expectsUnquotedValue = true;
      continue;
    }

    const tokenStart = cursor;
    while (
      cursor < tag.length
      && !/\s/.test(tag[cursor])
      && tag[cursor] !== "="
      && tag[cursor] !== "/"
      && tag[cursor] !== ">"
    ) {
      cursor++;
    }

    const token = tag.slice(tokenStart, cursor);
    output += !expectsUnquotedValue
      && token.startsWith(RX_DIRECTIVE_PREFIX)
      && token.length > RX_DIRECTIVE_PREFIX.length
        ? `${VUE_DIRECTIVE_PREFIX}${token.slice(RX_DIRECTIVE_PREFIX.length)}`
        : token;
    expectsUnquotedValue = false;
  }

  return output;
}
