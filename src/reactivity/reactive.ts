import { track, trigger } from "./effect.js";
import { isObject, ReactiveFlags } from "./utils.js";

const reactiveMap = new WeakMap<object, object>();
const readonlyMap = new WeakMap<object, object>();

const mutableHandlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true;
    }
    if (key === ReactiveFlags.IS_READONLY) {
      return false;
    }
    if (key === ReactiveFlags.RAW) {
      return target;
    }

    const result = Reflect.get(target, key, receiver);
    track(target, key);

    return isObject(result) ? reactive(result) : result;
  },

  set(target, key, value, receiver) {
    const oldValue = Reflect.get(target, key, receiver);
    const success = Reflect.set(target, key, value, receiver);
    if (success && !Object.is(value, oldValue)) {
      trigger(target, key);
    }
    return success;
  },

  deleteProperty(target, key) {
    const hadKey = Reflect.has(target, key);
    const success = Reflect.deleteProperty(target, key);
    if (hadKey && success) {
      trigger(target, key);
    }
    return success;
  }
};

const readonlyHandlers: ProxyHandler<object> = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return false;
    }
    if (key === ReactiveFlags.IS_READONLY) {
      return true;
    }
    if (key === ReactiveFlags.RAW) {
      return target;
    }

    const result = Reflect.get(target, key, receiver);
    return isObject(result) ? readonly(result) : result;
  },

  set() {
    return true;
  },

  deleteProperty() {
    return true;
  }
};

export function reactive<T extends object>(target: T): T {
  return createReactiveObject(target, false, reactiveMap, mutableHandlers) as T;
}

export function readonly<T>(target: T): Readonly<T> {
  if (!isObject(target)) {
    return target as Readonly<T>;
  }
  return createReactiveObject(target, true, readonlyMap, readonlyHandlers) as Readonly<T>;
}

function createReactiveObject(
  target: object,
  isReadonly: boolean,
  proxyMap: WeakMap<object, object>,
  baseHandlers: ProxyHandler<object>
): object {
  if (!isObject(target)) {
    return target;
  }

  const targetRecord = target as Record<PropertyKey, unknown>;
  if (targetRecord[ReactiveFlags.RAW] && !(isReadonly && targetRecord[ReactiveFlags.IS_REACTIVE])) {
    return target;
  }

  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  const proxy = new Proxy(target, baseHandlers);
  proxyMap.set(target, proxy);
  return proxy;
}

export function isReactive(value: unknown): boolean {
  return Boolean(isObject(value) && (value as Record<PropertyKey, unknown>)[ReactiveFlags.IS_REACTIVE]);
}

export function isReadonly(value: unknown): boolean {
  return Boolean(isObject(value) && (value as Record<PropertyKey, unknown>)[ReactiveFlags.IS_READONLY]);
}

export function toRaw<T>(value: T): T {
  if (isObject(value) && ReactiveFlags.RAW in value) {
    return (value as Record<PropertyKey, unknown>)[ReactiveFlags.RAW] as T;
  }
  return value;
}
