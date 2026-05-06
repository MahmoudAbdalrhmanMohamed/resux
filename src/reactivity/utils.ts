export const ReactiveFlags = {
  IS_REACTIVE: "__v_isReactive",
  IS_READONLY: "__v_isReadonly",
  RAW: "__v_raw",
  IS_REF: "__v_isRef"
} as const;

export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return value !== null && typeof value === "object";
}

export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function hasChanged(value: unknown, oldValue: unknown): boolean {
  return !Object.is(value, oldValue);
}

export function hasOwn(target: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(target, key);
}

export function isSymbol(value: unknown): value is symbol {
  return typeof value === "symbol";
}

export function isIntegerKey(value: unknown): boolean {
  return typeof value === "string"
    && value !== "NaN"
    && value[0] !== "-"
    && `${parseInt(value, 10)}` === value;
}

export function toRawType(value: unknown): string {
  return Object.prototype.toString.call(value).slice(8, -1);
}

