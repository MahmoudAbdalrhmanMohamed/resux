import {
  ICON_FETCH_CACHE_MAX_ENTRIES,
  ICON_FETCH_MAX_IN_FLIGHT,
  ICON_FETCH_QUEUE_MAX_ENTRIES,
} from "./constants.js";
import type { IconData } from "./types.js";

export interface IconCacheOptions {
  maxEntries?: number;
  maxInFlight?: number;
  maxQueue?: number;
}

export class IconCacheManager {
  readonly #maxEntries: number;
  readonly #maxInFlight: number;
  readonly #maxQueue: number;

  readonly #dataCache = new Map<string, IconData>();
  readonly #pendingFetches = new Map<string, Promise<IconData | null>>();
  readonly #queue: Array<() => void> = [];
  #activeCount = 0;

  constructor(options: IconCacheOptions = {}) {
    this.#maxEntries = options.maxEntries ?? ICON_FETCH_CACHE_MAX_ENTRIES;
    this.#maxInFlight = options.maxInFlight ?? ICON_FETCH_MAX_IN_FLIGHT;
    this.#maxQueue = options.maxQueue ?? ICON_FETCH_QUEUE_MAX_ENTRIES;
  }

  get size(): number {
    return this.#dataCache.size;
  }

  get(key: string): IconData | undefined {
    const value = this.#dataCache.get(key);
    if (!value) return undefined;
    // Refresh LRU order
    this.#dataCache.delete(key);
    this.#dataCache.set(key, value);
    return value;
  }

  set(key: string, data: IconData): void {
    this.#dataCache.delete(key);
    this.#dataCache.set(key, data);
    while (this.#dataCache.size > this.#maxEntries) {
      const oldestKey = this.#dataCache.keys().next().value;
      if (oldestKey === undefined) break;
      this.#dataCache.delete(oldestKey);
    }
  }

  has(key: string): boolean {
    return this.#dataCache.has(key);
  }

  delete(key: string): boolean {
    return this.#dataCache.delete(key);
  }

  clear(): void {
    this.#dataCache.clear();
    this.#pendingFetches.clear();
    this.#queue.length = 0;
    this.#activeCount = 0;
  }

  getPending(key: string): Promise<IconData | null> | undefined {
    return this.#pendingFetches.get(key);
  }

  setPending(key: string, promise: Promise<IconData | null>): void {
    this.#pendingFetches.set(key, promise);
  }

  deletePending(key: string): void {
    this.#pendingFetches.delete(key);
  }

  runWithSlot<T>(task: () => Promise<T>): Promise<T | null> {
    if (this.#activeCount >= this.#maxInFlight && this.#queue.length >= this.#maxQueue) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const execute = () => {
        this.#activeCount += 1;
        void task()
          .then(resolve, () => resolve(null))
          .finally(() => {
            this.#activeCount = Math.max(0, this.#activeCount - 1);
            this.#queue.shift()?.();
          });
      };

      if (this.#activeCount < this.#maxInFlight) {
        execute();
      } else {
        this.#queue.push(execute);
      }
    });
  }
}

export const defaultIconCache = new IconCacheManager();
