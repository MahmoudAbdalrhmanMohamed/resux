import { describe, expect, it } from "vitest";
import {
  bufferResuxHtml,
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

  it("stops streaming when the request is aborted", async () => {
    const controller = new AbortController();
    async function* body() {
      yield "body";
    }
    const iterator = streamResuxHtml({ shell: "shell", body: body(), signal: controller.signal });
    expect((await iterator.next()).value).toBe("shell");
    controller.abort(new Error("request closed"));
    await expect(iterator.next()).rejects.toThrow("request closed");
  });
});
