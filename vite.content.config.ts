import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * The extractor is injected with chrome.scripting.executeScript({ files }).
 * That API cannot load an ES module, so this build is a single IIFE.
 * It runs after the main build and must not empty dist/.
 */
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    target: "chrome120",
    lib: {
      entry: resolve("src/content/extractor.ts"),
      name: "JobClipperExtractor",
      formats: ["iife"],
      fileName: () => "extractor.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        extend: true,
      },
    },
  },
});
