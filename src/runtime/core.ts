export type ResuxBrowserTrigger =
  | "immediate"
  | "interaction"
  | "hover"
  | "visible"
  | "idle"
  | "media-query"
  | "timer"
  | "manual"
  | "never";

export interface ResuxBrowserCoreOptions {
  trigger?: ResuxBrowserTrigger;
  signal?: AbortSignal;
  onError?: (error: unknown) => void;
  /** Maximum time to wait for an idle period before activating anyway. */
  idleTimeoutMs?: number;
  /** Delay used by the `timer` trigger. */
  timerMs?: number;
  /** Media query used by the `media-query` trigger. */
  mediaQuery?: string;
  /** IntersectionObserver options used by the `visible` trigger. */
  intersectionObserver?: IntersectionObserverInit;
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

type CompatibleMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

function normalizeDelay(value: number | undefined, fallback: number, optionName: string): number {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved < 0) {
    throw new RangeError(`${optionName} must be a finite non-negative number.`);
  }
  return resolved;
}

/**
 * Schedules one browser enhancement without importing the monolithic runtime.
 * The activation callback runs at most once and all registered trigger resources
 * are released after activation, disposal, or abort.
 *
 * The trigger set intentionally mirrors proven progressive-interactivity patterns:
 * interaction/visibility/idle for demand-driven work, hover for intent prewarming,
 * media-query/timer for conditional work, and `never` for permanently static output.
 */
export function scheduleBrowserEnhancement(
  target: Element,
  activate: () => void | Promise<void>,
  options: ResuxBrowserCoreOptions = {},
): ResuxScheduledEnhancement {
  const trigger = options.trigger ?? "interaction";
  const disabled = trigger === "never";
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
    if (disabled || disposed || activated || options.signal?.aborted) return;
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

  if (disabled) {
    return { trigger: run, dispose };
  }

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
  } else if (trigger === "hover") {
    const pointerOptions = { once: true, passive: true, capture: true } as const;
    const focusOptions = { once: true, capture: true } as const;
    target.addEventListener("pointerenter", run, pointerOptions);
    target.addEventListener("focusin", run, focusOptions);
    cleanups.push(() => target.removeEventListener("pointerenter", run, { capture: true }));
    cleanups.push(() => target.removeEventListener("focusin", run, { capture: true }));
  } else if (trigger === "visible") {
    if (typeof IntersectionObserver !== "undefined") {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) run();
      }, options.intersectionObserver);
      observer.observe(target);
      cleanups.push(() => observer.disconnect());
    } else {
      queueMicrotask(run);
    }
  } else if (trigger === "idle" && typeof window !== "undefined") {
    const idleWindow = window as IdleWindow;
    const idleTimeoutMs = normalizeDelay(options.idleTimeoutMs, 2000, "idleTimeoutMs");
    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(run, { timeout: idleTimeoutMs });
      cleanups.push(() => idleWindow.cancelIdleCallback?.(id));
    } else {
      const id = window.setTimeout(run, 1);
      cleanups.push(() => window.clearTimeout(id));
    }
  } else if (trigger === "timer") {
    const timerMs = normalizeDelay(options.timerMs, 0, "timerMs");
    const id = setTimeout(run, timerMs);
    cleanups.push(() => clearTimeout(id));
  } else if (trigger === "media-query") {
    const query = options.mediaQuery?.trim();
    if (!query) {
      throw new Error("mediaQuery must be provided for the media-query trigger.");
    }

    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      queueMicrotask(run);
    } else {
      const media = window.matchMedia(query) as CompatibleMediaQueryList;
      if (media.matches) {
        queueMicrotask(run);
      } else {
        const onChange = (event: MediaQueryListEvent) => {
          if (event.matches) run();
        };
        if (typeof media.addEventListener === "function") {
          media.addEventListener("change", onChange);
          cleanups.push(() => media.removeEventListener("change", onChange));
        } else if (typeof media.addListener === "function") {
          media.addListener(onChange);
          cleanups.push(() => media.removeListener?.(onChange));
        } else {
          queueMicrotask(run);
        }
      }
    }
  }

  return { trigger: run, dispose };
}
