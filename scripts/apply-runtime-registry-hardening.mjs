import { readFile, writeFile } from "node:fs/promises";

const runtimePath = new URL("../src/runtime/index.ts", import.meta.url);
const testPath = new URL("../tests/runtime-state-registry.test.ts", import.meta.url);

function countOccurrences(source, value) {
  return source.split(value).length - 1;
}

function replaceExact(source, from, to, expectedCount, label) {
  const count = countOccurrences(source, from);
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} occurrence(s), found ${count}.`);
  }
  return source.split(from).join(to);
}

function replaceRegex(source, pattern, replacement, expectedCount, label) {
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} match(es), found ${matches.length}.`);
  }
  return source.replace(pattern, replacement);
}

let source = await readFile(runtimePath, "utf8");

source = replaceExact(
  source,
  "    const stateRefs: Record<string, Ref<unknown>> = {};",
  "    const stateRefs: Record<string, Ref<unknown>> = Object.create(null) as Record<string, Ref<unknown>>;",
  2,
  "server state registry initialization"
);
source = replaceExact(
  source,
  "    const asyncDataRefs: Record<string, AsyncDataResource<unknown>> = {};",
  "    const asyncDataRefs: Record<string, AsyncDataResource<unknown>> = Object.create(null) as Record<string, AsyncDataResource<unknown>>;",
  2,
  "server async-data registry initialization"
);
source = replaceExact(
  source,
  "      const stateRefs = {};",
  "      const stateRefs = Object.create(null);",
  1,
  "client state registry initialization"
);
source = replaceExact(
  source,
  "      const asyncDataRefs = {};",
  "      const asyncDataRefs = Object.create(null);",
  1,
  "client async-data registry initialization"
);

const serverHelpers = `function normalizeComponentRegistryKey(
  key: string,
  apiName: "useState" | "useAsyncData"
): string {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) {
    throw new Error(\`${"${apiName}"}(key) requires a non-empty key.\`);
  }
  return normalizedKey;
}

function hasOwnRegistryKey(registry: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(registry, key);
}

function setRegistryValue<T>(registry: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(registry, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

`;
source = replaceExact(
  source,
  "export function createServerSetupContext(\n",
  `${serverHelpers}export function createServerSetupContext(\n`,
  1,
  "server registry helper insertion"
);

source = replaceExact(
  source,
  `    useState<T>(key: string, factory?: () => T): Ref<T> {
      if (stateRefs[key]) {
        return stateRefs[key] as Ref<T>;
      }

      const value = factory ? factory() : undefined;
      assertJsonSerializable(value, \`useState("${"${key}"}")\`);
      const stateRef = ref(value as T);
      stateRefs[key] = stateRef as Ref<unknown>;
      return stateRef;
    },`,
  `    useState<T>(key: string, factory?: () => T): Ref<T> {
      const normalizedKey = normalizeComponentRegistryKey(key, "useState");
      if (hasOwnRegistryKey(stateRefs, normalizedKey)) {
        return stateRefs[normalizedKey] as Ref<T>;
      }

      const value = factory ? factory() : undefined;
      assertJsonSerializable(value, \`useState("${"${normalizedKey}"}")\`);
      const stateRef = ref(value as T);
      setRegistryValue(stateRefs, normalizedKey, stateRef as Ref<unknown>);
      return stateRef;
    },`,
  1,
  "server useState"
);

source = replaceExact(
  source,
  `    useAsyncData<T>(key: string, handler?: (context: AsyncDataHandlerContext) => T | Promise<T>): AsyncDataResource<T> {
      const existing = asyncDataRefs[key] as AsyncDataResource<unknown> | undefined;
      if (existing) {
        return existing as AsyncDataResource<T>;
      }

      const pending = createPendingAsyncDataResource<T>();
      asyncDataRefs[key] = pending.resource as AsyncDataResource<unknown>;
      pending.setCompletion(settleAsyncDataResource(pending.resource, handler, key));
      return pending.resource;
    },`,
  `    useAsyncData<T>(key: string, handler?: (context: AsyncDataHandlerContext) => T | Promise<T>): AsyncDataResource<T> {
      const normalizedKey = normalizeComponentRegistryKey(key, "useAsyncData");
      if (hasOwnRegistryKey(asyncDataRefs, normalizedKey)) {
        return asyncDataRefs[normalizedKey] as AsyncDataResource<T>;
      }

      const pending = createPendingAsyncDataResource<T>();
      setRegistryValue(asyncDataRefs, normalizedKey, pending.resource as AsyncDataResource<unknown>);
      pending.setCompletion(settleAsyncDataResource(pending.resource, handler, normalizedKey));
      return pending.resource;
    },`,
  1,
  "server useAsyncData"
);

source = replaceExact(
  source,
  `      const existing = asyncDataRefs[key] as AsyncDataResource<unknown> | undefined;
      if (existing) {
        return existing as AsyncDataResource<T>;
      }

      const pending = createPendingAsyncDataResource<T>();
      asyncDataRefs[key] = pending.resource as AsyncDataResource<unknown>;
      pending.setCompletion(settleAsyncDataResource(pending.resource, () => fetchJson<T>(url, init), key));`,
  `      if (hasOwnRegistryKey(asyncDataRefs, key)) {
        return asyncDataRefs[key] as AsyncDataResource<T>;
      }

      const pending = createPendingAsyncDataResource<T>();
      setRegistryValue(asyncDataRefs, key, pending.resource as AsyncDataResource<unknown>);
      pending.setCompletion(settleAsyncDataResource(pending.resource, () => fetchJson<T>(url, init), key));`,
  1,
  "server useFetch registry lookup"
);

