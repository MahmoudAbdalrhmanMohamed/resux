#!/usr/bin/env node
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vuePlugin from "@vitejs/plugin-vue";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { buildProject, type BuildOptions } from "./compiler/index.js";
import { runCreateResux } from "./create.js";
import { renderApp, renderDocument, type RenderResult, type RouteContext, type RouteMiddlewareResult } from "./runtime/index.js";

const version = "0.1.0";
const require = createRequire(import.meta.url);
let activeDevBuild: Promise<void> | null = null;
let devBuildDirty = false;
let devBuildRevision = 0;
let devReloadRevision = 0;
const devReloadClients = new Set<ServerResponse>();

interface RenderRedirect {
  type: "redirect";
  to: string;
  statusCode: number;
}

interface RenderAbort {
  type: "abort";
  message: string;
  statusCode: number;
}

interface RouteRule {
  headers?: Record<string, string>;
  redirect?: string | { to: string; statusCode?: number };
  statusCode?: number;
  cache?: false | string | { maxAge?: number; swr?: number };
  cors?: boolean | {
    origin?: string;
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  };
}

type RenderRouteOutcome = RenderResult | RenderRedirect | RenderAbort | null;
type DeployPreset = "node" | "docker" | "nitro";

interface CliOptions {
  appRoot: string;
  port?: string;
  host?: string;
  securityHeaders?: boolean;
  json: boolean;
  deployPreset: DeployPreset;
  force: boolean;
}

export interface ResuxNodeHandlerOptions {
  appRoot?: string;
  outDir?: string;
  securityHeaders?: boolean;
}

export function createResuxNodeHandler(options: ResuxNodeHandlerOptions = {}) {
  const appRoot = path.resolve(options.appRoot ?? process.cwd());
  const outDir = path.resolve(options.outDir ?? path.join(appRoot, ".resux"));
  const buildOptions: BuildOptions = {};

  return (request: IncomingMessage, response: ServerResponse): void => {
    void handleRequest(request, response, {
      appRoot,
      outDir,
      dev: false,
      buildOptions,
      securityHeaders: options.securityHeaders ?? true
    });
  };
}

if (isMainModule()) {
  await runCli(process.argv.slice(2));
}

