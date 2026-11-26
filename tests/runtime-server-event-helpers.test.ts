import path from "node:path";
import { describe, expect, it } from "vitest";
import { readBody, setHeader } from "resuxjs/runtime";

describe("server event helpers", () => {
  it("sets response headers through the h3-style helper", () => {
    const headers = new Map<string, number | string | string[]>();
    const event = {
      path: "/api/message",
      method: "GET",
      query: {},
      params: {},
      node: {
        req: {},
        res: {
          setHeader(name: string, value: number | string | string[]) {
            headers.set(name, value);
          }
        }
      }
    };

    setHeader(event, "x-app", "resux");

    expect(headers.get("x-app")).toBe("resux");
  });

  it("reads JSON request bodies", async () => {
    const event = {
      path: "/api/message",
      method: "POST",
      query: {},
      params: {},
      node: {
        req: {
          async *[Symbol.asyncIterator]() {
            yield Buffer.from('{"message":"hello"}');
          }
        },
        res: {}
      }
    };

    await expect(readBody<{ message: string }>(event)).resolves.toEqual({ message: "hello" });
  });
});
