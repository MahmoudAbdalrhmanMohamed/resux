export interface ResuxClientNavigationOptions {
  replace?: boolean;
  state?: unknown;
}

function getClientBase(base?: string): string {
  if (base) return base;
  if (typeof location !== "undefined") return location.href;
  return "https://resux.local/";
}

function resolveSupportedClientTarget(to: string, base: string): URL | null {
  try {
    const url = new URL(to, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

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

export function normalizeClientPath(to: string, base?: string): string {
  const url = new URL(to, getClientBase(base));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function navigateClient(
  to: string,
  options: ResuxClientNavigationOptions = {},
): void {
  if (typeof window === "undefined") return;
  const baseHref = window.location.href;
  const targetUrl = resolveSupportedClientTarget(to, baseHref);
  if (!targetUrl) return;

  if (!isLocalClientNavigation(targetUrl.href, baseHref)) {
    if (options.replace) window.location.replace(targetUrl.href);
    else window.location.assign(targetUrl.href);
    return;
  }
  const path = normalizeClientPath(targetUrl.href, baseHref);
  const method = options.replace ? "replaceState" : "pushState";
  window.history[method](options.state ?? null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate", { state: options.state ?? null }));
}
