import { describe, expect, it } from "vitest";
import {
  bufferResuxHtml,
  createResuxHtmlReadableStream,
  shouldStreamResponse,
  streamResuxHtml,
} from "../src/runtime/streaming.js";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createPendingBody(onReturn?: () => Promise<void> | void) {
  const readStarted = deferred<void>();
  const nextResult = deferred<IteratorResult<string>>();
  const cleanupStarted = deferred<void>();
  let closed = false;

  const body: AsyncIterable<string> = {
    [Symbol.asyncIterator]() {
      return {
        next: (): Promise<IteratorResult<string>> => {
          readStarted.resolve();
          return nextResult.promise;
        },
        return: async (): Promise<IteratorResult<string>> => {
          cleanupStarted.resolve();
          await onReturn?.();
          closed = true;
          return { value: undefined, done: true };
        },
      };
    },
  };

  return {
    body,
    bodyReadStarted: readStarted.promise,
    cleanupStarted: cleanupStarted.promise,
    resolveNext: nextResult.resolve,
    isClosed: () => closed,
  };
}

describe("SSR streaming", () => {
  it("flushes the shell before delayed body content", async () => {
    async function* body() {
      await Promise.resolve();
      yield "<main>ready</main>";
    }
    const iterator = streamResuxHtml({ shell: "<html><body>", body: body(), tail: "</body></html>" });
    expect(await iterator.next()).toEqual({ value: "<html><body>", done: false });
    expect(await iterator.next()).toEqual({ value: "<main>ready</main>", done: false });
    expect(await iterator.next()).toEqual({ value: "</body></html>", done: false });
  });

  it("buffers through the same output path when streaming is unsafe", async () => {
    expect(shouldStreamResponse({ redirected: true })).toBe(false);
    expect(shouldStreamResponse({ setsCookies: true })).toBe(false);
    expect(shouldStreamResponse({ lateHeaderMutation: true })).toBe(false);
    expect(shouldStreamResponse({ lateStatusMutation: true })).toBe(false);
    expect(shouldStreamResponse({ enabled: false })).toBe(false);
    expect(shouldStreamResponse({})).toBe(true);
    await expect(bufferResuxHtml({ shell: "a", body: ["b", "c"], tail: "d" })).resolves.toBe("abcd");
  });

  it("stops a pending body read immediately when the request is aborted", async () => {
    const controller = new AbortController();
    const pendingBody = createPendingBody();
    const iterator = streamResuxHtml({ shell: "shell", body: pendingBody.body, signal: controller.signal });

    expect((await iterator.next()).value).toBe("shell");
    const pending = iterator.next();
    await pendingBody.bodyReadStarted;
    controller.abort(new Error("request closed"));

    await expect(pending).rejects.toThrow("request closed");
    expect(pendingBody.isClosed()).toBe(true);
    pendingBody.resolveNext({ value: undefined, done: true });
  });

  it("closes a paused body iterator when the request aborts between pulls", async () => {
    const controller = new AbortController();
    let closed = false;
    let reads = 0;
    const body: AsyncIterable<string> = {
      [Symbol.asyncIterator]() {
        return {
          next: async () => {
            reads += 1;
            if (reads === 1) return { value: "chunk", done: false };
            return new Promise<IteratorResult<string>>(() => undefined);
          },
          return: async () => {
            closed = true;
            return { value: undefined, done: true };
          },
        };
      },
    };

    const iterator = streamResuxHtml({ shell: "shell", body, signal: controller.signal });
    expect((await iterator.next()).value).toBe("shell");
    expect((await iterator.next()).value).toBe("chunk");
    controller.abort(new Error("request closed while paused"));
    expect(closed).toBe(true);
    await expect(iterator.next()).rejects.toThrow("request closed while paused");
  });

  it("propagates ReadableStream cancellation to a pending body iterator", async () => {
    const pendingBody = createPendingBody();
    const reader = createResuxHtmlReadableStream({ shell: "shell", body: pendingBody.body }).getReader();

    expect(new TextDecoder().decode((await reader.read()).value)).toBe("shell");
    const pending = reader.read();
    await pendingBody.bodyReadStarted;
    await reader.cancel("client disconnected");

    expect(pendingBody.isClosed()).toBe(true);
    pendingBody.resolveNext({ value: undefined, done: true });
    await pending.catch(() => undefined);
  });

  it("waits for asynchronous body cleanup before cancellation resolves", async () => {
    const cleanupReleased = deferred<void>();
    const pendingBody = createPendingBody(() => cleanupReleased.promise);
    const reader = createResuxHtmlReadableStream({ shell: "shell", body: pendingBody.body }).getReader();

    expect(new TextDecoder().decode((await reader.read()).value)).toBe("shell");
    const pending = reader.read();
    await pendingBody.bodyReadStarted;
    const cancellation = reader.cancel("client disconnected");

    await pendingBody.cleanupStarted;
    expect(pendingBody.isClosed()).toBe(false);
    cleanupReleased.resolve();
    await cancellation;
    expect(pendingBody.isClosed()).toBe(true);

    pendingBody.resolveNext({ value: undefined, done: true });
    await pending.catch(() => undefined);
  });

  it.each([
    { name: "an already-aborted parent Error", reason: new Error("request closed before streaming") },
    { name: "an explicit null abort reason", reason: null },
  ])("surfaces $name as a ReadableStream error", async ({ reason }) => {
    const controller = new AbortController();
    controller.abort(reason);
    const reader = createResuxHtmlReadableStream({
      shell: "shell",
      body: "body",
      signal: controller.signal,
    }).getReader();

    await expect(reader.read()).rejects.toBe(reason);
  });

  it("preserves surrogate pairs split across streamed chunks", async () => {
    const options = {
      shell: "<p>",
      body: ["smile: \uD83D", "\uDE00"],
      tail: "</p>",
    };
    const expected = await bufferResuxHtml(options);
    const response = new Response(createResuxHtmlReadableStream(options));
    expect(await response.text()).toBe(expected);
    expect(expected).toBe("<p>smile: 😀</p>");
  });
});
