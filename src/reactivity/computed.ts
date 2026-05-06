import { effect, trackEffects, triggerEffects, type Dep } from "./effect.js";
import type { ComputedRef } from "./types.js";
import { ReactiveFlags } from "./utils.js";

class ComputedRefImpl<T> implements ComputedRef<T> {
  readonly __v_isRef = true as const;
  readonly __v_isReadonly = true as const;

  private readonly setter?: (value: T) => void;
  private readonly runner;
  private dep?: Dep;
  private dirty = true;
  private _value!: T;

  constructor(getter: () => T, setter?: (value: T) => void) {
    this.setter = setter;
    this.runner = effect(getter, {
      lazy: true,
      scheduler: () => {
        if (!this.dirty) {
          this.dirty = true;
          triggerEffects(this._dep());
        }
      }
    });
  }

  get value(): T {
    trackEffects(this._dep());
    if (this.dirty) {
      this.dirty = false;
      this._value = this.runner();
    }
    return this._value;
  }

  set value(newValue: T) {
    this.setter?.(newValue);
  }

  private _dep(): Dep {
    if (!this.dep) {
      this.dep = new Set();
    }
    return this.dep;
  }
}

export function computed<T>(getter: () => T): ComputedRef<T>;
export function computed<T>(options: { get: () => T; set?: (value: T) => void }): ComputedRef<T>;
export function computed<T>(
  getterOrOptions: (() => T) | { get: () => T; set?: (value: T) => void }
): ComputedRef<T> {
  if (typeof getterOrOptions === "function") {
    return new ComputedRefImpl(getterOrOptions);
  }
  return new ComputedRefImpl(getterOrOptions.get, getterOrOptions.set);
}

export function isComputed(value: unknown): boolean {
  return Boolean(
    value
      && typeof value === "object"
      && (value as Record<string, unknown>)[ReactiveFlags.IS_REF] === true
      && (value as Record<string, unknown>)[ReactiveFlags.IS_READONLY] === true
  );
}