async function runCli(args: string[]): Promise<void> {
  const command = readCommand(args);
  const commandArgs = command === args[0] ? args.slice(1) : args;

  if (command === "help") {
    printHelp();
    return;
  }

  if (command === "version") {
    console.log(version);
    return;
  }

  if (command === "init" || command === "create") {
    await runCreateResux(commandArgs);
    return;
  }

  const cliOptions = readCliOptions(commandArgs);
  const appRoot = path.resolve(cliOptions.appRoot);
  const outDir = path.join(appRoot, ".resux");
  const buildOptions: BuildOptions = {};
  const securityHeaders = cliOptions.securityHeaders ?? command !== "dev";
  const port = readPort(cliOptions.port ?? process.env.PORT, 3000);

  try {
  if (command === "build") {
    const result = await buildProject(appRoot, outDir, { ...buildOptions, vite: "build" });
    console.log(`Built ${result.routes.length} route(s) into ${path.relative(process.cwd(), outDir)}`);
  } else if (command === "deploy") {
    await generateDeploymentFiles(appRoot, cliOptions.deployPreset, cliOptions.force);
  } else if (command === "inspect") {
    await inspectProject(appRoot, outDir, buildOptions, cliOptions.json);
  } else if (command === "dev") {
    await buildProject(appRoot, outDir, { ...buildOptions, vite: "dev" });
    const vite = await startViteDevServer(outDir);
    startDevWatcher(vite, appRoot, outDir, buildOptions);
    await startServer({ appRoot, outDir, port, host: cliOptions.host, dev: true, buildOptions, vite, securityHeaders });
  } else if (command === "preview" || command === "start") {
    if (await previewNeedsBuild(outDir, buildOptions)) {
      await buildProject(appRoot, outDir, { ...buildOptions, vite: "build" });
    }
    await startServer({ appRoot, outDir, port, host: cliOptions.host, dev: false, buildOptions, securityHeaders });
  } else {
    console.error(`Unknown command "${command}". Run resux --help for usage.`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
}
}

function isMainModule(): boolean {
  return process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
}

function readCommand(args: string[]): string {
  const first = args[0];

  if (first === "init" || first === "create") {
    return first;
  }

  if (args.includes("--help") || args.includes("-h")) {
    return "help";
  }

  if (args.includes("--version") || args.includes("-v")) {
    return "version";
  }

  if (!first || first.startsWith("-")) {
    return "dev";
  }

  if (first === "help" || first === "version") {
    return first;
  }

  return first;
}

function readCliOptions(args: string[]): CliOptions {
  let appRoot = process.cwd();
  let port: string | undefined;
  let host: string | undefined;
  let securityHeaders: boolean | undefined;
  let json = false;
  let deployPreset: DeployPreset = "node";
  let force = false;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--security-headers") {
      securityHeaders = true;
    } else if (arg === "--no-security-headers") {
      securityHeaders = false;
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--preset") {
      deployPreset = readDeployPreset(readRequiredOptionValue(args[++index], arg));
    } else if (arg.startsWith("--preset=")) {
      deployPreset = readDeployPreset(arg.slice("--preset=".length));
    } else if (arg === "--force") {
      force = true;
    } else if (arg === "--port" || arg === "-p") {
      port = readRequiredOptionValue(args[++index], arg);
    } else if (arg.startsWith("--port=")) {
      port = arg.slice("--port=".length);
    } else if (arg === "--host") {
      host = readRequiredOptionValue(args[++index], arg);
    } else if (arg.startsWith("--host=")) {
      host = arg.slice("--host=".length);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option "${arg}". Run resux --help for usage.`);
    } else if (!arg.startsWith("-")) {
      appRoot = arg;
    }
  }

  return { appRoot, port, host, securityHeaders, json, deployPreset, force };
}

function readRequiredOptionValue(value: string | undefined, option: string): string {
  if (!value || value.startsWith("-")) {
    throw new Error(`${option} needs a value.`);
  }
  return value;
}

function readDeployPreset(value: string): DeployPreset {
  if (value === "node" || value === "docker" || value === "nitro") {
    return value;
  }
  throw new Error(`Unknown deploy preset "${value}". Expected "node", "docker", or "nitro".`);
}

async function previewNeedsBuild(outDir: string, buildOptions: BuildOptions): Promise<boolean> {
  if (!(await exists(path.join(outDir, "server", "manifest.mjs")))) {
    return true;
  }

  try {
    const manifest = JSON.parse(await readFile(path.join(outDir, "manifest.json"), "utf8")) as { features?: BuildOptions };
    return manifest.features?.vite !== "build" || manifest.features?.server !== "bundle";
  } catch {
    return true;
  }
}

async function inspectProject(appRoot: string, outDir: string, buildOptions: BuildOptions, json = false): Promise<void> {
  if (await previewNeedsBuild(outDir, buildOptions)) {
    await buildProject(appRoot, outDir, { ...buildOptions, vite: "build" });
  }

  const manifest = JSON.parse(await readFile(path.join(outDir, "manifest.json"), "utf8")) as {
    routes?: Array<{ path: string; file: string }>;
    components?: unknown[];
    layouts?: unknown[];
    plugins?: unknown[];
    middleware?: unknown[];
    serverMiddleware?: unknown[];
    serverHandlers?: Array<{ path: string; file: string }>;
    routeRules?: Record<string, unknown>;
    features?: BuildOptions;
  };
  const routeRules = manifest.routeRules ?? {};

  const summary = {
    appRoot,
    outDir,
    counts: {
      routes: manifest.routes?.length ?? 0,
      components: manifest.components?.length ?? 0,
      layouts: manifest.layouts?.length ?? 0,
      plugins: manifest.plugins?.length ?? 0,
      middleware: manifest.middleware?.length ?? 0,
      serverMiddleware: manifest.serverMiddleware?.length ?? 0,
      serverHandlers: manifest.serverHandlers?.length ?? 0,
      routeRules: Object.keys(routeRules).length
    },
    features: {
      vite: manifest.features?.vite ?? "build",
      server: manifest.features?.server ?? "modules"
    },
    routes: manifest.routes ?? [],
    serverHandlers: manifest.serverHandlers ?? [],
    routeRules,
    diagnostics: createInspectDiagnostics(manifest)
  };

  if (json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Resux app: ${summary.appRoot}`);
  console.log(`Build dir: ${summary.outDir}`);
  console.log(`Routes: ${summary.counts.routes}`);
  console.log(`Components: ${summary.counts.components}`);
  console.log(`Layouts: ${summary.counts.layouts}`);
  console.log(`Plugins: ${summary.counts.plugins}`);
  console.log(`Middleware: ${summary.counts.middleware}`);
  console.log(`Server middleware: ${summary.counts.serverMiddleware}`);
  console.log(`Server handlers: ${summary.counts.serverHandlers}`);
  console.log(`Route rules: ${summary.counts.routeRules}`);
  console.log(`Features: vite=${summary.features.vite}, server=${summary.features.server}`);

  if (summary.diagnostics.length) {
    console.log("\nDiagnostics");
    for (const diagnostic of summary.diagnostics) {
      console.log(`  [${diagnostic.level}] ${diagnostic.message}`);
    }
  }

  if (summary.routes.length) {
    console.log("\nRoutes");
    for (const route of summary.routes) {
      console.log(`  ${route.path} -> ${path.relative(appRoot, route.file)}`);
    }
  }

  if (summary.serverHandlers.length) {
    console.log("\nServer handlers");
    for (const handler of summary.serverHandlers) {
      console.log(`  ${handler.path} -> ${path.relative(appRoot, handler.file)}`);
    }
  }

  if (Object.keys(routeRules).length) {
    console.log("\nRoute rules");
    for (const [routePath, rule] of Object.entries(routeRules)) {
      console.log(`  ${routePath} ${JSON.stringify(rule)}`);
    }
  }
}

function createInspectDiagnostics(manifest: {
  routes?: Array<{ path: string }>;
  serverHandlers?: Array<{ path: string }>;
  routeRules?: Record<string, unknown>;
}): Array<{ level: "info" | "warning"; message: string }> {
  const diagnostics: Array<{ level: "info" | "warning"; message: string }> = [];

  if (!manifest.routes?.length) {
    diagnostics.push({ level: "warning", message: "No pages were discovered. Add .vue files under pages/." });
  }
  if (!manifest.serverHandlers?.length) {
    diagnostics.push({ level: "info", message: "No server handlers were discovered under server/api or server/routes." });
  }
  if (!Object.keys(manifest.routeRules ?? {}).length) {
    diagnostics.push({ level: "info", message: "No route rules are configured." });
  }

  return diagnostics;
}

async function generateDeploymentFiles(appRoot: string, preset: DeployPreset, force: boolean): Promise<void> {
  await assertDirectory(appRoot);

  const files = [
    {
      relativePath: "DEPLOYMENT.md",
      contents: createDeploymentGuide(preset)
    },
    ...(preset === "nitro"
      ? [
          {
            relativePath: "nitro.config.ts",
            contents: createNitroConfig()
          },
          {
            relativePath: ".resux-nitro/handler.ts",
            contents: createNitroHandler()
          }
        ]
      : []),
    ...(preset === "docker"
      ? [
          {
            relativePath: "Dockerfile",
            contents: createDockerfile()
          },
          {
            relativePath: ".dockerignore",
            contents: createDockerignore()
          }
        ]
      : [])
  ];
  const written: string[] = [];

  for (const file of files) {
    written.push(await writeDeploymentFile(appRoot, file.relativePath, file.contents, force));
  }

  console.log(`Generated Resux ${preset} deployment file(s):`);
  for (const file of written) {
    console.log(`  ${file}`);
  }
}

async function assertDirectory(directory: string): Promise<void> {
  const stats = await stat(directory);
  if (!stats.isDirectory()) {
    throw new Error(`${directory} is not a directory.`);
  }
}

async function writeDeploymentFile(appRoot: string, relativePath: string, contents: string, force: boolean): Promise<string> {
  const file = path.join(appRoot, relativePath);

  if (!force && await exists(file)) {
    throw new Error(`${relativePath} already exists. Re-run with --force to overwrite it.`);
  }

  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, contents, "utf8");
  return relativePath;
}

