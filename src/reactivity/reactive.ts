import { ITERATE_KEY, track, trigger } from "./effect.js";
import { hasOwn, isObject, ReactiveFlags } from "./utils.js";

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

  has(target, key) {
    const result = Reflect.has(target, key);
    track(target, key);
    return result;
  },

  ownKeys(target) {
    track(target, ITERATE_KEY);
    return Reflect.ownKeys(target);
  },

  set(target, key, value, receiver) {
    const oldLength = Array.isArray(target) ? target.length : 0;
    const hadKey = Array.isArray(target) && isArrayIndex(key)
      ? Number(key) < oldLength
      : hasOwn(target, key);
    const oldValue = toRaw(Reflect.get(target, key, receiver));
    const rawValue = toRaw(value);
    const success = Reflect.set(target, key, rawValue, receiver);

    if (
      success
      && target === toRaw(receiver)
      && !Object.is(rawValue, oldValue)
    ) {
      trigger(target, key, hadKey ? "set" : "add", rawValue);
    }
    return success;
  },

  deleteProperty(target, key) {
    const hadKey = hasOwn(target, key);
    const success = Reflect.deleteProperty(target, key);
    if (hadKey && success) {
      trigger(target, key, "delete");
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

  has(target, key) {
    return Reflect.has(target, key);
  },

  ownKeys(target) {
    return Reflect.ownKeys(target);
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
  if (!isObject(value) || (!isReactive(value) && !isReadonly(value))) {
    return value;
  }

  const raw = (value as Record<PropertyKey, unknown>)[ReactiveFlags.RAW] as T | undefined;
  return raw === undefined || raw === value ? value : toRaw(raw);
}

function isArrayIndex(key: PropertyKey): boolean {
  if (typeof key === "symbol" || key === "length") {
    return false;
  }
  const value = String(key);
  return /^(?:0|[1-9]\d*)$/.test(value)
    && Number(value) < 4_294_967_295;
}
