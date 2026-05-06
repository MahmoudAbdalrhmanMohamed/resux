export interface Ref<T = unknown> {
  value: T;
  readonly __v_isRef: true;
}

export interface ComputedRef<T = unknown> extends Ref<T> {
  readonly __v_isReadonly: true;
}

export type MaybeRef<T> = T | Ref<T>;
export type MaybeRefOrGetter<T> = MaybeRef<T> | (() => T);

export type WatchSource<T = unknown> = Ref<T> | (() => T) | object;

export interface WatchOptions {
  immediate?: boolean;
  deep?: boolean;
  flush?: "sync" | "post";
}

export type WatchCleanup = () => void;

export type WatchCallback<T = unknown> = (
  value: T,
  oldValue: T | undefined,
  onCleanup: (cleanup: WatchCleanup) => void
) => void;

export type WatchStopHandle = () => void;

export interface ReactiveEffectOptions {
  scheduler?: () => void;
  onStop?: () => void;
  lazy?: boolean;
}

export interface ReactiveEffectRunner<T = unknown> {
  (): T;
  effect: {
    active: boolean;
    stop(): void;
  };
}
