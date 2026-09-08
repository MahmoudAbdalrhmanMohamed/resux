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

export function shouldStreamResponse(context: ResuxStreamingDecisionContext = {}): boolean {
  if (context.enabled === false) return false;
  if (context.redirected) return false;
  if (context.setsCookies) return false;
  if (context.lateStatusMutation) return false;
  if (context.lateHeaderMutation) return false;
  return true;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
}

async function* iterateBody(body: ResuxHtmlStreamOptions["body"]): AsyncGenerator<string> {
  if (typeof body === "string") {
    yield body;
    return;
  }
  for await (const chunk of body) yield chunk;
}

export async function* streamResuxHtml(options: ResuxHtmlStreamOptions): AsyncGenerator<string> {
  throwIfAborted(options.signal);
  if (options.shell) yield options.shell;

  for await (const chunk of iterateBody(options.body)) {
    throwIfAborted(options.signal);
    if (chunk) yield chunk;
  }

  throwIfAborted(options.signal);
  if (options.tail) yield options.tail;
}

export function createResuxHtmlReadableStream(options: ResuxHtmlStreamOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const iterator = streamResuxHtml(options)[Symbol.asyncIterator]();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await iterator.next();
        if (next.done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(next.value));
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel(reason) {
      if (iterator.return) await iterator.return(reason);
    },
  });
}

export async function bufferResuxHtml(options: ResuxHtmlStreamOptions): Promise<string> {
  let html = "";
  for await (const chunk of streamResuxHtml(options)) html += chunk;
  return html;
}
