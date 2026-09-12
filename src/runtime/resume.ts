export type ResuxResumeHandler = (...args: unknown[]) => unknown | Promise<unknown>;
export type ResuxResumeModule = Record<string, unknown>;

export interface ResuxResumeLoadContext {
  /** Aborted when the configured handler-load deadline expires. */
  signal: AbortSignal;
}

export type ResuxResumeModuleLoader = (
  context?: ResuxResumeLoadContext,
) => Promise<ResuxResumeModule>;

export interface ResuxResumeManifestEntry {
  id: string;
  module: string;
  exportName: string;
}

export interface ResuxResumeRegistration extends ResuxResumeManifestEntry {
  load: ResuxResumeModuleLoader;
}

export interface ResuxResumeRegistryOptions {
  /**
   * Maximum time to wait for one lazy handler module. Set to 0 to disable the
   * deadline. Defaults to 30 seconds so a broken chunk request cannot leave an
   * interaction pending forever.
   */
  loadTimeoutMs?: number;
}

const DEFAULT_RESUME_LOAD_TIMEOUT_MS = 30_000;
const MAX_RESUME_LOAD_TIMEOUT_MS = 2_147_483_647;

export class ResuxResumeLoadTimeoutError extends Error {
  readonly handlerId: string;
  readonly timeoutMs: number;

  constructor(handlerId: string, timeoutMs: number) {
    super(`Timed out loading resumable handler ${handlerId} after ${timeoutMs}ms.`);
    this.name = "ResuxResumeLoadTimeoutError";
    this.handlerId = handlerId;
    this.timeoutMs = timeoutMs;
  }
}

function normalizeLoadTimeout(value: number | undefined): number {
  const timeoutMs = value ?? DEFAULT_RESUME_LOAD_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0 || timeoutMs > MAX_RESUME_LOAD_TIMEOUT_MS) {
    throw new RangeError(
      `loadTimeoutMs must be a finite non-negative number no greater than ${MAX_RESUME_LOAD_TIMEOUT_MS}.`,
    );
  }
  return timeoutMs;
}

/**
 * Lazily resolves resumable handlers from manifest-style registrations.
 * Resolved handlers are cached, concurrent loads are deduplicated, and replacing
 * a registration invalidates both cached and in-flight state for that handler id.
 * Handler loads are deadline-bound by default so one failed chunk cannot leave an
 * interaction pending forever.
 */
export class ResuxResumeHandlerRegistry {
  readonly #entries = new Map<string, ResuxResumeRegistration>();
  readonly #generations = new Map<string, number>();
  readonly #handlers = new Map<string, ResuxResumeHandler>();
  readonly #pending = new Map<string, Promise<ResuxResumeHandler>>();
  readonly #loadTimeoutMs: number;

  constructor(options: ResuxResumeRegistryOptions = {}) {
    this.#loadTimeoutMs = normalizeLoadTimeout(options.loadTimeoutMs);
  }

  /** Registers or replaces one resumable handler definition. */
  register(entry: ResuxResumeRegistration): void {
    if (!entry.id) throw new Error("Resume handler id must not be empty.");
    if (!entry.exportName) throw new Error(`Resume handler ${entry.id} must declare an export name.`);

    const storedEntry: ResuxResumeRegistration = {
      id: entry.id,
      module: entry.module,
      exportName: entry.exportName,
      load: entry.load,
    };

    this.#entries.set(storedEntry.id, storedEntry);
    this.#generations.set(storedEntry.id, (this.#generations.get(storedEntry.id) ?? 0) + 1);
    this.#handlers.delete(storedEntry.id);
    this.#pending.delete(storedEntry.id);
  }

  /** Registers multiple resumable handler definitions in order. */
  registerMany(entries: ResuxResumeRegistration[]): void {
    for (const entry of entries) this.register(entry);
  }

  /** Returns whether the registry knows about a handler id. */
  has(id: string): boolean {
    return this.#entries.has(id);
  }

  /** Loads one module with a deadline and exposes cancellation to cooperative loaders. */
  async #loadModule(id: string, entry: ResuxResumeRegistration): Promise<ResuxResumeModule> {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let modulePromise: Promise<ResuxResumeModule>;

    // Invoke synchronously so existing/custom loaders can expose their in-flight
    // resolver immediately. Promise.resolve still normalizes async completion,
    // while the catch preserves a rejected-promise API for synchronous throws.
    try {
      modulePromise = Promise.resolve(entry.load({ signal: controller.signal }));
    } catch (error) {
      modulePromise = Promise.reject(error);
    }

    if (this.#loadTimeoutMs === 0) return await modulePromise;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        const error = new ResuxResumeLoadTimeoutError(id, this.#loadTimeoutMs);
        // Reject the registry deadline first so a cooperative loader cannot replace
        // the stable timeout error with its own abort error in the Promise race.
        reject(error);
        controller.abort(error);
      }, this.#loadTimeoutMs);
    });

    try {
      return await Promise.race([modulePromise, timeoutPromise]);
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }

  /**
   * Resolves one handler lazily, reusing cached handlers and deduplicating active loads.
   * A load that started before a replacement may still resolve for its original caller,
   * but it cannot overwrite the newer registration or its cache. Timed-out loads follow
   * the same rule: a late underlying module resolution cannot populate the handler cache.
   */
  async load(id: string): Promise<ResuxResumeHandler> {
    const cached = this.#handlers.get(id);
    if (cached) return cached;

    const active = this.#pending.get(id);
    if (active) return active;

    const entry = this.#entries.get(id);
    if (!entry) throw new Error(`Unknown resumable handler ${id}.`);
    const generation = this.#generations.get(id);

    const pending = this.#loadModule(id, entry).then((module) => {
      const hasExport = Object.hasOwn(module, entry.exportName);
      const handler = hasExport ? module[entry.exportName] : undefined;
      if (typeof handler !== "function") {
        throw new Error(
          `Resumable handler ${id} expected function export ${entry.exportName} from ${entry.module}.`,
        );
      }

      const resolved = handler as ResuxResumeHandler;
      if (this.#generations.get(id) === generation) {
        this.#handlers.set(id, resolved);
      }
      return resolved;
    });

    if (this.#generations.get(id) === generation) {
      this.#pending.set(id, pending);
    }
    try {
      return await pending;
    } finally {
      if (this.#pending.get(id) === pending) {
        this.#pending.delete(id);
      }
    }
  }

  /** Loads and executes one resumable handler with the provided arguments. */
  async run(id: string, ...args: unknown[]): Promise<unknown> {
    const handler = await this.load(id);
    return handler(...args);
  }

  /** Loads and caches one handler without executing it. */
  preload(id: string): Promise<void> {
    return this.load(id).then(() => undefined);
  }
}

/** Creates a registry and seeds it with optional manifest registrations. */
export function createResumeHandlerRegistry(
  entries: ResuxResumeRegistration[] = [],
  options: ResuxResumeRegistryOptions = {},
): ResuxResumeHandlerRegistry {
  const registry = new ResuxResumeHandlerRegistry(options);
  registry.registerMany(entries);
  return registry;
}
