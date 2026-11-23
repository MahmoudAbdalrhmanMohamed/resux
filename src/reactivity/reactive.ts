import { ITERATE_KEY, MAP_KEY_ITERATE_KEY, track, trigger } from "./effect.js";
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

// Local isRef check (mirrors ref.ts) to avoid a module cycle: ref.ts imports
// reactive() from this module.
function isRefLike(value: unknown): boolean {
  return Boolean(
    value
    && typeof value === "object"
    && (value as Record<PropertyKey, unknown>)[ReactiveFlags.IS_REF] === true
  );
}

function isArrayIndex(key: PropertyKey): boolean {
  if (typeof key === "symbol" || key === "length") {
    return false;
  }
  const value = String(key);
  return /^(?:0|[1-9]\d*)$/.test(value)
    && Number(value) < 4_294_967_295;
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

    // Vue-style ref unwrapping on plain object property access. Refs stored at
    // array indices stay wrapped, but are returned as-is: refs are never
    // proxied.
    if (isRefLike(result)) {
      return !Array.isArray(target) || !isArrayIndex(key)
        ? (result as { value: unknown }).value
        : result;
    }

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
    const storedOldValue = Reflect.get(target, key, receiver);

    // Vue-style ref assignment: writing a plain value over a stored ref updates
    // the ref in place (preserving its identity and firing its own
    // subscribers) instead of replacing it. Arrays are exempt, matching the
    // read-side unwrapping rule.
    if (
      !Array.isArray(target)
      && isRefLike(storedOldValue)
      && !isRefLike(value)
    ) {
      (storedOldValue as { value: unknown }).value = value;
      return true;
    }

    const oldValue = toRaw(storedOldValue);
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
    if (isRefLike(result)) {
      return !Array.isArray(target) || !isArrayIndex(key)
        ? (result as { value: unknown }).value
        : result;
    }
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

// --- Collection (Map / Set) instrumentation -------------------------------

type CollectionTarget = Map<unknown, unknown> | Set<unknown>;

function wrapCollectionValue(value: unknown, isReadonly: boolean): unknown {
  if (!isObject(value)) {
    return value;
  }
  return isReadonly ? readonly(value) : reactive(value);
}

function createIterableMethod(
  method: "keys" | "values" | "entries" | typeof Symbol.iterator,
  isReadonly: boolean
): (this: CollectionTarget) => IterableIterator<unknown> {
  return function (this: CollectionTarget): IterableIterator<unknown> {
    const target = toRaw(this) as unknown as Map<unknown, unknown> & Set<unknown>;
    const isMap = target instanceof Map;
    const isKeys = method === "keys";
    track(target, isKeys && isMap ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
    const resolved = method === Symbol.iterator ? (isMap ? "entries" : "values") : method;
    const inner = (target[resolved] as () => Iterator<unknown>).call(target) as Iterator<unknown>;
    const wrap = (value: unknown) => wrapCollectionValue(value, isReadonly);
    const isEntries = resolved === "entries";

    return {
      next() {
        const { value, done } = inner.next();
        if (done) {
          return { value, done: true };
        }
        if (isEntries) {
          const pair = value as [unknown, unknown];
          return { value: [wrap(pair[0]), wrap(pair[1])], done: false };
        }
        return { value: wrap(value), done: false };
      },
      [Symbol.iterator]() {
        return this as IterableIterator<unknown>;
      }
    } as IterableIterator<unknown>;
  };
}

function createCollectionInstrumentations(isReadonly: boolean): Record<PropertyKey, unknown> {
  const wrap = (value: unknown) => wrapCollectionValue(value, isReadonly);

  const instrumentations: Record<PropertyKey, unknown> = {
    get(this: CollectionTarget, key: unknown) {
      const target = toRaw(this) as unknown as Map<unknown, unknown>;
      const rawKey = toRaw(key) as PropertyKey;
      track(target, rawKey);
      if (rawKey !== key) {
        track(target, key as PropertyKey);
      }
      let result = target.get(rawKey);
      if (result === undefined && rawKey !== key) {
        result = target.get(key);
      }
      return wrap(result);
    },

    has(this: CollectionTarget, key: unknown) {
      const target = toRaw(this) as unknown as Map<unknown, unknown>;
      const rawKey = toRaw(key) as PropertyKey;
      track(target, rawKey);
      if (rawKey !== key) {
        track(target, key as PropertyKey);
      }
      return target.has(rawKey) || (rawKey !== key && target.has(key));
    },

    get size() {
      // `this` is the receiver (the proxy) because instrumentations are read
      // via Reflect.get(instrumentations, key, receiver).
      const target = toRaw(this) as unknown as CollectionTarget;
      track(target, ITERATE_KEY);
      return target.size;
    },

    set(this: CollectionTarget, key: unknown, value: unknown) {
      if (isReadonly) {
        return this;
      }
      const target = toRaw(this) as unknown as Map<unknown, unknown>;
      const rawKey = toRaw(key) as PropertyKey;
      const rawValue = toRaw(value);
      const hadKey = target.has(rawKey);
      const oldValue = target.get(rawKey);
      target.set(rawKey, rawValue);
      if (!hadKey) {
        trigger(target, rawKey, "add");
      } else if (!Object.is(rawValue, toRaw(oldValue))) {
        trigger(target, rawKey, "set");
      }
      return this;
    },

    add(this: CollectionTarget, value: unknown) {
      if (isReadonly) {
        return this;
      }
      const target = toRaw(this) as unknown as Set<unknown>;
      const rawValue = toRaw(value) as PropertyKey;
      const hadKey = target.has(rawValue);
      target.add(rawValue);
      if (!hadKey) {
        trigger(target, rawValue, "add");
      }
      return this;
    },

    delete(this: CollectionTarget, key: unknown) {
      if (isReadonly) {
        return false;
      }
      const target = toRaw(this) as unknown as Map<unknown, unknown>;
      const rawKey = toRaw(key) as PropertyKey;
      const hadKey = target.has(rawKey);
      const success = target.delete(rawKey);
      if (hadKey && success) {
        trigger(target, rawKey, "delete");
      }
      return success;
    },

    clear(this: CollectionTarget) {
      if (isReadonly) {
        return undefined;
      }
      const target = toRaw(this) as unknown as Map<unknown, unknown>;
      const hadItems = target.size !== 0;
      target.clear();
      if (hadItems) {
        trigger(target, ITERATE_KEY, "clear");
      }
      return undefined;
    },

    forEach(this: CollectionTarget, callback: (value: unknown, key: unknown, owner: unknown) => void, thisArg?: unknown) {
      const target = toRaw(this) as unknown as Map<unknown, unknown> & Set<unknown>;
      track(target, ITERATE_KEY);
      target.forEach((value: unknown, key: unknown) => {
        callback.call(thisArg, wrap(value), wrap(key), this);
      });
    },

    keys: createIterableMethod("keys", isReadonly),
    values: createIterableMethod("values", isReadonly),
    entries: createIterableMethod("entries", isReadonly),
    [Symbol.iterator]: createIterableMethod(Symbol.iterator, isReadonly)
  };

  return instrumentations;
}

const mutableCollectionInstrumentations = createCollectionInstrumentations(false);
const readonlyCollectionInstrumentations = createCollectionInstrumentations(true);

const mutableCollectionHandlers: ProxyHandler<object> = {
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
    const source = hasOwn(mutableCollectionInstrumentations, key) && key in target
      ? mutableCollectionInstrumentations
      : target;
    return Reflect.get(source, key, receiver);
  }
};

const readonlyCollectionHandlers: ProxyHandler<object> = {
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
    const source = hasOwn(readonlyCollectionInstrumentations, key) && key in target
      ? readonlyCollectionInstrumentations
      : target;
    return Reflect.get(source, key, receiver);
  }
};

