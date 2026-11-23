import { ITERATE_KEY, track, trigger } from "./effect.js";
import { hasOwn, isObject, ReactiveFlags } from "./utils.js";

type ArrayIdentityMethod = "includes" | "indexOf" | "lastIndexOf";

const ARRAY_IDENTITY_METHODS = new Set<string>(["includes", "indexOf", "lastIndexOf"]);

// Array elements are stored raw (the set trap unwraps incoming proxies), while
// reads through the proxy wrap objects lazily. A naive pass-through of the
// identity methods therefore compares a raw argument against lazily wrapped
// elements (or a proxy argument against raw elements) and reports misses for
// values that are actually present. Run the lookup against the raw target and
// retry with unwrapped arguments, tracking each visited index so effects
// depending on the result stay reactive.
function arrayIdentityMethod(method: ArrayIdentityMethod): (this: unknown[], ...args: unknown[]) => unknown {
  return function (this: unknown[], ...args: unknown[]): unknown {
    const rawArray = toRaw(this) as unknown[];
    track(rawArray, "length");
    for (let index = 0; index < rawArray.length; index++) {
      track(rawArray, String(index));
    }
    const implementation = Array.prototype[method] as (...args: unknown[]) => unknown;
    const result = implementation.apply(rawArray, args);
    if (result === -1 || result === false) {
      return implementation.apply(rawArray, args.map((argument) => toRaw(argument)));
    }
    return result;
  };
}

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

    if (Array.isArray(target) && typeof key === "string" && ARRAY_IDENTITY_METHODS.has(key)) {
      return arrayIdentityMethod(key as ArrayIdentityMethod);
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
      && (!hadKey || !Object.is(rawValue, oldValue))
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
  if (!isObject(target) || !canUseBaseProxyHandlers(target)) {
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

function canUseBaseProxyHandlers(target: object): boolean {
  const rawType = Object.prototype.toString.call(target);
  return rawType === "[object Object]" || rawType === "[object Array]";
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
