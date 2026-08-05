from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


# Fix the CLI entry in source rather than rewriting generated dist output.
cli_path = Path("src/cli.ts")
cli = cli_path.read_text(encoding="utf-8")
cli = replace_once(
    cli,
    '''if (isMainModule()) {
  await runResuxCli(process.argv.slice(2));
}''',
    '''if (isMainModule()) {
  void runResuxCli(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}''',
    "source CLI entry",
)
cli_path.write_text(cli, encoding="utf-8")

package_path = Path("package.json")
package = package_path.read_text(encoding="utf-8")
package = replace_once(
    package,
    '    "build": "npm run typecheck && node scripts/finalize-build.mjs",',
    '    "build": "npm run typecheck",',
    "build script",
)
package_path.write_text(package, encoding="utf-8")
Path("scripts/finalize-build.mjs").unlink()


reactive_path = Path("src/reactivity/reactive.ts")
reactive = reactive_path.read_text(encoding="utf-8")
reactive = replace_once(
    reactive,
    '''const reactiveMap = new WeakMap<object, object>();
const readonlyMap = new WeakMap<object, object>();''',
    '''const reactiveMap = new WeakMap<object, object>();
const readonlyMap = new WeakMap<object, object>();
const proxyToRaw = new WeakMap<object, object>();
const reactiveProxies = new WeakSet<object>();
const readonlyProxies = new WeakSet<object>();''',
    "internal proxy registries",
)
reactive = replace_once(
    reactive,
    '''  set(target, key, value, receiver) {
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
  },''',
    '''  set(target, key, value, receiver) {
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
  },''',
    "sparse-array set semantics",
)
reactive = replace_once(
    reactive,
    '''  const targetRecord = target as Record<PropertyKey, unknown>;
  if (targetRecord[ReactiveFlags.RAW] && !(isReadonly && targetRecord[ReactiveFlags.IS_REACTIVE])) {
    return target;
  }

  const existingProxy = proxyMap.get(target);''',
    '''  if (proxyToRaw.has(target) && !(isReadonly && reactiveProxies.has(target))) {
    return target;
  }

  const existingProxy = proxyMap.get(target);''',
    "proxy identity check",
)
reactive = replace_once(
    reactive,
    '''  const proxy = new Proxy(target, baseHandlers);
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
}''',
    '''  const proxy = new Proxy(target, baseHandlers);
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
}''',
    "unspoofable proxy identity",
)
reactive_path.write_text(reactive, encoding="utf-8")


effect_path = Path("src/reactivity/effect.ts")
effect = effect_path.read_text(encoding="utf-8")
effect = replace_once(
    effect,
    '''  operation: TriggerOperation = "set",
  newValue?: unknown
): void {''',
    '''  operation: TriggerOperation = "set",
  newValue?: unknown,
  oldLength?: number
): void {''',
    "trigger metadata signature",
)
effect = replace_once(
    effect,
    '''    if (operation === "add" && Array.isArray(target) && isArrayIndex(key)) {
      addEffects(depsMap.get("length"));
    }''',
    '''    if (
      operation === "add"
      && Array.isArray(target)
      && isArrayIndex(key)
      && typeof oldLength === "number"
      && Number(key) >= oldLength
    ) {
      addEffects(depsMap.get("length"));
    }''',
    "array length invalidation",
)
effect_path.write_text(effect, encoding="utf-8")


# Ensure deployment verification does not leave multiple installed fixtures behind.
deploy_path = Path("scripts/verify-deploy-targets.mjs")
deploy = deploy_path.read_text(encoding="utf-8")
deploy = replace_once(
    deploy,
    'import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";',
    'import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";',
    "deployment cleanup imports",
)
deploy = replace_once(
    deploy,
    '''async function verifyTarget(deployTarget, assertOutput) {
  const appRoot = path.join(
    os.tmpdir(),
    `resux-deploy-target-${deployTarget}-${process.pid}-${Date.now()}`,
  );
  await createFixtureApp(appRoot, deployTarget);
  await runBuild(appRoot, deployTarget);
  await assertOutput(appRoot);
  console.log(`[verify:deploy-targets] ${deployTarget} PASS`);
}''',
    '''async function verifyTarget(deployTarget, assertOutput) {
  const appRoot = await mkdtemp(path.join(os.tmpdir(), `resux-deploy-target-${deployTarget}-`));
  try {
    await createFixtureApp(appRoot, deployTarget);
    await runBuild(appRoot, deployTarget);
    await assertOutput(appRoot);
    console.log(`[verify:deploy-targets] ${deployTarget} PASS`);
  } finally {
    await rm(appRoot, { recursive: true, force: true });
  }
}''',
    "deployment fixture cleanup",
)
deploy_path.write_text(deploy, encoding="utf-8")


test_path = Path("tests/reactivity.test.ts")
tests = test_path.read_text(encoding="utf-8")
tests = replace_once(
    tests,
    '''  it("invalidates removed array indexes when length shrinks", () => {''',
    '''  it("tracks sparse-array additions without invalidating length unnecessarily", () => {
    const values = reactive(new Array<number>(2));
    let keys: string[] = [];
    let observedLength = 0;
    let lengthRuns = 0;

    effect(() => {
      keys = Object.keys(values);
    });
    effect(() => {
      observedLength = values.length;
      lengthRuns++;
    });

    values[0] = 1;
    expect(keys).toEqual(["0"]);
    expect(observedLength).toBe(2);
    expect(lengthRuns).toBe(1);

    values[2] = 3;
    expect(keys).toEqual(["0", "2"]);
    expect(observedLength).toBe(3);
    expect(lengthRuns).toBe(2);
  });

  it("invalidates removed array indexes when length shrinks", () => {''',
    "sparse-array regression test",
)
tests = replace_once(
    tests,
    '''  it("preserves raw identity across proxies", () => {''',
    '''  it("does not trust spoofed reactive flag properties", () => {
    const spoofed = {
      __v_isReactive: true,
      __v_isReadonly: true,
      __v_raw: { fake: true },
      count: 1
    };
    const proxy = reactive(spoofed);

    expect(proxy).not.toBe(spoofed);
    expect(isReactive(spoofed)).toBe(false);
    expect(isReadonly(spoofed)).toBe(false);
    expect(toRaw(spoofed)).toBe(spoofed);
    expect(toRaw(proxy)).toBe(spoofed);
  });

  it("preserves raw identity across proxies", () => {''',
    "spoofed-flags regression test",
)
test_path.write_text(tests, encoding="utf-8")
