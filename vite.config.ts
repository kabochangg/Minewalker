import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Minewalker",
        short_name: "Minewalker",
        description: "A vertical minesweeper mining PWA game.",
        theme_color: "#1c130c",
        background_color: "#0b0f12",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"]
      }
    })
  ],
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts", "tests/unit/**/*.test.ts"]
  },
  server: {
    host: "127.0.0.1"
  },
  build: {
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"]
        }
      }
    }
  }
});
