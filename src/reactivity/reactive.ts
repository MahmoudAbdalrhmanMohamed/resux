import { ITERATE_KEY, isTracking, track, trigger } from "./effect.js";
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
function toIntegerIndex(value: unknown): number {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return 0;
  }
  if (!Number.isFinite(n)) {
    return n;
  }
  return Math.trunc(n);
}

// Mirrors the native fromIndex handling of includes / indexOf / lastIndexOf.
function identitySearchStart(method: ArrayIdentityMethod, length: number, args: unknown[]): number {
  if (method === "lastIndexOf") {
    if (args.length < 2) {
      return length - 1;
    }
    const n = toIntegerIndex(args[1]);
    if (n === Infinity) {
      return length - 1;
    }
    if (n === -Infinity) {
      return -1;
    }
    return n >= 0 ? Math.min(n, length - 1) : length + n;
  }
  const n = args.length > 1 ? toIntegerIndex(args[1]) : 0;
  if (n === Infinity) {
    return length;
  }
  if (n === -Infinity) {
    return 0;
  }
  return n >= 0 ? n : Math.max(length + n, 0);
}

function arrayIdentityMethod(method: ArrayIdentityMethod): (this: unknown[], ...args: unknown[]) => unknown {
  return function (this: unknown[], ...args: unknown[]): unknown {
    const rawArray = toRaw(this) as unknown[];
    if (isTracking()) {
      track(rawArray, "length");
      for (let index = 0; index < rawArray.length; index++) {
        track(rawArray, String(index));
      }
    }
    const implementation = Array.prototype[method] as (...args: unknown[]) => unknown;
    const arg = args[0];
    const rawArg = toRaw(arg);
    // === covers +0/-0; Object.is covers NaN. Either means no unwrapping.
    if (rawArg === arg || Object.is(rawArg, arg)) {
      // No unwrapping applies, so the native lookup is exactly right — and it
      // must not run twice, because visited elements can be getters with side
      // effects and native semantics read each of them at most once.
      return implementation.apply(rawArray, args);
    }
    // The search argument unwraps to a different identity (a reactive proxy
    // of a raw element). Elements may be stored raw or proxied, so compare
    // normalized identities in traversal order: an exact proxy match later in
    // the array must not hide an equivalent raw element stored earlier. Each
    // visited element is read at most once, matching native getter semantics.
    const length = rawArray.length;
    const start = identitySearchStart(method, length, args);
    if (method === "lastIndexOf") {
      for (let index = Math.min(start, length - 1); index >= 0; index--) {
        const element = rawArray[index];
        if (element === arg || toRaw(element) === rawArg) {
          return index;
        }
      }
      return -1;
    }
    for (let index = Math.max(start, 0); index < length; index++) {
      const element = rawArray[index];
      if (element === arg || toRaw(element) === rawArg) {
        return method === "includes" ? true : index;
      }
    }
    return method === "includes" ? false : -1;
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
      // Own or inherited overrides of these methods must win over the
      // instrumentation — for a non-configurable, non-writable override the
      // proxy invariants even forbid returning anything but the exact value.
      const existing = Reflect.get(target, key, receiver);
      if (existing !== (Array.prototype as unknown as Record<string, unknown>)[key]) {
        track(target, key);
        return existing;
      }
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
