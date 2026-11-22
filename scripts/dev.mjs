import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const vite = require.resolve("vite/bin/vite.js");

function watch(args) {
  const child = spawn(
    process.execPath,
    [vite, "build", "--watch", "--mode", "development", ...args],
    {
      stdio: "inherit",
    },
  );
  child.on("exit", (code) => {
    if (code && code !== 0) process.exit(code);
  });
  return child;
}

const app = watch([]);
const content = watch(["--config", "vite.content.config.ts"]);

function stop() {
  app.kill();
  content.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
