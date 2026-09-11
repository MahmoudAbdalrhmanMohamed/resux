export interface ResuxStreamingDecisionContext {
  enabled?: boolean;
  redirected?: boolean;
  setsCookies?: boolean;
  lateStatusMutation?: boolean;
  lateHeaderMutation?: boolean;
}

export interface ResuxHtmlStreamOptions {
  shell: string;
  body: string | AsyncIterable<string> | Iterable<string>;
  tail?: string;
  signal?: AbortSignal;
}

const bodyCleanupObserver = Symbol("resux-body-cleanup-observer");
type ResuxInternalHtmlStreamOptions = ResuxHtmlStreamOptions & {
  [bodyCleanupObserver]?: (cleanup: Promise<void>) => void;
};

/** Returns whether a response is safe to commit through the streaming path. */
export function shouldStreamResponse(context: ResuxStreamingDecisionContext = {}): boolean {
  if (context.enabled === false) return false;
  if (context.redirected) return false;
  if (context.setsCookies) return false;
  if (context.lateStatusMutation) return false;
  if (context.lateHeaderMutation) return false;
  return true;
}

function abortReason(signal?: AbortSignal): unknown {
  return signal?.reason ?? new DOMException("Aborted", "AbortError");
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortReason(signal);
}

type ResuxBodyIterator = AsyncIterator<string> | Iterator<string>;

function getBodyIterator(body: Exclude<ResuxHtmlStreamOptions["body"], string>): ResuxBodyIterator {
  const asyncIterable = body as AsyncIterable<string>;
  if (typeof asyncIterable[Symbol.asyncIterator] === "function") {
    return asyncIterable[Symbol.asyncIterator]();
  }
  return (body as Iterable<string>)[Symbol.iterator]();
}

async function closeIterator(iterator: ResuxBodyIterator): Promise<void> {
  if (!iterator.return) return;
  try {
    await iterator.return();
  } catch {
    // Closing is best-effort; the original stream error/abort remains authoritative.
  }
}

async function nextBodyChunk(
  iterator: ResuxBodyIterator,
  signal?: AbortSignal,
): Promise<IteratorResult<string>> {
  throwIfAborted(signal);
  if (!signal) return await iterator.next();

  let rejectAbort!: (reason?: unknown) => void;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject;
  });
  const onAbort = () => rejectAbort(abortReason(signal));
  signal.addEventListener("abort", onAbort, { once: true });
  if (signal.aborted) onAbort();

  try {
    const next = Promise.resolve().then(() => iterator.next());
    return await Promise.race([next, aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

/** Yields shell, body, and tail HTML while propagating request cancellation upstream. */
export async function* streamResuxHtml(options: ResuxHtmlStreamOptions): AsyncGenerator<string> {
  throwIfAborted(options.signal);
  if (options.shell) yield options.shell;

  if (typeof options.body === "string") {
    throwIfAborted(options.signal);
    if (options.body) yield options.body;
  } else {
    const internalOptions = options as ResuxInternalHtmlStreamOptions;
    const iterator = getBodyIterator(options.body);
    let completed = false;
    let reading = false;
    let abortedWhileReading = false;
    let closePromise: Promise<void> | undefined;
    const requestClose = () => {
      if (!closePromise) {
        closePromise = closeIterator(iterator);
        internalOptions[bodyCleanupObserver]?.(closePromise);
      }
      return closePromise;
    };
    const closeWhenPaused = () => {
      if (reading) {
        abortedWhileReading = true;
        return;
      }
      void requestClose();
    };

    options.signal?.addEventListener("abort", closeWhenPaused, { once: true });
    if (options.signal?.aborted) closeWhenPaused();

    try {
      while (true) {
        let next: IteratorResult<string>;
        reading = true;
        try {
          next = await nextBodyChunk(iterator, options.signal);
        } finally {
          reading = false;
        }
        if (next.done) {
          completed = true;
          break;
        }
        throwIfAborted(options.signal);
        if (next.value) yield next.value;
      }
    } finally {
      options.signal?.removeEventListener("abort", closeWhenPaused);
      if (!completed) {
        const cleanup = requestClose();
        if (!abortedWhileReading) await cleanup;
      }
    }
  }

  throwIfAborted(options.signal);
  if (options.tail) yield options.tail;
}

function endsWithHighSurrogate(value: string): boolean {
  if (!value) return false;
  const code = value.charCodeAt(value.length - 1);
  return code >= 0xd800 && code <= 0xdbff;
}

/** Creates a Web ReadableStream that UTF-8 encodes streamed HTML without splitting surrogate pairs. */
export function createResuxHtmlReadableStream(options: ResuxHtmlStreamOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const streamAbort = new AbortController();
  let trailingHighSurrogate = "";
  let removeParentAbort: (() => void) | undefined;
  let bodyCleanup: Promise<void> = Promise.resolve();
  let streamClosePromise: Promise<void> | undefined;
  const streamOptions: ResuxInternalHtmlStreamOptions = {
    ...options,
    signal: streamAbort.signal,
    [bodyCleanupObserver]: (cleanup) => {
      bodyCleanup = cleanup;
    },
  };
  const iterator = streamResuxHtml(streamOptions)[Symbol.asyncIterator]();

  const cleanup = () => {
    removeParentAbort?.();
    removeParentAbort = undefined;
  };
  const closeStream = (reason?: unknown): Promise<void> => {
    if (!streamClosePromise) {
      streamClosePromise = (async () => {
        streamAbort.abort(reason);
        cleanup();
        if (iterator.return) {
          try {
            await iterator.return(reason);
          } catch {
            // The abort remains authoritative if generator cleanup fails.
          }
        }
        await bodyCleanup;
      })();
    }
    return streamClosePromise;
  };

  if (options.signal) {
    const forwardAbort = () => {
      void closeStream(abortReason(options.signal));
    };
    if (options.signal.aborted) forwardAbort();
    else {
      options.signal.addEventListener("abort", forwardAbort, { once: true });
      removeParentAbort = () => options.signal?.removeEventListener("abort", forwardAbort);
    }
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (true) {
          const next = await iterator.next();
          if (next.done) {
            if (trailingHighSurrogate) controller.enqueue(encoder.encode(trailingHighSurrogate));
            cleanup();
            controller.close();
            return;
          }

          let chunk = trailingHighSurrogate + next.value;
          trailingHighSurrogate = "";
          if (endsWithHighSurrogate(chunk)) {
            trailingHighSurrogate = chunk.slice(-1);
            chunk = chunk.slice(0, -1);
          }
          if (!chunk) continue;
          controller.enqueue(encoder.encode(chunk));
          return;
        }
      } catch (error) {
        cleanup();
        controller.error(error);
      }
    },
    async cancel(reason) {
      await closeStream(reason);
    },
  });
}

/** Buffers the same shell/body/tail pipeline into a single HTML string. */
export async function bufferResuxHtml(options: ResuxHtmlStreamOptions): Promise<string> {
  let html = "";
  for await (const chunk of streamResuxHtml(options)) html += chunk;
  return html;
}
