import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const zipPath = join(root, "release/job-clipper-1.0.0.zip");

function fail(message) {
  console.error(message);
  process.exit(1);
}

execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });

if (!existsSync(join(dist, "manifest.json")))
  fail("dist/manifest.json is missing after the build.");

const manifest = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8"));
if (manifest.manifest_version !== 3) fail("Packaged manifest is not Manifest V3.");
if (manifest.version !== "1.0.0")
  fail(`Packaged manifest version is ${manifest.version}, expected 1.0.0.`);
if (manifest.background?.service_worker !== "background.js") {
  fail("Packaged manifest does not point the service worker at background.js.");
}

const required = [
  "manifest.json",
  "background.js",
  "extractor.js",
  "popup.html",
  "dashboard.html",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
];
for (const file of required) {
  if (!existsSync(join(dist, file))) fail(`Required package file is missing: ${file}`);
}

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

const packaged = walk(dist).map((file) => relative(dist, file));
const forbidden = packaged.filter(
  (file) =>
    file.endsWith(".map") ||
    file.endsWith(".ts") ||
    file.endsWith(".tsx") ||
    file.includes("node_modules") ||
    file.startsWith("src/") ||
    file.startsWith("tests/"),
);
if (forbidden.length > 0)
  fail(`Package contains files that should not ship:\n${forbidden.join("\n")}`);

for (const file of packaged.filter((name) => name.endsWith(".html"))) {
  const html = readFileSync(join(dist, file), "utf8");
  if (/<(?:script|link)\b[^>]*(?:src|href)=["']https?:/i.test(html)) {
    fail(`${file} loads a remote script or stylesheet.`);
  }
  if (/<script(?![^>]*\bsrc=)/i.test(html)) fail(`${file} contains an inline script.`);
}

mkdirSync(join(root, "release"), { recursive: true });
rmSync(zipPath, { force: true });
execFileSync("zip", ["-r", "-X", zipPath, ".", "-x", "*.DS_Store"], {
  cwd: dist,
  stdio: "inherit",
});

const listing = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" });
const names = listing.split("\n").filter(Boolean);
if (!names.includes("manifest.json"))
  fail("ZIP does not contain manifest.json at the archive root.");
if (names.some((name) => name.startsWith("dist/") || name.startsWith("src/"))) {
  fail("ZIP is nested or contains source files.");
}
for (const file of required) {
  if (!names.includes(file)) fail(`ZIP is missing ${file}`);
}

const bytes = statSync(zipPath).size;
console.log("");
console.log(`Wrote ${relative(root, zipPath)} (${bytes} bytes, ${names.length} files).`);