function createDeploymentGuide(preset: DeployPreset): string {
  const dockerSection = preset === "docker"
    ? `
## Docker

\`\`\`sh
docker build -t resux-app .
docker run --rm -p 3000:3000 resux-app
\`\`\`
`
    : "";
  const nitroSection = preset === "nitro"
    ? `
## Nitro

Install the Nitro build dependencies:

\`\`\`sh
npm install -D nitropack h3
\`\`\`

Build Resux first, then build the Nitro server:

\`\`\`sh
npm run build
npx nitro build
node .output/server/index.mjs
\`\`\`

Nitro reads \`NITRO_PRESET\` for provider-specific output. For example:

\`\`\`sh
NITRO_PRESET=vercel npx nitro build
\`\`\`

The generated Nitro handler wraps the Resux Node request handler, so deploy \`.resux\` with the Nitro output unless your platform runs the Nitro build from the project root.
`
    : "";

  return `# Deployment

## Node Server

\`\`\`sh
npm install
npm run build
npm run start
\`\`\`

The production server reads \`PORT\`, so most Node hosts can run the same start command:

\`\`\`sh
PORT=3000 npm run start
\`\`\`

Health checks can call:

\`\`\`txt
/__resux/health
\`\`\`
${dockerSection}
${nitroSection}
## Diagnostics

\`\`\`sh
npm run inspect
npm run inspect -- --json
\`\`\`

Production serving enables Resux default security headers. Disable them only when a host or reverse proxy owns those headers:

\`\`\`sh
resux start . --no-security-headers
\`\`\`
`;
}

function createNitroConfig(): string {
  return `import { defineNitroConfig } from "nitropack/config";

export default defineNitroConfig({
  handlers: [
    {
      route: "/**",
      handler: "./.resux-nitro/handler.ts"
    }
  ],
  routeRules: {
    "/__resux/route": {
      headers: {
        "cache-control": "no-store"
      }
    },
    "/__resux/dev-events": {
      headers: {
        "cache-control": "no-store"
      }
    },
    "/__resux/handlers/**": {
      headers: {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    "/__resux/vue-islands/**": {
      headers: {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    "/__resux/runtime-client.mjs": {
      headers: {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    "/api/**": {
      headers: {
        "cache-control": "no-store"
      }
    },
    "/**": {
      headers: {
        "cache-control": "no-store"
      }
    }
  },
  prerender: {
    crawlLinks: false,
    routes: []
  }
});
`;
}

function createNitroHandler(): string {
  return `import { fromNodeMiddleware } from "h3";
import { createResuxNodeHandler } from "@mahmoud-abdelrahman/resux/node";

export default fromNodeMiddleware(createResuxNodeHandler());
`;
}

function createDockerfile(): string {
  return `FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app /app
EXPOSE 3000
CMD ["npm", "run", "start"]
`;
}

function createDockerignore(): string {
  return `node_modules
.resux
dist
.git
*.log
.env
.env.*
`;
}

async function startViteDevServer(outDir: string): Promise<ViteDevServer> {
  const vite = await createViteServer({
    root: path.join(outDir, "vite-client"),
    configFile: false,
    publicDir: false,
    appType: "custom",
    clearScreen: false,
    logLevel: "warn",
    plugins: [vuePlugin()],
    resolve: {
      alias: {
        "/__resux/runtime-client.mjs": path.join(outDir, "vite-client", "runtime-client.mjs"),
        vue: require.resolve("vue")
      }
    },
    server: {
      middlewareMode: true,
      hmr: false,
      watch: {
        ignored: ["**/.resux/**", "**/node_modules/**"]
      }
    }
  });

  console.log("Vite dev middleware ready for Resux client modules.");
  return vite;
}

