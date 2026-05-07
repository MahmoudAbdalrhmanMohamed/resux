import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildProject } from "resuxjs/compiler";
import { createResuxNodeHandler } from "resuxjs/node";

interface RunningServer {
  origin: string;
  close(): Promise<void>;
}

const activeServers: RunningServer[] = [];

afterAll(async () => {
  await Promise.all(activeServers.map((server) => server.close()));
});

describe("route middleware and server middleware integration", () => {
  it("runs global + named route middleware on SSR and preserves server/middleware behavior", async () => {
    const root = path.join(os.tmpdir(), `resux-node-middleware-${Date.now()}`);
    await mkdir(path.join(root, "pages"), { recursive: true });
    await mkdir(path.join(root, "middleware"), { recursive: true });
    await mkdir(path.join(root, "server", "middleware"), { recursive: true });
    await writeFile(path.join(root, "pages", "index.vue"), `<script setup>definePageMeta({ middleware: "auth" })</script><template><main>Home</main></template>`);
    await writeFile(path.join(root, "pages", "login.vue"), "<template><main>Login</main></template>");
    await writeFile(path.join(root, "pages", "open.vue"), "<template><main>Open</main></template>");
    await writeFile(path.join(root, "pages", "denied.vue"), `<script setup>definePageMeta({ middleware: "deny" })</script><template><main>Denied</main></template>`);
    await writeFile(
      path.join(root, "middleware", "log.global.ts"),
      `export default defineResuxRouteMiddleware((to) => {
  globalThis.__RESUX_GLOBAL_MW_RUNS__ = (globalThis.__RESUX_GLOBAL_MW_RUNS__ ?? 0) + 1
  if (to.path === "/open") {
    return { redirect: "/login" }
  }
})`
    );
    await writeFile(
      path.join(root, "middleware", "auth.ts"),
      `export default defineResuxRouteMiddleware(() => navigateTo("/login"))`
    );
    await writeFile(
      path.join(root, "middleware", "deny.ts"),
      `export default defineResuxRouteMiddleware(() => false)`
    );
    await writeFile(
      path.join(root, "server", "middleware", "headers.ts"),
      `export default defineServerMiddleware((event) => {
  setHeader(event, "x-server-middleware", "true")
})`
    );

    await buildProject(root);
    const nodeHandler = createResuxNodeHandler({ appRoot: root });
    const server = await startServer((request, response) => {
      nodeHandler(request, response);
    });
    activeServers.push(server);

    (globalThis as { __RESUX_GLOBAL_MW_RUNS__?: number }).__RESUX_GLOBAL_MW_RUNS__ = 0;

    const indexResponse = await fetch(`${server.origin}/`, { redirect: "manual" });
    expect(indexResponse.status).toBe(302);
    expect(indexResponse.headers.get("location")).toBe("/login");
    expect(indexResponse.headers.get("x-server-middleware")).toBe("true");

    const openResponse = await fetch(`${server.origin}/open`, { redirect: "manual" });
    expect(openResponse.status).toBe(302);
    expect(openResponse.headers.get("location")).toBe("/login");
    expect(openResponse.headers.get("x-server-middleware")).toBe("true");

    const deniedResponse = await fetch(`${server.origin}/denied`, { redirect: "manual" });
    expect(deniedResponse.status).toBe(403);
    expect(await deniedResponse.text()).toContain("Navigation aborted");
    expect(deniedResponse.headers.get("x-server-middleware")).toBe("true");

    const loginResponse = await fetch(`${server.origin}/login`, { redirect: "manual" });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.headers.get("x-server-middleware")).toBe("true");
    expect(await loginResponse.text()).toContain("<main>Login</main>");

    expect((globalThis as { __RESUX_GLOBAL_MW_RUNS__?: number }).__RESUX_GLOBAL_MW_RUNS__).toBeGreaterThanOrEqual(4);
  }, 30000);
});

async function startServer(
  handler: (request: IncomingMessage, response: ServerResponse) => void
): Promise<RunningServer> {
  const server = createServer(handler);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve test server address.");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      })
  };
}
