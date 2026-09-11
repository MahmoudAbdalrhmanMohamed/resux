/** Lightweight runtime entrypoint for the standalone Resux reactivity API. */
export {
  computed,
  isComputed,
  isReactive,
  isReadonly,
  isRef,
  nextTick,
  reactive,
  readonly,
  ref,
  toRef,
  toRefs,
  unref,
  watch,
  watchEffect,
} from "../reactivity/index.js";

export type {
  ComputedRef,
  MaybeRef,
  MaybeRefOrGetter,
  ReactiveEffectOptions,
  ReactiveEffectRunner,
  Ref,
  WatchCallback,
  WatchOptions,
  WatchSource,
  WatchStopHandle,
} from "../reactivity/index.js";
