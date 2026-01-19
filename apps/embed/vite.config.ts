import { defineConfig } from "vite";
import { resolve } from "path";
import { copyFileSync } from "fs";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "embed.ts"),
      name: "EchoWidget",
      fileName: "echo-widget",
      formats: ["iife"], // immediately invoke function expression
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
  plugins: [
    {
      name: "copy-landing",
      closeBundle() {
        copyFileSync(
          resolve(__dirname, "landing.html"),
          resolve(__dirname, "dist/index.html")
        );
      },
    },
  ],
  server: {
    port: 3002,
    open: "/demo.html",
  },
});
