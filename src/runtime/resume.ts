export type ResuxResumeHandler = (...args: unknown[]) => unknown | Promise<unknown>;
export type ResuxResumeModule = Record<string, unknown>;
export type ResuxResumeModuleLoader = () => Promise<ResuxResumeModule>;

export interface ResuxResumeManifestEntry {
  id: string;
  module: string;
  exportName: string;
}

export interface ResuxResumeRegistration extends ResuxResumeManifestEntry {
  load: ResuxResumeModuleLoader;
}

/**
 * Lazily resolves resumable handlers from manifest-style registrations.
 * Resolved handlers are cached, concurrent loads are deduplicated, and replacing
 * a registration invalidates both cached and in-flight state for that handler id.
 */
export class ResuxResumeHandlerRegistry {
  readonly #entries = new Map<string, ResuxResumeRegistration>();
  readonly #generations = new Map<string, number>();
  readonly #handlers = new Map<string, ResuxResumeHandler>();
  readonly #pending = new Map<string, Promise<ResuxResumeHandler>>();

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

  /**
   * Resolves one handler lazily, reusing cached handlers and deduplicating active loads.
   * A load that started before a replacement may still resolve for its original caller,
   * but it cannot overwrite the newer registration or its cache.
   */
  async load(id: string): Promise<ResuxResumeHandler> {
    const cached = this.#handlers.get(id);
    if (cached) return cached;

    const active = this.#pending.get(id);
    if (active) return active;

    const entry = this.#entries.get(id);
    if (!entry) throw new Error(`Unknown resumable handler ${id}.`);
    const generation = this.#generations.get(id);

    const pending = entry.load().then((module) => {
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
): ResuxResumeHandlerRegistry {
  const registry = new ResuxResumeHandlerRegistry();
  registry.registerMany(entries);
  return registry;
}
