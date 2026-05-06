const resolvedPromise = Promise.resolve();

type Job = () => void;

const queue = new Set<Job>();
let flushing = false;
let flushPromise: Promise<void> | null = null;

export function nextTick<T = void>(fn?: () => T | PromiseLike<T>): Promise<T | void> {
  const promise = flushPromise ?? resolvedPromise;
  return fn ? promise.then(fn) : promise;
}

export function queueJob(job: Job): void {
  queue.add(job);
  queueFlush();
}

export function queuePostFlushCb(job: Job): void {
  queueJob(job);
}

function queueFlush(): void {
  if (flushing) {
    return;
  }
  flushing = true;
  flushPromise = resolvedPromise.then(flushJobs);
}

function flushJobs(): void {
  try {
    for (const job of queue) {
      job();
    }
  } finally {
    queue.clear();
    flushing = false;
    flushPromise = null;
  }
}

export function currentFlushPromise(): Promise<void> | null {
  return flushPromise;
}
