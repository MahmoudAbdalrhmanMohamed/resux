import type { ReactiveEffectOptions, ReactiveEffectRunner } from "./types.js";

export interface ReactiveEffectLike {
  active: boolean;
  run(): unknown;
  scheduler?: () => void;
  deps: Dep[];
}

export type Dep = Set<ReactiveEffectLike>;
type KeyToDepMap = Map<PropertyKey, Dep>;
export type TriggerOperation = "set" | "add" | "delete";

export const ITERATE_KEY = Symbol("resux-iterate");

const targetMap = new WeakMap<object, KeyToDepMap>();

let activeEffect: ReactiveEffectImpl | undefined;
let shouldTrack = true;

const trackStack: boolean[] = [];

class ReactiveEffectImpl implements ReactiveEffectLike {
  active = true;
  deps: Dep[] = [];
  readonly scheduler?: () => void;
  readonly onStop?: () => void;
  private parent?: ReactiveEffectImpl;

  constructor(
    private readonly fn: () => unknown,
    options: ReactiveEffectOptions = {}
  ) {
    this.scheduler = options.scheduler;
    this.onStop = options.onStop;
  }

  run(): unknown {
    if (!this.active) {
      return this.fn();
    }

    let parent = activeEffect;
    while (parent) {
      if (parent === this) {
        return undefined;
      }
      parent = parent.parent;
    }

    cleanupEffect(this);
    this.parent = activeEffect;
    activeEffect = this;
    trackStack.push(shouldTrack);
    shouldTrack = true;

    try {
      return this.fn();
    } finally {
      shouldTrack = trackStack.pop() ?? true;
      activeEffect = this.parent;
      this.parent = undefined;
    }
  }

  stop(): void {
    if (!this.active) {
      return;
    }
    cleanupEffect(this);
    this.onStop?.();
    this.active = false;
  }
}

function cleanupEffect(effect: ReactiveEffectImpl): void {
  for (const dep of effect.deps) {
    dep.delete(effect);
  }
  effect.deps.length = 0;
}

export function effect<T = unknown>(
  fn: () => T,
  options: ReactiveEffectOptions = {}
): ReactiveEffectRunner<T> {
  const _effect = new ReactiveEffectImpl(fn as () => unknown, options);
  if (!options.lazy) {
    _effect.run();
  }

  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner<T>;
  runner.effect = _effect;
  return runner;
}

export function stop(runner: ReactiveEffectRunner): void {
  runner.effect.stop();
}

export function track(target: object, key: PropertyKey): void {
  if (!isTracking()) {
    return;
  }

  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }

  trackEffects(dep);
}

export function trackEffects(dep: Dep): void {
  if (!activeEffect || dep.has(activeEffect)) {
    return;
  }
  dep.add(activeEffect);
  activeEffect.deps.push(dep);
}

export function trigger(
  target: object,
  key: PropertyKey,
  operation: TriggerOperation = "set",
  newValue?: unknown
): void {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }

  const effects: Dep = new Set();
  const addEffects = (dep?: Dep) => {
    if (!dep) {
      return;
    }
    for (const effect of dep) {
      effects.add(effect);
    }
  };

  if (Array.isArray(target) && key === "length") {
    const nextLength = Number(newValue);
    for (const [depKey, dep] of depsMap) {
      if (
        depKey === "length"
        || depKey === ITERATE_KEY
        || (isArrayIndex(depKey) && Number(depKey) >= nextLength)
      ) {
        addEffects(dep);
      }
    }
  } else {
    addEffects(depsMap.get(key));

    if (operation === "add" || operation === "delete") {
      addEffects(depsMap.get(ITERATE_KEY));
    }

    if (operation === "add" && Array.isArray(target) && isArrayIndex(key)) {
      addEffects(depsMap.get("length"));
    }
  }

  triggerEffects(effects);
}

export function triggerEffects(dep: Dep): void {
  for (const effect of [...dep]) {
    if (effect === activeEffect) {
      continue;
    }
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}

export function isTracking(): boolean {
  return shouldTrack && activeEffect !== undefined;
}

export function pauseTracking(): void {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}

export function resetTracking(): void {
  shouldTrack = trackStack.pop() ?? true;
}

function isArrayIndex(key: PropertyKey): boolean {
  if (typeof key === "symbol" || key === "length") {
    return false;
  }
  const value = String(key);
  return /^(?:0|[1-9]\d*)$/.test(value)
    && Number(value) < 4_294_967_295;
}
