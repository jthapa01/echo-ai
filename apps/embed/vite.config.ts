import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "src/embed.ts"),
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
    server: {
        port: 3002,
        open: "/demo.html",
    }
});