function startDevWatcher(vite: ViteDevServer, appRoot: string, outDir: string, buildOptions: BuildOptions): void {
  vite.watcher.add(appRoot);
  vite.watcher.on("all", (_event, changedPath) => {
    if (shouldSkipDevWatch(changedPath, appRoot, outDir)) {
      return;
    }

    devBuildDirty = true;
    void ensureDevBuild(appRoot, outDir, buildOptions, vite)
      .then((rebuilt) => {
        if (rebuilt) {
          notifyDevReloadClients("hmr");
        }
      })
      .catch((error) => {
        console.error(error instanceof Error ? error.stack ?? error.message : error);
      });
  });
}

function shouldSkipDevWatch(changedPath: string, appRoot: string, outDir: string): boolean {
  const resolved = path.resolve(changedPath);
  return resolved.startsWith(path.resolve(outDir))
    || resolved.includes(`${path.sep}node_modules${path.sep}`)
    || resolved.includes(`${path.sep}dist${path.sep}`)
    || !resolved.startsWith(path.resolve(appRoot));
}

async function startServer(options: { appRoot: string; outDir: string; port: number; host?: string; dev: boolean; buildOptions: BuildOptions; vite?: ViteDevServer; securityHeaders: boolean }): Promise<void> {
  const server = createHttpServer((request, response) => {
    void handleRequest(request, response, options);
  });

  const boundPort = await listenOnAvailablePort(server, options.port, options.host);

  if (boundPort !== options.port) {
    console.log(`Port ${options.port} is busy, using ${boundPort} instead.`);
  }

  console.log(`Resux ${options.dev ? "dev" : "preview"} server running at http://${options.host ?? "localhost"}:${boundPort}`);
}

async function listenOnAvailablePort(server: ReturnType<typeof createHttpServer>, requestedPort: number, host?: string): Promise<number> {
  const maxAttempts = 20;

  for (let offset = 0; offset < maxAttempts; offset++) {
    const portToTry = requestedPort + offset;

    try {
      await listen(server, portToTry, host);
      return portToTry;
    } catch (error) {
      if (!isAddressInUse(error) || offset === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error(`No available port found from ${requestedPort} to ${requestedPort + maxAttempts - 1}.`);
}

function listen(server: ReturnType<typeof createHttpServer>, portToTry: number, host?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error & { code?: string }) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(portToTry, host);
  });
}

function isAddressInUse(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EADDRINUSE";
}

function readPort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`PORT must be an integer from 1 to 65535. Received "${value}".`);
  }

  return parsed;
}

