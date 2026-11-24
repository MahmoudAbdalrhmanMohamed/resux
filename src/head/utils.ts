/**
 * Shared helpers for working with Resux head entries and Content
 * Security Policy strings. Used by the runtime head renderer, the
 * module container, and the compiler.
 */

/**
 * Deduplicate head script entries by their stable identity
 * (key, then id, then src), keeping the latest occurrence in place.
 */
export function dedupeHeadScripts(scripts: unknown[]): Array<Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  const result: Array<Record<string, unknown>> = [];
  for (const item of scripts) {
    if (!item || typeof item !== "object") continue;
    const script = item as Record<string, unknown>;
    const dedupeKey = (script.key as string) ?? (script.id as string) ?? (script.src as string);
    if (dedupeKey) {
      if (map.has(dedupeKey)) {
        const existing = map.get(dedupeKey)!;
        const idx = result.indexOf(existing);
        if (idx !== -1) {
          result[idx] = script;
        }
        map.set(dedupeKey, script);
      } else {
        map.set(dedupeKey, script);
        result.push(script);
      }
    } else {
      result.push(script);
    }
  }
  return result;
}

/**
 * Read the source list of the first matching CSP directive.
 * Returns null when no matching directive is present.
 */
export function cspDirectiveSources(csp: string, names: string[]): string[] | null {
  if (!csp.trim()) {
    return null;
  }
  const directives = new Map<string, string[]>();
  for (const rawDirective of csp.split(";")) {
    const tokens = rawDirective.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    directives.set(tokens[0].toLowerCase(), tokens.slice(1));
  }
  for (const name of names) {
    const sources = directives.get(name);
    if (sources) return sources;
  }
  return null;
}
