import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const passes = [];

function pass(name) {
  passes.push(name);
}

function fail(name, detail) {
  failures.push(`${name}: ${detail}`);
}

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

const manifest = JSON.parse(readFileSync(join(root, "public/manifest.json"), "utf8"));
const expectedPermissions = ["storage", "alarms", "notifications", "activeTab", "scripting"];

if (manifest.manifest_version !== 3) fail("manifest version", "expected Manifest V3");
else pass("Manifest V3");

if (JSON.stringify(manifest.permissions) !== JSON.stringify(expectedPermissions)) {
  fail("permissions", `expected ${expectedPermissions.join(", ")}`);
} else pass("permissions are storage, alarms, notifications, activeTab, and scripting");

for (const key of [
  "host_permissions",
  "optional_host_permissions",
  "content_scripts",
  "externally_connectable",
]) {
  if (key in manifest) fail(key, "is present");
  else pass(`no ${key}`);
}

const policy = manifest.content_security_policy?.extension_pages ?? "";
if (policy !== "script-src 'self'; object-src 'self'") {
  fail("content security policy", policy || "missing");
} else pass("extension page CSP is script-src 'self'");

if (/unsafe-eval|unsafe-inline/.test(policy)) fail("CSP keywords", policy);
else pass("CSP does not allow unsafe-eval or unsafe-inline");

const forbidden = [
  ["innerHTML or outerHTML", /\b(?:innerHTML|outerHTML)\b/],
  ["insertAdjacentHTML", /\binsertAdjacentHTML\b/],
  ["document.write", /\bdocument\.write\b/],
  ["dangerouslySetInnerHTML", /\bdangerouslySetInnerHTML\b/],
  ["eval", /\beval\s*\(/],
  ["new Function", /\bnew\s+Function\s*\(/],
  ["fetch", /\bfetch\s*\(/],
  ["XMLHttpRequest", /\bXMLHttpRequest\b/],
  ["sendBeacon", /\bsendBeacon\b/],
  ["WebSocket", /\bWebSocket\b/],
];

const sources = walk(join(root, "src")).filter(
  (file) => /\.(ts|tsx)$/.test(file) && !/\.test\.tsx?$/.test(file),
);

for (const [name, pattern] of forbidden) {
  const hits = [];
  for (const file of sources) {
    const text = readFileSync(file, "utf8");
    if (pattern.test(text)) hits.push(relative(root, file));
  }
  if (hits.length > 0) fail(name, hits.join(", "));
  else pass(`no ${name} in src`);
}

console.log("Job Clipper security audit");
for (const name of passes) console.log(`pass  ${name}`);
if (failures.length > 0) {
  console.error("");
  for (const item of failures) console.error(`fail  ${item}`);
  process.exit(1);
}
console.log("");
console.log(`${passes.length} passed, 0 failed`);