function printHelp(): void {
  console.log(`resux ${version}

Usage:
  resux dev [app-root] [options]
  resux init [project-dir] [options]
  resux build [app-root] [options]
  resux preview [app-root] [options]
  resux start [app-root] [options]
  resux inspect [app-root] [options]
  resux deploy [app-root] [options]

Commands:
  init      Scaffold a new Resux app
  dev       Start the Resux dev server with Vite middleware
  build     Build server and client output into .resux
  preview   Serve the built app, rebuilding when needed
  start     Alias for preview, intended for production Node servers
  inspect   Print a build manifest summary for debugging
  deploy    Generate Node, Docker, or Nitro deployment files

Options:
  --security-headers  Enable default production security headers
  --no-security-headers
                      Disable default production security headers
  --json              Print JSON output for inspect
  --preset <preset>   Deployment preset for deploy: node, docker, or nitro
  --force             Overwrite existing deployment files
  -p, --port <port>   Set the server port, default 3000 or PORT
  --host <host>       Set the server host
  -v, --version       Print the Resux version
  -h, --help          Show this help message
`);
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: { appRoot: string; outDir: string; dev: boolean; buildOptions: BuildOptions; vite?: ViteDevServer; securityHeaders: boolean }
): Promise<void> {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");

  try {
    applyDefaultSecurityHeaders(response, options.securityHeaders);

    if (options.dev && options.vite && isViteInternalRequest(requestUrl.pathname)) {
      await serveViteMiddleware(request, response, options.vite);
      return;
    }

    if (options.dev && requestUrl.pathname === "/__resux/dev-events") {
      serveDevEvents(request, response);
      return;
    }

    if (requestUrl.pathname === "/__resux/health") {
      await serveHealthCheck(response, options);
      return;
    }

    if (requestUrl.pathname === "/__resux/route") {
      await serveRoutePayload(response, requestUrl, options);
      return;
    }

    if (requestUrl.pathname.startsWith("/__resux/")) {
      if (activeDevBuild) {
        await activeDevBuild;
      }
      if (options.dev && options.vite && resolveResuxViteAssetUrl(requestUrl.pathname)) {
        await serveViteResuxAsset(response, options.vite, requestUrl.pathname);
        return;
      }
      await serveResuxAsset(response, options.outDir, requestUrl.pathname);
      return;
    }

    if (options.dev) {
      await ensureDevBuild(options.appRoot, options.outDir, options.buildOptions, options.vite);
    }

    const manifest = await importManifest(options.outDir, options.dev);
    const routeRule = matchRouteRule(manifest.routeRules, requestUrl.pathname);
    applyRouteRuleHeaders(response, routeRule);

    if (routeRule?.cors && request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const middlewareHandled = await runServerMiddleware(request, response, requestUrl, manifest);
    if (middlewareHandled) {
      return;
    }

    if (routeRule?.redirect) {
      serveRouteRuleRedirect(response, routeRule.redirect);
      return;
    }

    const serverHandled = await serveServerHandler(request, response, requestUrl, manifest, routeRule);
    if (serverHandled) {
      return;
    }

    const publicHandled = await servePublicFile(response, options.appRoot, requestUrl.pathname);
    if (publicHandled) {
      return;
    }

    const rendered = await renderRoute(requestUrl, options, manifest);

    if (!rendered) {
      await serveErrorDocument(response, options, manifest, 404, "Page not found");
      return;
    }

    if ("type" in rendered && rendered.type === "redirect") {
      response.writeHead(rendered.statusCode, { location: rendered.to });
      response.end();
      return;
    }

    if ("type" in rendered && rendered.type === "abort") {
      response.writeHead(rendered.statusCode, { "content-type": "text/plain; charset=utf-8" });
      response.end(rendered.message);
      return;
    }

    const html = renderDocument(rendered, "Resux App", { devReload: options.dev });

    response.writeHead(routeRule?.statusCode ?? 200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
  } catch (error) {
    if (response.writableEnded) {
      return;
    }
    await serveErrorDocument(response, options, undefined, 500, error);
  }
}

async function serveErrorDocument(
  response: ServerResponse,
  options: { appRoot: string; outDir: string; dev: boolean; buildOptions: BuildOptions; vite?: ViteDevServer; securityHeaders: boolean },
  loadedManifest: any | undefined,
  statusCode: number,
  error: unknown
): Promise<void> {
  const statusMessage = statusCode === 404 ? "Not Found" : "Internal Server Error";
  const errorPayload = createErrorPayload(error, statusCode, statusMessage, options.dev);

  try {
    const manifest = loadedManifest ?? await importManifest(options.outDir, options.dev);
    if (manifest.errorComponent) {
      const rendered = await renderApp({
        app: manifest.app,
        page: manifest.errorComponent,
        pageProps: {
          error: errorPayload
        },
        route: {
          path: statusCode === 404 ? "/404" : "/500",
          params: {},
          query: {}
        },
        components: manifest.components,
        layouts: manifest.layouts,
        modules: manifest.modules,
        vueIslands: manifest.vueIslands,
        runtimeConfig: manifest.runtimeConfig,
        appHead: manifest.appHead,
        plugins: manifest.plugins
      });
      response.writeHead(statusCode, { "content-type": "text/html; charset=utf-8" });
      response.end(renderDocument(rendered, statusMessage, { devReload: options.dev }));
      return;
    }
  } catch {
    // Fall back to plain text below if the error component cannot render.
  }

  response.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
  response.end(createPlainErrorBody(errorPayload, options.dev));
}

async function serveHealthCheck(
  response: ServerResponse,
  options: { appRoot: string; outDir: string; dev: boolean; buildOptions: BuildOptions; vite?: ViteDevServer }
): Promise<void> {
  if (options.dev) {
    await ensureDevBuild(options.appRoot, options.outDir, options.buildOptions, options.vite);
  }

  const manifest = JSON.parse(await readFile(path.join(options.outDir, "manifest.json"), "utf8")) as {
    routes?: unknown[];
    serverMiddleware?: unknown[];
    serverHandlers?: unknown[];
    routeRules?: Record<string, unknown>;
    features?: BuildOptions;
  };
  const body = {
    status: "ok",
    framework: "resux",
    mode: options.dev ? "dev" : "production",
    counts: {
      routes: manifest.routes?.length ?? 0,
      serverMiddleware: manifest.serverMiddleware?.length ?? 0,
      serverHandlers: manifest.serverHandlers?.length ?? 0,
      routeRules: Object.keys(manifest.routeRules ?? {}).length
    },
    features: {
      vite: manifest.features?.vite ?? (options.dev ? "dev" : "build"),
      server: manifest.features?.server ?? (options.dev ? "modules" : "bundle")
    }
  };

  response.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(body));
}

function createErrorPayload(error: unknown, statusCode: number, statusMessage: string, dev: boolean) {
  const message = error instanceof Error ? error.message : String(error);
  const payload: {
    statusCode: number;
    statusMessage: string;
    message: string;
    name?: string;
    stack?: string;
    cause?: unknown;
  } = {
    statusCode,
    statusMessage,
    message
  };

  if (dev && error instanceof Error) {
    payload.name = error.name;
    payload.stack = error.stack;
    if ("cause" in error && error.cause) {
      payload.cause = serializeErrorCause(error.cause);
    }
  }

  return payload;
}

function serializeErrorCause(cause: unknown): unknown {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      stack: cause.stack
    };
  }

  return cause;
}

function createPlainErrorBody(error: { statusCode: number; message: string; stack?: string }, dev: boolean): string {
  if (error.statusCode === 404) {
    return "Not found";
  }

  if (dev && error.stack) {
    return error.stack;
  }

  return error.message;
}

