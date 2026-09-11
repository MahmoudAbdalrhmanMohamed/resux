export type ResuxBrowserTrigger = "immediate" | "interaction" | "visible" | "idle" | "manual";

export interface ResuxBrowserCoreOptions {
  trigger?: ResuxBrowserTrigger;
  signal?: AbortSignal;
  onError?: (error: unknown) => void;
}

export interface ResuxScheduledEnhancement {
  trigger(): void;
  dispose(): void;
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

type ErrorReportingGlobal = typeof globalThis & {
  reportError?: (error: unknown) => void;
};

/**
 * Schedules one browser enhancement without importing the monolithic runtime.
 * The activation callback runs at most once and all registered trigger resources
 * are released after activation, disposal, or abort.
 */
export function scheduleBrowserEnhancement(
  target: Element,
  activate: () => void | Promise<void>,
  options: ResuxBrowserCoreOptions = {},
): ResuxScheduledEnhancement {
  const trigger = options.trigger ?? "interaction";
  let disposed = false;
  let activated = false;
  const cleanups: Array<() => void> = [];

  /** Releases every resource registered for this schedule. */
  const disposeListeners = () => {
    while (cleanups.length > 0) cleanups.pop()?.();
  };

  /** Routes activation failures through the configured browser-safe error path. */
  const reportActivationError = (error: unknown) => {
    if (options.onError) {
      options.onError(error);
      return;
    }
    const reporter = (globalThis as ErrorReportingGlobal).reportError;
    if (typeof reporter === "function") {
      reporter(error);
      return;
    }
    setTimeout(() => {
      throw error;
    }, 0);
  };

  /** Activates the enhancement once and handles synchronous or async failures. */
  const run = () => {
    if (disposed || activated || options.signal?.aborted) return;
    activated = true;
    disposeListeners();
    try {
      const result = activate();
      if (result && typeof result.then === "function") {
        void result.catch(reportActivationError);
      }
    } catch (error) {
      reportActivationError(error);
    }
  };

  /** Prevents future activation and releases registered trigger resources. */
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    disposeListeners();
  };

  if (options.signal?.aborted) {
    dispose();
    return { trigger: run, dispose };
  }

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
      const listenerOptions = {
        once: true,
        passive: event === "pointerdown",
        capture: true,
      } as const;
      target.addEventListener(event, run, listenerOptions);
      cleanups.push(() => target.removeEventListener(event, run, { capture: true }));
    }
  } else if (trigger === "visible") {
    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) run();
      });
      observer.observe(target);
      cleanups.push(() => observer.disconnect());
    } else {
      queueMicrotask(run);
    }
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
