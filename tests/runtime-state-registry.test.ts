import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  defineComponent,
  getClientRuntimeSource,
  renderApp,
  type ComponentDefinition
} from "resuxjs/runtime";

function own(record: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function collisionRecord<T>(entries: Record<string, T>): Record<string, T> {
  return JSON.parse(JSON.stringify(entries)) as Record<string, T>;
}

describe("runtime state registries", () => {
  it("supports prototype-sensitive state and async-data keys during SSR", async () => {
    const page: ComponentDefinition = defineComponent({
      id: "registry-collision-page",
      name: "RegistryCollisionPage",
      file: "RegistryCollisionPage.vue",
      handlers: [],
      async script(ctx) {
        const protoState = ctx.useState("__proto__", () => ({ source: "factory" }));
        const repeatedProtoState = ctx.useState("__proto__", () => ({ source: "later" }));
        const constructorState = ctx.useState("constructor", () => ({ ready: true }));
        const protoData = ctx.useAsyncData("__proto__", async () => "proto-data");
        const repeatedProtoData = ctx.useAsyncData("__proto__", async () => "later-data");
        const constructorData = ctx.useAsyncData("constructor", async () => "constructor-data");

        expect(repeatedProtoState).toBe(protoState);
        expect(repeatedProtoData).toBe(protoData);

        return {
          protoState,
          constructorState,
          protoData,
          constructorData
        };
      },
      template: [
        { type: "interpolation", expression: "protoState.value.source", bindingId: "proto-state" },
        { type: "interpolation", expression: "constructorState.value.ready", bindingId: "constructor-state" },
        { type: "interpolation", expression: "protoData.value", bindingId: "proto-data" },
        { type: "interpolation", expression: "constructorData.value", bindingId: "constructor-data" }
      ]
    });

    const result = await renderApp({
      page,
      route: { path: "/registry-collision", params: {}, query: {} }
    });
    const scope = Object.values(result.payload.scopes)[0];

    expect(scope).toBeDefined();
    expect(Object.getPrototypeOf(scope.state)).toBeNull();
    expect(Object.getPrototypeOf(scope.asyncData)).toBeNull();
    expect(own(scope.state, "__proto__")).toBe(true);
    expect(own(scope.state, "constructor")).toBe(true);
    expect(scope.state["__proto__"]).toEqual({ source: "factory" });
    expect(scope.state.constructor).toEqual({ ready: true });
    expect(own(scope.asyncData, "__proto__")).toBe(true);
    expect(own(scope.asyncData, "constructor")).toBe(true);
    expect(scope.asyncData["__proto__"]?.value).toBe("proto-data");
    expect(scope.asyncData.constructor?.value).toBe("constructor-data");
    expect(result.html).toContain("factory");
    expect(result.html).toContain("constructor-data");
  });

  it("rejects empty component state and async-data keys", async () => {
    const emptyStatePage: ComponentDefinition = defineComponent({
      id: "empty-state-key-page",
      name: "EmptyStateKeyPage",
      file: "EmptyStateKeyPage.vue",
      handlers: [],
      async script(ctx) {
        ctx.useState("   ", () => 1);
        return {};
      },
      template: []
    });

    const emptyDataPage: ComponentDefinition = defineComponent({
      id: "empty-data-key-page",
      name: "EmptyDataKeyPage",
      file: "EmptyDataKeyPage.vue",
      handlers: [],
      async script(ctx) {
        ctx.useAsyncData("   ", async () => 1);
        return {};
      },
      template: []
    });

    await expect(renderApp({
      page: emptyStatePage,
      route: { path: "/empty-state", params: {}, query: {} }
    })).rejects.toThrow("useState(key) requires a non-empty key");

    await expect(renderApp({
      page: emptyDataPage,
      route: { path: "/empty-data", params: {}, query: {} }
    })).rejects.toThrow("useAsyncData(key) requires a non-empty key");
  });

  it("restores and serializes collision-safe registries in the browser runtime", async () => {
    const tempDir = path.join(os.tmpdir(), `resux-registry-client-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const runtimeFile = path.join(tempDir, "runtime-client.mjs");
    await writeFile(runtimeFile, getClientRuntimeSource(), "utf8");

    const runtime = await import(`${pathToFileURL(runtimeFile).href}?test=${Date.now()}`);
    let stateFactoryCalls = 0;
    let dataHandlerCalls = 0;
    const component = runtime.createClientComponent({
      id: "registry-client-component",
      name: "RegistryClientComponent",
      file: "RegistryClientComponent.vue",
      handlers: [],
      async script(ctx: any) {
        const protoState = ctx.useState("__proto__", () => {
          stateFactoryCalls += 1;
          return { source: "factory" };
        });
        const repeatedProtoState = ctx.useState("__proto__", () => ({ source: "later" }));
        const constructorState = ctx.useState("constructor", () => ({ source: "factory" }));
        const protoData = ctx.useAsyncData("__proto__", async () => {
          dataHandlerCalls += 1;
          return "factory-data";
        });
        const repeatedProtoData = ctx.useAsyncData("__proto__", async () => "later-data");
        const constructorData = ctx.useAsyncData("constructor", async () => "factory-constructor-data");

        return {
          protoState,
          repeatedProtoState,
          constructorState,
          protoData,
          repeatedProtoData,
          constructorData
        };
      },
      template: []
    });

    const serializedScope = {
      props: {},
      state: collisionRecord({
        "__proto__": { source: "payload" },
        constructor: { source: "constructor-payload" }
      }),
      asyncData: collisionRecord({
        "__proto__": { value: "payload-data", pending: false, error: null },
        constructor: { value: "constructor-payload-data", pending: false, error: null }
      }),
      globalStateKeys: []
    };

    const scopeRecord = await component.createScope(
      serializedScope,
      { path: "/client-registry", params: {}, query: {} }
    );

    expect(scopeRecord.scope.repeatedProtoState).toBe(scopeRecord.scope.protoState);
    expect(scopeRecord.scope.repeatedProtoData).toBe(scopeRecord.scope.protoData);
    expect(scopeRecord.scope.protoState.value).toEqual({ source: "payload" });
    expect(scopeRecord.scope.constructorState.value).toEqual({ source: "constructor-payload" });
    expect(scopeRecord.scope.protoData.value).toBe("payload-data");
    expect(scopeRecord.scope.constructorData.value).toBe("constructor-payload-data");
    expect(stateFactoryCalls).toBe(0);
    expect(dataHandlerCalls).toBe(0);

    const serialized = component.serialize(scopeRecord);
    expect(Object.getPrototypeOf(serialized.state)).toBeNull();
    expect(Object.getPrototypeOf(serialized.asyncData)).toBeNull();
    expect(own(serialized.state, "__proto__")).toBe(true);
    expect(own(serialized.state, "constructor")).toBe(true);
    expect(own(serialized.asyncData, "__proto__")).toBe(true);
    expect(own(serialized.asyncData, "constructor")).toBe(true);

    const emptyKeyComponent = runtime.createClientComponent({
      id: "empty-registry-client-component",
      name: "EmptyRegistryClientComponent",
      file: "EmptyRegistryClientComponent.vue",
      handlers: [],
      async script(ctx: any) {
        ctx.useState(" ", () => 1);
        return {};
      },
      template: []
    });

    await expect(emptyKeyComponent.createScope(
      { props: {}, state: {}, asyncData: {}, globalStateKeys: [] },
      { path: "/empty-client-registry", params: {}, query: {} }
    )).rejects.toThrow("useState(key) requires a non-empty key");
  });
});
