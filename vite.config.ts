/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createApiApp } from "./server/app.ts";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "crm-api",
      configureServer(server) {
        server.middlewares.use("/api", createApiApp());
      },
    },
  ],
  server: {
    host: true,
    port: 4321,
  },
  build: {
    outDir: "dist",
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});