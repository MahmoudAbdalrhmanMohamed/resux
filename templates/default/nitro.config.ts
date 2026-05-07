import { defineNitroConfig } from "nitropack/config";

export default defineNitroConfig({
  compatibilityDate: "2026-05-02",
  // Resux uses top-level /plugins, /modules, and /middleware for app features.
  // Nitro auto-scans these folders too, so exclude them from Nitro scanning.
  ignore: ["plugins/**", "modules/**", "middleware/**"],
  // Keep Nitro discovery scoped to the generated adapter directory.
  scanDirs: [".resux-nitro"],
  publicAssets: [
    {
      dir: "public",
      baseURL: "/"
    }
  ],
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