async function serveRoutePayload(
  response: ServerResponse,
  requestUrl: URL,
  options: { appRoot: string; outDir: string; dev: boolean; buildOptions: BuildOptions; vite?: ViteDevServer }
): Promise<void> {
  const targetPath = requestUrl.searchParams.get("path");

  if (!targetPath || !targetPath.startsWith("/")) {
    response.writeHead(400, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Route payload requests need a path query like /__resux/route?path=/post/42." }));
    return;
  }

  const targetUrl = new URL(targetPath, "http://localhost");
  if (options.dev) {
    await ensureDevBuild(options.appRoot, options.outDir, options.buildOptions, options.vite);
  }
  const manifest = await importManifest(options.outDir, options.dev);
  const routeRule = matchRouteRule(manifest.routeRules, targetUrl.pathname);

  if (routeRule?.redirect) {
    const redirect = normalizeRouteRuleRedirect(routeRule.redirect);
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ redirect: redirect.to, statusCode: redirect.statusCode }));
    return;
  }

  const rendered = await renderRoute(targetUrl, options, manifest);

  if (!rendered) {
    response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  if ("type" in rendered && rendered.type === "redirect") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ redirect: rendered.to, statusCode: rendered.statusCode }));
    return;
  }

  if ("type" in rendered && rendered.type === "abort") {
    response.writeHead(rendered.statusCode, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: rendered.message }));
    return;
  }

  response.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(rendered));
}

function applyDefaultSecurityHeaders(response: ServerResponse, enabled: boolean): void {
  if (!enabled) {
    return;
  }

  setHeaderIfUnset(response, "x-content-type-options", "nosniff");
  setHeaderIfUnset(response, "referrer-policy", "strict-origin-when-cross-origin");
  setHeaderIfUnset(response, "x-frame-options", "SAMEORIGIN");
  setHeaderIfUnset(response, "cross-origin-opener-policy", "same-origin");
  setHeaderIfUnset(response, "permissions-policy", "camera=(), microphone=(), geolocation=()");
}

function setHeaderIfUnset(response: ServerResponse, name: string, value: string): void {
  if (!response.hasHeader(name)) {
    response.setHeader(name, value);
  }
}

async function renderRoute(
  requestUrl: URL,
  options: { appRoot: string; outDir: string; dev: boolean; buildOptions: BuildOptions; vite?: ViteDevServer },
  loadedManifest?: any
): Promise<RenderRouteOutcome> {
  if (options.dev && !loadedManifest) {
    await ensureDevBuild(options.appRoot, options.outDir, options.buildOptions, options.vite);
  }

  const manifest = loadedManifest ?? await importManifest(options.outDir, options.dev);
  const matched = manifest.matchRoute(requestUrl.pathname);

  if (!matched) {
    return null;
  }

  const routeContext: RouteContext = {
    path: requestUrl.pathname,
    params: matched.params,
    query: readQuery(requestUrl)
  };
  const middlewareResult = await runRouteMiddleware(manifest, routeContext, matched.route.meta);

  if (middlewareResult) {
    return middlewareResult;
  }

  return renderApp({
    app: manifest.app,
    page: matched.route.component,
    pageMeta: matched.route.meta,
    route: routeContext,
    components: manifest.components,
    layouts: manifest.layouts,
    modules: manifest.modules,
    vueIslands: manifest.vueIslands,
    runtimeConfig: manifest.runtimeConfig,
    appHead: manifest.appHead,
    plugins: manifest.plugins
  });
}

