import { trackEffects, triggerEffects, isTracking, type Dep } from "./effect.js";
import { reactive } from "./reactive.js";
import type { Ref } from "./types.js";
import { hasChanged, isObject, ReactiveFlags } from "./utils.js";

class RefImpl<T> implements Ref<T> {
  readonly __v_isRef = true as const;
  private dep?: Dep;
  private _value: T;
  private _rawValue: T;

  constructor(value: T) {
    this._rawValue = value;
    this._value = toReactive(value);
  }

  get value(): T {
    trackRefValue(this);
    return this._value;
  }

  set value(newValue: T) {
    if (!hasChanged(newValue, this._rawValue)) {
      return;
    }
    this._rawValue = newValue;
    this._value = toReactive(newValue);
    triggerRefValue(this);
  }

  _dep(): Dep {
    if (!this.dep) {
      this.dep = new Set();
    }
    return this.dep;
  }
}

class ObjectRefImpl<T extends object, K extends keyof T> implements Ref<T[K]> {
  readonly __v_isRef = true as const;

  constructor(
    private readonly object: T,
    private readonly key: K,
    private readonly defaultValue?: T[K]
  ) {}

  get value(): T[K] {
    const value = this.object[this.key];
    return value === undefined ? this.defaultValue as T[K] : value;
  }

  set value(newValue: T[K]) {
    this.object[this.key] = newValue;
  }
}

export function ref<T>(value: T): Ref<T> {
  if (isRef(value)) {
    return value as Ref<T>;
  }
  return new RefImpl(value);
}

export function isRef(value: unknown): value is Ref {
  return Boolean(value && typeof value === "object" && (value as Record<string, unknown>)[ReactiveFlags.IS_REF] === true);
}

export function unref<T>(value: T | Ref<T>): T {
  return isRef(value) ? value.value : value;
}

export function toRef<T extends object, K extends keyof T>(object: T, key: K, defaultValue?: T[K]): Ref<T[K]> {
  const value = object[key];
  return isRef(value) ? value as Ref<T[K]> : new ObjectRefImpl(object, key, defaultValue);
}

export function toRefs<T extends object>(object: T): { [K in keyof T]: Ref<T[K]> } {
  const output = {} as { [K in keyof T]: Ref<T[K]> };
  for (const key of Object.keys(object) as Array<keyof T>) {
    output[key] = toRef(object, key);
  }
  return output;
}

export function trackRefValue(refValue: RefImpl<unknown>): void {
  if (!isTracking()) {
    return;
  }
  trackEffects(refValue._dep());
}

export function triggerRefValue(refValue: RefImpl<unknown>): void {
  triggerEffects(refValue._dep());
}

function toReactive<T>(value: T): T {
  return isObject(value) ? reactive(value as object) as T : value;
}
