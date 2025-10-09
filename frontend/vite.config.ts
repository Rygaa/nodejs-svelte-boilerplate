import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5174, // Different port from React frontend
  },
  resolve: {
    alias: {
      shared: resolve(__dirname, "../shared/src"),
      "@": resolve(__dirname, "./src"),
    },
  },
});
