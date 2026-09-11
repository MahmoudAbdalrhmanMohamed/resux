import { describe, expect, it } from "vitest";
import {
  bufferResuxHtml,
  createResuxHtmlReadableStream,
  shouldStreamResponse,
  streamResuxHtml,
} from "../src/runtime/streaming.js";

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
    let closed = false;
    let resolveNext!: (result: IteratorResult<string>) => void;
    const body: AsyncIterable<string> = {
      [Symbol.asyncIterator]() {
        return {
          next: () => new Promise<IteratorResult<string>>((resolve) => {
            resolveNext = resolve;
          }),
          return: async () => {
            closed = true;
            return { value: undefined, done: true };
          },
        };
      },
    };

    const iterator = streamResuxHtml({ shell: "shell", body, signal: controller.signal });
    expect((await iterator.next()).value).toBe("shell");
    const pending = iterator.next();
    await Promise.resolve();
    controller.abort(new Error("request closed"));
    await expect(pending).rejects.toThrow("request closed");
    expect(closed).toBe(true);
    resolveNext?.({ value: undefined, done: true });
  });

  it("propagates ReadableStream cancellation to a pending body iterator", async () => {
    let closed = false;
    let resolveNext!: (result: IteratorResult<string>) => void;
    const body: AsyncIterable<string> = {
      [Symbol.asyncIterator]() {
        return {
          next: () => new Promise<IteratorResult<string>>((resolve) => {
            resolveNext = resolve;
          }),
          return: async () => {
            closed = true;
            return { value: undefined, done: true };
          },
        };
      },
    };

    const reader = createResuxHtmlReadableStream({ shell: "shell", body }).getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe("shell");
    const pending = reader.read();
    await Promise.resolve();
    await reader.cancel("client disconnected");
    await Promise.resolve();
    expect(closed).toBe(true);
    resolveNext?.({ value: undefined, done: true });
    await pending.catch(() => undefined);
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
