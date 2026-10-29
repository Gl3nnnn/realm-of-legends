import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const root = fileURLToPath(new URL(".", import.meta.url));
const base = (process.env.VITE_BASE_PATH || "/").replace(/\/*$/, "/");

export default defineConfig({
  root,
  base,
  publicDir: "public",
  resolve: {
    alias: {
      "@realm/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        // Keep the engine and the game rules in their own files. They change far
        // less often than the UI code, so a game update only re-downloads the app.
        manualChunks(id: string) {
          if (id.includes("node_modules/phaser")) return "phaser";
          if (id.includes("node_modules/idb")) return "vendor";
          if (id.includes("core/src/")) return "realm-core";
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    fs: {
      allow: [fileURLToPath(new URL("..", import.meta.url))],
    },
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "assets/icons/icon-192.png", "assets/icons/icon-512.png"],
      manifest: {
        name: "Realm of Legends",
        short_name: "Realm",
        description: "An offline-first pixel-art action RPG set in Eldoria.",
        theme_color: "#1a1420",
        background_color: "#1a1420",
        display: "standalone",
        orientation: "landscape",
        start_url: ".",
        scope: ".",
        icons: [
          { src: "assets/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "assets/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "assets/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,json,woff2,svg}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html"
      },
      devOptions: { enabled: false }
    })
  ]
});
