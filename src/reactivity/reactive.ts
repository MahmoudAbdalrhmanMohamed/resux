import { ITERATE_KEY, track, trigger } from "./effect.js";
import { hasOwn, isObject, ReactiveFlags } from "./utils.js";

const reactiveMap = new WeakMap<object, object>();
const readonlyMap = new WeakMap<object, object>();
const proxyToRaw = new WeakMap<object, object>();
const reactiveProxies = new WeakSet<object>();
const readonlyProxies = new WeakSet<object>();

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
    const oldLength = Array.isArray(target) ? target.length : undefined;
    const hadKey = hasOwn(target, key);
    const oldValue = toRaw(Reflect.get(target, key, receiver));
    const rawValue = toRaw(value);
    const success = Reflect.set(target, key, rawValue, receiver);

    if (
      success
      && target === toRaw(receiver)
      && !Object.is(rawValue, oldValue)
    ) {
      trigger(target, key, hadKey ? "set" : "add", rawValue, oldLength);
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

  if (proxyToRaw.has(target) && !(isReadonly && reactiveProxies.has(target))) {
    return target;
  }

  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  const proxy = new Proxy(target, baseHandlers);
  proxyMap.set(target, proxy);
  proxyToRaw.set(proxy, target);
  if (isReadonly) {
    readonlyProxies.add(proxy);
  } else {
    reactiveProxies.add(proxy);
  }
  return proxy;
}

export function isReactive(value: unknown): boolean {
  if (!isObject(value)) {
    return false;
  }
  if (reactiveProxies.has(value)) {
    return true;
  }
  const wrapped = readonlyProxies.has(value) ? proxyToRaw.get(value) : undefined;
  return wrapped ? isReactive(wrapped) : false;
}

export function isReadonly(value: unknown): boolean {
  return Boolean(isObject(value) && readonlyProxies.has(value));
}

export function toRaw<T>(value: T): T {
  let current: unknown = value;
  while (isObject(current)) {
    const raw = proxyToRaw.get(current);
    if (!raw || raw === current) {
      break;
    }
    current = raw;
  }
  return current as T;
}

function isArrayIndex(key: PropertyKey): boolean {
  if (typeof key === "symbol" || key === "length") {
    return false;
  }
  const value = String(key);
  return /^(?:0|[1-9]\d*)$/.test(value)
    && Number(value) < 4_294_967_295;
}
