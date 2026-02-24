import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["grapesjs"],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "^/api/": {
        target: process.env.API_TARGET || "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
})
