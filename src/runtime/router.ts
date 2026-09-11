export interface ResuxClientNavigationOptions {
  replace?: boolean;
  state?: unknown;
}

/** Resolves the URL used as the base for relative client-navigation targets. */
function getClientBase(base?: string): string {
  if (base) return base;
  if (typeof location !== "undefined") return location.href;
  return "https://resux.local/";
}

/**
 * Returns whether a target is a same-origin HTTP(S) application navigation.
 * Non-HTTP schemes and protocol-relative targets stay out of SPA history routing.
 */
export function isLocalClientNavigation(to: string, base?: string): boolean {
  if (!to || to.startsWith("#")) return true;
  if (to.startsWith("//")) return false;
  try {
    const baseUrl = new URL(getClientBase(base));
    const url = new URL(to, baseUrl);
    const isHttpApplicationUrl =
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.protocol === baseUrl.protocol;
    return isHttpApplicationUrl && url.origin === baseUrl.origin;
  } catch {
    return false;
  }
}

/** Resolves a client target against its current URL and returns path, query, and hash. */
export function normalizeClientPath(to: string, base?: string): string {
  const url = new URL(to, getClientBase(base));
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Performs lightweight client navigation for local targets and full-page
 * navigation for external targets while honoring replace-history semantics.
 */
export function navigateClient(
  to: string,
  options: ResuxClientNavigationOptions = {},
): void {
  if (typeof window === "undefined") return;
  const baseHref = window.location.href;
  if (!isLocalClientNavigation(to, baseHref)) {
    if (options.replace) window.location.replace(to);
    else window.location.assign(to);
    return;
  }
  const path = normalizeClientPath(to, baseHref);
  const method = options.replace ? "replaceState" : "pushState";
  window.history[method](options.state ?? null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate", { state: options.state ?? null }));
}
