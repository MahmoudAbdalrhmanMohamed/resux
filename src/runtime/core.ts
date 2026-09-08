export type ResuxBrowserTrigger = "immediate" | "interaction" | "visible" | "idle" | "manual";

export interface ResuxBrowserCoreOptions {
  trigger?: ResuxBrowserTrigger;
  signal?: AbortSignal;
}

export interface ResuxScheduledEnhancement {
  trigger(): void;
  dispose(): void;
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

export function scheduleBrowserEnhancement(
  target: Element,
  activate: () => void | Promise<void>,
  options: ResuxBrowserCoreOptions = {},
): ResuxScheduledEnhancement {
  const trigger = options.trigger ?? "interaction";
  let disposed = false;
  let activated = false;
  const cleanups: Array<() => void> = [];

  const run = () => {
    if (disposed || activated || options.signal?.aborted) return;
    activated = true;
    disposeListeners();
    void activate();
  };

  const disposeListeners = () => {
    while (cleanups.length > 0) cleanups.pop()?.();
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    disposeListeners();
  };

  if (options.signal) {
    const onAbort = () => dispose();
    options.signal.addEventListener("abort", onAbort, { once: true });
    cleanups.push(() => options.signal?.removeEventListener("abort", onAbort));
  }

  if (trigger === "immediate") {
    queueMicrotask(run);
  } else if (trigger === "interaction") {
    const events = ["pointerdown", "keydown", "focusin"] as const;
    for (const event of events) {
      target.addEventListener(event, run, { once: true, passive: event === "pointerdown" });
      cleanups.push(() => target.removeEventListener(event, run));
    }
  } else if (trigger === "visible" && typeof IntersectionObserver !== "undefined") {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) run();
    });
    observer.observe(target);
    cleanups.push(() => observer.disconnect());
  } else if (trigger === "idle" && typeof window !== "undefined") {
    const idleWindow = window as IdleWindow;
    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(run, { timeout: 2000 });
      cleanups.push(() => idleWindow.cancelIdleCallback?.(id));
    } else {
      const id = window.setTimeout(run, 1);
      cleanups.push(() => window.clearTimeout(id));
    }
  }

  return { trigger: run, dispose };
}
