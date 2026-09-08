export interface ResuxClientNavigationOptions {
  replace?: boolean;
  state?: unknown;
}

export function isLocalClientNavigation(to: string, origin?: string): boolean {
  if (!to || to.startsWith("#")) return true;
  if (to.startsWith("//")) return false;
  try {
    const base = origin ?? (typeof location !== "undefined" ? location.origin : "http://resux.local");
    const url = new URL(to, base);
    return url.origin === new URL(base).origin;
  } catch {
    return false;
  }
}

export function normalizeClientPath(to: string, origin?: string): string {
  const base = origin ?? (typeof location !== "undefined" ? location.origin : "http://resux.local");
  const url = new URL(to, base);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function navigateClient(
  to: string,
  options: ResuxClientNavigationOptions = {},
): void {
  if (typeof window === "undefined") return;
  if (!isLocalClientNavigation(to, window.location.origin)) {
    window.location.assign(to);
    return;
  }
  const path = normalizeClientPath(to, window.location.origin);
  const method = options.replace ? "replaceState" : "pushState";
  window.history[method](options.state ?? null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate", { state: options.state ?? null }));
}