async function runRouteMiddleware(manifest: any, to: RouteContext, pageMeta: any): Promise<RenderRedirect | RenderAbort | null> {
  const from: RouteContext = { path: "", params: {}, query: {} };
  const names = normalizeMiddlewareNames(pageMeta?.middleware);
  const selected = [
    ...manifest.middleware.filter((entry: any) => entry.global),
    ...names.map((name) => manifest.middleware.find((entry: any) => entry.name === name)).filter(Boolean)
  ];

  for (const entry of selected) {
    const result = await entry.handler(to, from) as RouteMiddlewareResult;
    const normalized = normalizeMiddlewareResult(result);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

async function runServerMiddleware(
  request: IncomingMessage,
  response: ServerResponse,
  requestUrl: URL,
  manifest: any
): Promise<boolean> {
  for (const entry of manifest.serverMiddleware ?? []) {
    const result = await entry.handler(createServerEvent(request, response, requestUrl, {}));

    if (response.writableEnded) {
      return true;
    }

    if (result === undefined || result === null) {
      continue;
    }

    await sendServerResult(response, result);
    return true;
  }

  return false;
}

function normalizeMiddlewareNames(value: unknown): string[] {
  if (!value) {
    return [];
  }
  return (Array.isArray(value) ? value : [value]).map((name) => String(name));
}

function normalizeMiddlewareResult(result: RouteMiddlewareResult): RenderRedirect | RenderAbort | null {
  if (!result) {
    return result === false
      ? { type: "abort", statusCode: 403, message: "Navigation aborted" }
      : null;
  }

  if (typeof result === "string") {
    return { type: "redirect", to: result, statusCode: 302 };
  }

  if (result.type === "redirect") {
    return { type: "redirect", to: result.to, statusCode: result.statusCode ?? 302 };
  }

  if (result.type === "abort") {
    return { type: "abort", message: result.message ?? "Navigation aborted", statusCode: result.statusCode ?? 403 };
  }

  return null;
}

function matchRouteRule(routeRules: Record<string, RouteRule> | undefined, pathname: string): RouteRule | null {
  if (!routeRules) {
    return null;
  }

  const matched = Object.entries(routeRules)
    .filter(([pattern]) => routeRuleMatches(pattern, pathname))
    .sort(([left], [right]) => routeRuleScore(right) - routeRuleScore(left))[0];

  return matched?.[1] ?? null;
}

function routeRuleMatches(pattern: string, pathname: string): boolean {
  if (pattern === pathname) {
    return true;
  }

  if (pattern.endsWith("/**")) {
    const prefix = pattern.slice(0, -3);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }

  if (!pattern.includes("*")) {
    return false;
  }

  const source = `^${pattern
    .split("**")
    .map((part) => part.split("*").map(escapeRegExp).join("[^/]*"))
    .join(".*")}$`;
  return new RegExp(source).test(pathname);
}

function routeRuleScore(pattern: string): number {
  return pattern.replace(/\*/g, "").length * 10 - (pattern.match(/\*/g)?.length ?? 0);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyRouteRuleHeaders(response: ServerResponse, rule: RouteRule | null): void {
  for (const [name, value] of Object.entries(rule?.headers ?? {})) {
    response.setHeader(name, value);
  }

  const cacheControl = routeRuleCacheControl(rule?.cache);
  if (cacheControl) {
    response.setHeader("cache-control", cacheControl);
  }

  applyCorsRule(response, rule?.cors);
}

function routeRuleCacheControl(cache: RouteRule["cache"] | undefined): string | null {
  if (cache === undefined) {
    return null;
  }
  if (cache === false) {
    return "no-store";
  }
  if (typeof cache === "string") {
    return cache;
  }

  const parts: string[] = [];
  if (Number.isFinite(cache.maxAge)) {
    parts.push(`public, max-age=${Math.floor(cache.maxAge!)}`);
  }
  if (Number.isFinite(cache.swr)) {
    parts.push(`stale-while-revalidate=${Math.floor(cache.swr!)}`);
  }
  return parts.join(", ") || null;
}

function applyCorsRule(response: ServerResponse, cors: RouteRule["cors"] | undefined): void {
  if (!cors) {
    return;
  }

  const config = cors === true ? {} : cors;
  response.setHeader("access-control-allow-origin", config.origin ?? "*");
  response.setHeader("access-control-allow-methods", (config.methods ?? ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]).join(", "));
  response.setHeader("access-control-allow-headers", (config.headers ?? ["content-type", "authorization"]).join(", "));
  if (config.credentials) {
    response.setHeader("access-control-allow-credentials", "true");
  }
}

function serveRouteRuleRedirect(response: ServerResponse, redirect: RouteRule["redirect"]): void {
  const normalized = normalizeRouteRuleRedirect(redirect);
  response.writeHead(normalized.statusCode, { location: normalized.to });
  response.end();
}

function normalizeRouteRuleRedirect(redirect: RouteRule["redirect"]): { to: string; statusCode: number } {
  if (typeof redirect === "string") {
    return { to: redirect, statusCode: 307 };
  }

  return {
    to: redirect?.to ?? "/",
    statusCode: redirect?.statusCode ?? 307
  };
}

async function serveServerHandler(
  request: IncomingMessage,
  response: ServerResponse,
  requestUrl: URL,
  manifest: any,
  routeRule: RouteRule | null
): Promise<boolean> {
  const matched = manifest.matchServerHandler?.(requestUrl.pathname);
  if (!matched) {
    return false;
  }

  const result = await matched.route.handler(createServerEvent(request, response, requestUrl, matched.params));

  if (response.writableEnded) {
    return true;
  }

  await sendServerResult(response, result, routeRule?.statusCode ?? 200);
  return true;
}

function createServerEvent(
  request: IncomingMessage,
  response: ServerResponse,
  requestUrl: URL,
  params: Record<string, string>
) {
  return {
    path: requestUrl.pathname,
    method: request.method ?? "GET",
    query: readQuery(requestUrl),
    params,
    node: {
      req: request,
      res: response
    }
  };
}

async function sendServerResult(response: ServerResponse, result: unknown, statusCode = 200): Promise<void> {
  if (result instanceof Response) {
    const headers: Record<string, string> = {};
    result.headers.forEach((value, key) => {
      headers[key] = value;
    });
    response.writeHead(result.status, headers);
    response.end(Buffer.from(await result.arrayBuffer()));
    return;
  }

  if (result === false) {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  if (isServerRedirectResult(result)) {
    response.writeHead(result.statusCode ?? 302, { location: result.to });
    response.end();
    return;
  }

  if (isServerAbortResult(result)) {
    response.writeHead(result.statusCode ?? 403, { "content-type": "text/plain; charset=utf-8" });
    response.end(result.message ?? "Request aborted");
    return;
  }

  if (typeof result === "string") {
    response.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
    response.end(result);
    return;
  }

  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(result ?? null));
}

function isServerRedirectResult(value: unknown): value is { type: "redirect"; to: string; statusCode?: number } {
  return Boolean(value && typeof value === "object" && (value as { type?: unknown }).type === "redirect" && typeof (value as { to?: unknown }).to === "string");
}

function isServerAbortResult(value: unknown): value is { type: "abort"; message?: string; statusCode?: number } {
  return Boolean(value && typeof value === "object" && (value as { type?: unknown }).type === "abort");
}

async function servePublicFile(response: ServerResponse, appRoot: string, pathname: string): Promise<boolean> {
  const publicRoot = path.resolve(appRoot, "public");
  const resolved = path.resolve(publicRoot, `.${decodeURIComponent(pathname)}`);

  if (!resolved.startsWith(publicRoot)) {
    return false;
  }

  if (!(await exists(resolved))) {
    return false;
  }

  const fileStats = await stat(resolved);
  if (!fileStats.isFile()) {
    return false;
  }

  response.writeHead(200, {
    "content-type": mimeType(resolved),
    ...(!response.hasHeader("cache-control") ? { "cache-control": "no-store" } : {})
  });
  response.end(await readFile(resolved));
  return true;
}

function mimeType(file: string): string {
  const ext = path.extname(file).toLowerCase();
  const types: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon"
  };
  return types[ext] ?? "application/octet-stream";
}

async function ensureDevBuild(appRoot: string, outDir: string, buildOptions: BuildOptions, vite?: ViteDevServer): Promise<boolean> {
  const startedAtRevision = devBuildRevision;

  while (devBuildDirty || activeDevBuild) {
    if (!activeDevBuild) {
      devBuildDirty = false;
      activeDevBuild = buildProject(appRoot, outDir, { ...buildOptions, vite: "dev" })
        .then(() => {
          devBuildRevision++;
          vite?.moduleGraph.invalidateAll();
        })
        .finally(() => {
          activeDevBuild = null;
        });
    }

    await activeDevBuild;
  }

  return devBuildRevision !== startedAtRevision;
}

function serveDevEvents(request: IncomingMessage, response: ServerResponse): void {
  response.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store, no-transform",
    connection: "keep-alive"
  });
  response.write("retry: 1000\n\n");
  devReloadClients.add(response);

  request.on("close", () => {
    devReloadClients.delete(response);
  });
}

