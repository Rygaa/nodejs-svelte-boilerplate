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
      "@": resolve(__dirname, "./src"),
      "@backend": resolve(__dirname, "../backend/src"),
    },
  },
});