// --- Entry points ----------------------------------------------------------

type ReactiveTargetType = "common" | "collection" | "invalid";

function getTargetType(target: object): ReactiveTargetType {
  switch (Object.prototype.toString.call(target)) {
    case "[object Object]":
    case "[object Array]":
      return "common";
    case "[object Map]":
    case "[object Set]":
    case "[object WeakMap]":
    case "[object WeakSet]":
      return "collection";
    default:
      return "invalid";
  }
}

export function reactive<T extends object>(target: T): T {
  return createReactiveObject(target, false, reactiveMap) as T;
}

export function readonly<T>(target: T): Readonly<T> {
  if (!isObject(target)) {
    return target as Readonly<T>;
  }
  return createReactiveObject(target, true, readonlyMap) as Readonly<T>;
}

function createReactiveObject(
  target: object,
  isReadonly: boolean,
  proxyMap: WeakMap<object, object>
): object {
  const targetType = isObject(target) ? getTargetType(target) : "invalid";
  if (targetType === "invalid") {
    return target;
  }

  if (proxyToRaw.has(target) && !(isReadonly && reactiveProxies.has(target))) {
    return target;
  }

  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  const handlers = targetType === "collection"
    ? (isReadonly ? readonlyCollectionHandlers : mutableCollectionHandlers)
    : (isReadonly ? readonlyHandlers : mutableHandlers);

  const proxy = new Proxy(target, handlers);
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