function notifyDevReloadClients(eventName: "hmr" | "reload" = "hmr"): void {
  devReloadRevision++;
  const payload = JSON.stringify({ revision: devReloadRevision });

  for (const client of [...devReloadClients]) {
    if (client.destroyed || client.writableEnded) {
      devReloadClients.delete(client);
      continue;
    }

    try {
      client.write(`event: ${eventName}\ndata: ${payload}\n\n`);
    } catch {
      devReloadClients.delete(client);
    }
  }
}

async function serveViteResuxAsset(response: ServerResponse, vite: ViteDevServer, pathname: string): Promise<void> {
  const viteUrl = resolveResuxViteAssetUrl(pathname);

  if (!viteUrl) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const transformed = await vite.transformRequest(viteUrl);

  if (!transformed) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": "text/javascript; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(transformed.code);
}

async function serveViteMiddleware(request: IncomingMessage, response: ServerResponse, vite: ViteDevServer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    response.once("finish", finish);
    vite.middlewares(request, response, (error?: unknown) => {
      response.off("finish", finish);

      if (settled) {
        return;
      }

      settled = true;

      if (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }

      if (!response.writableEnded) {
        response.writeHead(404);
        response.end("Not found");
      }

      resolve();
    });
  });
}

async function serveResuxAsset(response: ServerResponse, outDir: string, pathname: string): Promise<void> {
  const relative = resolveResuxAssetPath(pathname);

  if (!relative) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const resolved = path.resolve(outDir, relative);
  const allowedRoot = path.resolve(outDir, "client");

  if (!resolved.startsWith(allowedRoot)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (!(await exists(resolved))) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": mimeType(resolved),
    "cache-control": "no-store"
  });
  response.end(await readFile(resolved, "utf8"));
}

function resolveResuxAssetPath(pathname: string): string | null {
  if (pathname === "/__resux/runtime-client.mjs") {
    return "client/runtime-client.mjs";
  }

  if (pathname.startsWith("/__resux/handlers/")) {
    return pathname.replace(/^\/__resux\/handlers\//, "client/handlers/");
  }

  if (pathname.startsWith("/__resux/vue-islands/")) {
    return pathname.replace(/^\/__resux\/vue-islands\//, "client/vue-islands/");
  }

  return null;
}

function resolveResuxViteAssetUrl(pathname: string): string | null {
  if (pathname === "/__resux/runtime-client.mjs") {
    return "/runtime-client.mjs";
  }

  if (pathname.startsWith("/__resux/handlers/")) {
    return pathname.replace(/^\/__resux\/handlers\//, "/handlers/");
  }

  if (pathname.startsWith("/__resux/vue-islands/")) {
    return pathname.replace(/^\/__resux\/vue-islands\//, "/vue-islands/");
  }

  return null;
}

function isViteInternalRequest(pathname: string): boolean {
  return pathname === "/runtime-client.mjs"
    || pathname.startsWith("/@")
    || pathname.startsWith("/node_modules/.vite/");
}

async function importManifest(outDir: string, dev = false): Promise<any> {
  const file = !dev && await exists(path.join(outDir, "server-bundle", "index.mjs"))
    ? path.join(outDir, "server-bundle", "index.mjs")
    : path.join(outDir, "server", "manifest.mjs");
  const stats = await stat(file);
  return import(`${pathToFileURL(file).href}?t=${stats.mtimeMs}`);
}

function readQuery(url: URL): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};

  for (const [key, value] of url.searchParams) {
    const existing = query[key];
    if (Array.isArray(existing)) {
      existing.push(value);
    } else if (existing !== undefined) {
      query[key] = [existing, value];
    } else {
      query[key] = value;
    }
  }

  return query;
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}
