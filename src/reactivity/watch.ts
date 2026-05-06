import { effect, stop } from "./effect.js";
import { isReactive } from "./reactive.js";
import { isRef } from "./ref.js";
import { queuePostFlushCb } from "./scheduler.js";
import type { WatchCallback, WatchOptions, WatchSource, WatchStopHandle } from "./types.js";
import { hasChanged, isArray, isFunction, isObject } from "./utils.js";

const INITIAL_WATCH_VALUE = Symbol("initial-watch-value");

type CleanupRegistrar = (cleanup: () => void) => void;

export function watch<T = unknown>(
  source: WatchSource<T> | WatchSource<T>[],
  callback: WatchCallback<T>,
  options: WatchOptions = {}
): WatchStopHandle {
  return doWatch(source, callback, options);
}

export function watchEffect(
  effectFn: (onCleanup: CleanupRegistrar) => void,
  options: WatchOptions = {}
): WatchStopHandle {
  return doWatch(effectFn, null, options);
}

function doWatch<T = unknown>(
  source: WatchSource<T> | WatchSource<T>[] | ((onCleanup: CleanupRegistrar) => void),
  callback: WatchCallback<T> | null,
  options: WatchOptions
): WatchStopHandle {
  const { deep = false, immediate = false, flush = "post" } = options;

  let cleanup: (() => void) | undefined;
  const onCleanup: CleanupRegistrar = (fn) => {
    cleanup = fn;
  };

  let getter: () => unknown;
  if (callback === null) {
    getter = () => {
      cleanup?.();
      cleanup = undefined;
      (source as (onCleanup: CleanupRegistrar) => void)(onCleanup);
    };
  } else {
    getter = normalizeWatchSource(source as WatchSource<T> | WatchSource<T>[]);
  }

  if (deep) {
    const baseGetter = getter;
    getter = () => traverse(baseGetter());
  }

  let oldValue: unknown = INITIAL_WATCH_VALUE;

  const job = () => {
    if (callback === null) {
      runner();
      return;
    }

    const newValue = runner();
    if (deep || oldValue === INITIAL_WATCH_VALUE || hasChanged(newValue, oldValue)) {
      cleanup?.();
      cleanup = undefined;
      callback(
        newValue as T,
        oldValue === INITIAL_WATCH_VALUE ? undefined : oldValue as T,
        onCleanup
      );
      oldValue = newValue;
    }
  };

  const scheduler = flush === "sync"
    ? job
    : () => queuePostFlushCb(job);

  const runner = effect(getter, {
    scheduler,
    lazy: callback !== null
  });

  if (callback) {
    if (immediate) {
      job();
    } else {
      oldValue = runner();
    }
  }

  return () => {
    cleanup?.();
    cleanup = undefined;
    stop(runner);
  };
}

function normalizeWatchSource<T>(source: WatchSource<T> | WatchSource<T>[]): () => unknown {
  if (isArray(source)) {
    const sources = source as WatchSource<T>[];
    return () => sources.map((item) => resolveWatchValue(item));
  }
  return () => resolveWatchValue(source);
}

function resolveWatchValue<T>(source: WatchSource<T>): unknown {
  if (isRef(source)) {
    return source.value;
  }
  if (isReactive(source)) {
    return source;
  }
  if (isFunction(source)) {
    return source();
  }
  return source;
}

function traverse(value: unknown, seen: Set<unknown> = new Set()): unknown {
  if (!isObject(value) || seen.has(value)) {
    return value;
  }

  seen.add(value);
  for (const key of Object.keys(value)) {
    traverse((value as Record<string, unknown>)[key], seen);
  }
  return value;
}
