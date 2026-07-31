import { readFile, writeFile } from "node:fs/promises";

const file = "README.md";
let source = await readFile(file, "utf8");

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Could not uniquely locate ${label}.`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

replaceOnce(
  "icon module example",
  `      mode: "svg",
      collections: ["material-symbols", "mdi", "mingcute", "cib", "uil", "line-md", "solar", "ph"],`,
  `      mode: "svg",
      apiProvider: "https://api.iconify.design",
      collections: ["material-symbols", "mdi", "mingcute", "cib", "uil", "line-md", "solar", "ph"],`,
);

replaceOnce(
  "development heading",
  `## Development
`,
  `## Halal Core integrity keys

Local reports use a deterministic \`sha256:\` checksum when no key is configured. Production server and deployment guards require authenticated HMAC reports. Configure private keys with at least 32 characters before building production artifacts:

\`\`\`sh
export RESUX_HALAL_REPORT_SIGNING_SECRET="replace-with-a-private-random-secret"
export RESUX_HALAL_REVIEW_SIGNING_SECRET="replace-with-a-different-private-random-secret"
\`\`\`

Do not commit these values. The report key signs the complete generated report; the review key authenticates human review approval files. Optional remote AI classification also requires an HTTPS endpoint (localhost HTTP is allowed for development) and supports \`RESUX_AI_TIMEOUT_MS\`.

## Development
`,
);

replaceOnce(
  "release authentication description",
  `The npm publish workflow validates that the tag matches \`package.json\`, runs \`npm ci\` and \`npm run pack:check\`, skips publishing if the package version already exists, then publishes with \`NPM_TOKEN\` and npm provenance.`,
  `The npm publish workflow validates that the tag matches \`package.json\`, installs only the locked dependency graph, runs typecheck, build, tests, and package checks, skips versions that already exist, then publishes through npm Trusted Publishing (GitHub OIDC) with provenance. Configure the npm Trusted Publisher for repository \`MahmoudAbdalrhmanMohamed/resux\` and workflow \`npm-publish.yml\`; no long-lived \`NPM_TOKEN\` is used.`,
);

await writeFile(file, source, "utf8");
