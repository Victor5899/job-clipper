import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome120",
    // MV3 extension pages forbid inline scripts; Chrome 120+ supports modulepreload natively.
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        popup: fromRoot("./popup.html"),
        dashboard: fromRoot("./dashboard.html"),
        background: fromRoot("./src/background/index.ts"),
      },
      output: {
        // The manifest references the service worker by a fixed file name.
        entryFileNames: (chunk) =>
          chunk.name === "background" ? "background.js" : "assets/[name]-[hash].js",
        chunkFileNames: "assets/shared-[hash].js",
        assetFileNames: (asset) =>
          asset.names.some((name) => name.endsWith(".css"))
            ? "assets/styles-[hash][extname]"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
});
