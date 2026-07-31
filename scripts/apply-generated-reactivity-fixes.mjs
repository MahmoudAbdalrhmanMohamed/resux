import { readFile, writeFile } from "node:fs/promises";

const runtimePath = "src/runtime/index.ts";
let source = await readFile(runtimePath, "utf8");

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) {
    throw new Error(`Could not find ${label}`);
  }
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Expected one ${label}`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceCount(label, before, after, expectedCount) {
  const parts = source.split(before);
  const count = parts.length - 1;
  if (count !== expectedCount) {
    throw new Error(`Expected ${expectedCount} ${label} occurrences, found ${count}`);
  }
  source = parts.join(after);
}

replaceOnce(
  "generated reactivity helpers",
  `function nextTick(fn) {
  const promise = __rxFlushPromise || __rxResolvedPromise;
  return fn ? promise.then(fn) : promise;
}

class __rxReactiveEffect {`,
  `function nextTick(fn) {
  const promise = __rxFlushPromise || __rxResolvedPromise;
  return fn ? promise.then(fn) : promise;
}

function __rxCleanupEffect(reactiveEffect) {
  for (const dep of reactiveEffect.deps) {
    dep.delete(reactiveEffect);
  }
  reactiveEffect.deps.length = 0;
}

function __rxTriggerEffects(dep) {
  for (const reactiveEffect of [...dep]) {
    if (reactiveEffect === __rxActiveEffect) {
      continue;
    }
    if (reactiveEffect.scheduler) {
      reactiveEffect.scheduler();
    } else {
      reactiveEffect.run();
    }
  }
}

class __rxReactiveEffect {`,
);

replaceOnce(
  "generated effect constructor state",
  `    this.active = true;
    this.deps = [];
  }`,
  `    this.active = true;
    this.deps = [];
    this.parent = undefined;
  }`,
);

replaceOnce(
  "generated effect run",
  `  run() {
    if (!this.active) {
      return this.fn();
    }
    const previous = __rxActiveEffect;
    __rxActiveEffect = this;
    __rxTrackStack.push(__rxShouldTrack);
    __rxShouldTrack = true;
    try {
      return this.fn();
    } finally {
      __rxShouldTrack = __rxTrackStack.pop() ?? true;
      __rxActiveEffect = previous;
    }
  }`,
  `  run() {
    if (!this.active) {
      return this.fn();
    }
    let parent = __rxActiveEffect;
    while (parent) {
      if (parent === this) {
        return undefined;
      }
      parent = parent.parent;
    }
    __rxCleanupEffect(this);
    this.parent = __rxActiveEffect;
    __rxActiveEffect = this;
    __rxTrackStack.push(__rxShouldTrack);
    __rxShouldTrack = true;
    try {
      return this.fn();
    } finally {
      __rxShouldTrack = __rxTrackStack.pop() ?? true;
      __rxActiveEffect = this.parent;
      this.parent = undefined;
    }
  }`,
);

replaceOnce(
  "generated effect stop cleanup",
  `    for (const dep of this.deps) {
      dep.delete(this);
    }
    this.deps.length = 0;`,
  `    __rxCleanupEffect(this);`,
);

replaceOnce(
  "generated object trigger loop",
  `  for (const reactiveEffect of [...dep]) {
    if (reactiveEffect.scheduler) {
      reactiveEffect.scheduler();
    } else {
      reactiveEffect.run();
    }
  }
}`,
  `  __rxTriggerEffects(dep);
}`,
);

replaceCount(
  "generated ref/computed trigger loop",
  `    for (const reactiveEffect of [...this.dep]) {
      if (reactiveEffect.scheduler) {
        reactiveEffect.scheduler();
      } else {
        reactiveEffect.run();
      }
    }`,
  `    __rxTriggerEffects(this.dep);`,
  1,
);

replaceCount(
  "generated computed dependency trigger loop",
  `        for (const reactiveEffect of [...dep]) {
          if (reactiveEffect.scheduler) {
            reactiveEffect.scheduler();
          } else {
            reactiveEffect.run();
          }
        }`,
  `        __rxTriggerEffects(dep);`,
  1,
);

replaceOnce(
  "generated reactive watch deep behavior",
  `function __rxDoWatch(source, callback, options) {
  const deep = options.deep === true;`,
  `function __rxDoWatch(source, callback, options) {
  const deep = options.deep === true
    || (callback !== null && __rxContainsReactiveSource(source));`,
);

replaceOnce(
  "generated reactive watch helper",
  `function __rxTraverse(value, seen = new Set()) {`,
  `function __rxContainsReactiveSource(source) {
  if (isReactive(source)) {
    return true;
  }
  return Array.isArray(source) && source.some((entry) => isReactive(entry));
}

function __rxTraverse(value, seen = new Set()) {`,
);

await writeFile(runtimePath, source, "utf8");
console.log("Applied generated runtime reactivity fixes.");
