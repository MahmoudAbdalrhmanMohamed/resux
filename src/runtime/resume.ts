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

export class ResuxResumeHandlerRegistry {
  #entries = new Map<string, ResuxResumeRegistration>();
  #handlers = new Map<string, ResuxResumeHandler>();
  #pending = new Map<string, Promise<ResuxResumeHandler>>();

  register(entry: ResuxResumeRegistration): void {
    if (!entry.id) throw new Error("Resume handler id must not be empty.");
    if (!entry.exportName) throw new Error(`Resume handler ${entry.id} must declare an export name.`);
    this.#entries.set(entry.id, entry);
  }

  registerMany(entries: ResuxResumeRegistration[]): void {
    for (const entry of entries) this.register(entry);
  }

  has(id: string): boolean {
    return this.#entries.has(id) || this.#handlers.has(id);
  }

  async load(id: string): Promise<ResuxResumeHandler> {
    const cached = this.#handlers.get(id);
    if (cached) return cached;

    const active = this.#pending.get(id);
    if (active) return active;

    const entry = this.#entries.get(id);
    if (!entry) throw new Error(`Unknown resumable handler ${id}.`);

    const pending = entry.load().then((module) => {
      const handler = module[entry.exportName];
      if (typeof handler !== "function") {
        throw new Error(
          `Resumable handler ${id} expected function export ${entry.exportName} from ${entry.module}.`,
        );
      }
      const resolved = handler as ResuxResumeHandler;
      this.#handlers.set(id, resolved);
      return resolved;
    }).finally(() => {
      this.#pending.delete(id);
    });

    this.#pending.set(id, pending);
    return pending;
  }

  async run(id: string, ...args: unknown[]): Promise<unknown> {
    const handler = await this.load(id);
    return await handler(...args);
  }

  preload(id: string): Promise<void> {
    return this.load(id).then(() => undefined);
  }
}

export function createResumeHandlerRegistry(
  entries: ResuxResumeRegistration[] = [],
): ResuxResumeHandlerRegistry {
  const registry = new ResuxResumeHandlerRegistry();
  registry.registerMany(entries);
  return registry;
}