const clientHelpers = `function normalizeComponentRegistryKey(key, apiName) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) {
    throw new Error(apiName + "(key) requires a non-empty key.");
  }
  return normalizedKey;
}

function hasOwnRegistryKey(registry, key) {
  return Object.prototype.hasOwnProperty.call(registry, key);
}

function setRegistryValue(registry, key, value) {
  Object.defineProperty(registry, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

`;
source = replaceExact(
  source,
  "export function createClientComponent(definition) {\n",
  `${clientHelpers}export function createClientComponent(definition) {\n`,
  1,
  "client registry helper insertion"
);

source = replaceExact(
  source,
  `        useState(key, factory) {
          if (!stateRefs[key]) {
            const hasValue = serializedScope.state && Object.prototype.hasOwnProperty.call(serializedScope.state, key);
            stateRefs[key] = ref(hasValue ? serializedScope.state[key] : factory?.());
          }
          return stateRefs[key];
        },`,
  `        useState(key, factory) {
          const normalizedKey = normalizeComponentRegistryKey(key, "useState");
          if (!hasOwnRegistryKey(stateRefs, normalizedKey)) {
            const hasValue = serializedScope.state && hasOwnRegistryKey(serializedScope.state, normalizedKey);
            setRegistryValue(
              stateRefs,
              normalizedKey,
              ref(hasValue ? serializedScope.state[normalizedKey] : factory?.())
            );
          }
          return stateRefs[normalizedKey];
        },`,
  1,
  "client useState"
);

source = replaceExact(
  source,
  `        useAsyncData(key, handler) {
          if (!asyncDataRefs[key]) {
            const snapshot = serializedScope.asyncData ? serializedScope.asyncData[key] : undefined;
            const resource = createAsyncDataResource(
              snapshot?.value,
              snapshot?.pending ?? false,
              snapshot?.error ?? null
            );
            asyncDataRefs[key] = resource;
            if (resource.pending.value && typeof handler === "function") {
              const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
              if (controller) {
                pendingAsyncDataControllers.add(controller);
                resource.abortController = controller;
              }
              const completion = settleAsyncDataResource(resource, handler, key, controller ? controller.signal : undefined)
                .finally(() => {
                  if (controller) {
                    pendingAsyncDataControllers.delete(controller);
                  }
                  resource.abortController = null;
                });
              resource.setCompletion(completion);
              pendingCompletions.push(completion);
            }
          }
          return asyncDataRefs[key];
        },`,
  `        useAsyncData(key, handler) {
          const normalizedKey = normalizeComponentRegistryKey(key, "useAsyncData");
          if (!hasOwnRegistryKey(asyncDataRefs, normalizedKey)) {
            const hasSnapshot = serializedScope.asyncData
              && hasOwnRegistryKey(serializedScope.asyncData, normalizedKey);
            const snapshot = hasSnapshot ? serializedScope.asyncData[normalizedKey] : undefined;
            const resource = createAsyncDataResource(
              snapshot?.value,
              snapshot?.pending ?? false,
              snapshot?.error ?? null
            );
            setRegistryValue(asyncDataRefs, normalizedKey, resource);
            if (resource.pending.value && typeof handler === "function") {
              const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
              if (controller) {
                pendingAsyncDataControllers.add(controller);
                resource.abortController = controller;
              }
              const completion = settleAsyncDataResource(resource, handler, normalizedKey, controller ? controller.signal : undefined)
                .finally(() => {
                  if (controller) {
                    pendingAsyncDataControllers.delete(controller);
                  }
                  resource.abortController = null;
                });
              resource.setCompletion(completion);
              pendingCompletions.push(completion);
            }
          }
          return asyncDataRefs[normalizedKey];
        },`,
  1,
  "client useAsyncData"
);

source = replaceRegex(
  source,
  /(function serializeRefs\([^)]*\)[^{]*\{\s*\n\s*const output(?:\s*:[^=\n]+)?\s*=\s*)\{\};/g,
  "$1Object.create(null);",
  2,
  "state serialization output"
);
source = replaceRegex(
  source,
  /(function serializeAsyncData\([^)]*\)[^{]*\{\s*\n\s*const output(?:\s*:[^=\n]+)?\s*=\s*)\{\};/g,
  "$1Object.create(null);",
  2,
  "async-data serialization output"
);

await writeFile(runtimePath, source, "utf8");

let testSource = await readFile(testPath, "utf8");
testSource = replaceExact(
  testSource,
  `function collisionRecord<T>(entries: Record<string, T>): Record<string, T> {
  return JSON.parse(JSON.stringify(entries)) as Record<string, T>;
}`,
  `function collisionRecord<T>(entries: Array<[string, T]>): Record<string, T> {
  const json = \`{${"${entries.map(([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value)}`).join(",")}"}}\`;
  return JSON.parse(json) as Record<string, T>;
}`,
  1,
  "collision record test helper"
);
testSource = testSource
  .replace(
    `state: collisionRecord({
        "__proto__": { source: "payload" },
        constructor: { source: "constructor-payload" }
      }),`,
    `state: collisionRecord([
        ["__proto__", { source: "payload" }],
        ["constructor", { source: "constructor-payload" }]
      ]),`
  )
  .replace(
    `asyncData: collisionRecord({
        "__proto__": { value: "payload-data", pending: false, error: null },
        constructor: { value: "constructor-payload-data", pending: false, error: null }
      }),`,
    `asyncData: collisionRecord([
        ["__proto__", { value: "payload-data", pending: false, error: null }],
        ["constructor", { value: "constructor-payload-data", pending: false, error: null }]
      ]),`
  );
await writeFile(testPath, testSource, "utf8");
