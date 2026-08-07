import path from "node:path";
import { pathToFileURL } from "node:url";
import { Window } from "happy-dom";

process.env.RESUX_HALAL_REVIEW_SIGNING_SECRET =
  "resux-test-review-signing-secret-32-characters-minimum";

const emptyClientEnhancementManifestUrl = pathToFileURL(
  path.resolve(import.meta.dirname, "fixtures/empty-client-enhancements.mjs"),
).href;

Object.defineProperty(Window.prototype, "__RESUX_CLIENT_ENHANCEMENTS_SRC__", {
  configurable: true,
  writable: true,
  value: emptyClientEnhancementManifestUrl,
});
