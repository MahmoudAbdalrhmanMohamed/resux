export interface ResuxHookPayloads {
  "config:resolved": { rootDir: string; buildDir: string; config: Record<string, unknown> };
  "app:resolve": { appRoot: string; outDir: string };
  "app:templates": { outDir: string; templatesDir: string };
  "app:templatesGenerated": { outDir: string; files: string[] };
  "pages:extend": { pages: Array<Record<string, unknown>> };
  "pages:resolved": { pages: Array<Record<string, unknown>> };
  "imports:dirs": { dirs: string[] };
  "imports:extend": { imports: Array<Record<string, unknown>> };
  "components:dirs": { dirs: string[] };
  "components:extend": { components: Array<Record<string, unknown>> };
  "plugins:dirs": { dirs: string[] };
  "plugins:extend": { plugins: Array<Record<string, unknown>> };
  "middleware:dirs": { dirs: string[] };
  "middleware:extend": { middleware: Array<Record<string, unknown>> };
  "vite:extendConfig": { config: Record<string, unknown>; dev: boolean };
  "vite:serverCreated": { server: unknown };
  "vite:compiled": { outDir: string; dev: boolean };
  "build:before": { appRoot: string; outDir: string; mode: "dev" | "build" };
  "build:manifest": { manifest: Record<string, unknown>; outDir: string };
  "build:done": { appRoot: string; outDir: string; mode: "dev" | "build" };
  "build:error": { appRoot: string; outDir: string; mode: "dev" | "build"; error: unknown };
  "nitro:config": { config: Record<string, unknown> };
  "nitro:init": { appRoot: string };
  "nitro:build:before": { appRoot: string; preset?: string };
  "nitro:build:public-assets": { appRoot: string; publicDir: string };
  "prepare:types": { outDir: string; files: string[] };
  "dev:reload": { appRoot: string; changedPath: string };
  "dev:error": { appRoot: string; error: unknown };
  "page:loading:start": { path?: string };
  "page:loading:end": { path?: string };
  "page:finish": { path?: string };
  "app:error": { error: unknown };
  "app:error:cleared": { path?: string };
}

export type ResuxHookName = keyof ResuxHookPayloads;
export type ResuxHookHandler<T = unknown> = (payload: T) => void | Promise<void>;
type HookMap = { [K in ResuxHookName]?: ResuxHookHandler<ResuxHookPayloads[K]>[] };

export class ResuxHooks {
  private readonly map: HookMap = {};

  hook<K extends ResuxHookName>(name: K, handler: ResuxHookHandler<ResuxHookPayloads[K]>): () => void {
    const handlers = (this.map[name] ?? []) as ResuxHookHandler<ResuxHookPayloads[K]>[];
    handlers.push(handler);
    this.map[name] = handlers as HookMap[K];
    return () => this.remove(name, handler);
  }

  addHooks(handlers: Partial<{ [K in ResuxHookName]: ResuxHookHandler<ResuxHookPayloads[K]> | ResuxHookHandler<ResuxHookPayloads[K]>[] }>): void {
    for (const [key, value] of Object.entries(handlers) as Array<[ResuxHookName, unknown]>) {
      if (!value) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          this.hook(key, item as ResuxHookHandler<ResuxHookPayloads[typeof key]>);
        }
        continue;
      }
      this.hook(key, value as ResuxHookHandler<ResuxHookPayloads[typeof key]>);
    }
  }

  async callHook<K extends ResuxHookName>(name: K, payload: ResuxHookPayloads[K]): Promise<void> {
    const handlers = this.map[name];
    if (!handlers || handlers.length === 0) {
      return;
    }

    // Dispatch a stable snapshot. A hook is allowed to register or remove hooks,
    // but those mutations must affect the next dispatch rather than extending or
    // shrinking the loop that is currently running.
    for (const handler of [...handlers]) {
      try {
        await handler(payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Resux hook "${name}" failed: ${message}`);
      }
    }
  }

  private remove<K extends ResuxHookName>(name: K, target: ResuxHookHandler<ResuxHookPayloads[K]>): void {
    const handlers = this.map[name];
    if (!handlers?.length) {
      return;
    }
    const next = handlers.filter((handler) => handler !== target);
    if (next.length === 0) {
      delete this.map[name];
      return;
    }
    this.map[name] = next as HookMap[K];
  }
}

export function createResuxHooks(): ResuxHooks {
  return new ResuxHooks();
}
