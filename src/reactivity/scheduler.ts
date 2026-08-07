const resolvedPromise = Promise.resolve();

type Job = () => void;

const RECURSION_LIMIT = 100;
const queue = new Set<Job>();
const postFlushQueue = new Set<Job>();
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
  postFlushQueue.add(job);
  queueFlush();
}

function queueFlush(): void {
  if (flushing) {
    return;
  }
  flushing = true;
  flushPromise = resolvedPromise.then(flushJobs);
}

function flushJobs(): void {
  let didError = false;
  let firstError: unknown;
  const executionCounts = new Map<Job, number>();
  const runJobs = (jobs: Job[]) => {
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const count = executionCounts.get(job) ?? 0;
      if (count >= RECURSION_LIMIT) {
        if (!didError) {
          didError = true;
          firstError = new Error(
            `Resux scheduler stopped a recursively queued job after ${RECURSION_LIMIT} executions.`,
          );
        }
        continue;
      }
      executionCounts.set(job, count + 1);

      try {
        job();
      } catch (error) {
        if (!didError) {
          didError = true;
          firstError = error;
        }
      }
    }
  };

  try {
    let hasJobs = true;
    while (hasJobs) {
      hasJobs = false;
      if (queue.size > 0) {
        const currentQueue = Array.from(queue);
        queue.clear();
        runJobs(currentQueue);
        hasJobs = true;
      }
      if (postFlushQueue.size > 0) {
        const currentPostQueue = Array.from(postFlushQueue);
        postFlushQueue.clear();
        runJobs(currentPostQueue);
        hasJobs = true;
      }
    }
  } finally {
    flushing = false;
    flushPromise = null;
  }

  if (didError) {
    throw firstError;
  }
}

export function currentFlushPromise(): Promise<void> | null {
  return flushPromise;
}
