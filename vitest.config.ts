import path from "node:path"
import { fileURLToPath } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": path.join(root, "src"),
      "cloudflare:workers": path.join(root, "test/cloudflare-workers.ts"),
      "@tanstack/react-start/server": path.join(
        root,
        "test/tanstack-start-server.ts"
      ),
      "@tanstack/react-start": path.join(root, "test/tanstack-start.ts"),
      "better-auth/tanstack-start": path.join(
        root,
        "test/better-auth-tanstack.ts"
      ),
    },
  },
  plugins: [tailwindcss(), react()],
  optimizeDeps: {
    include: [
      "vitest-browser-react",
      "@tanstack/react-query",
      "@tanstack/react-router",
      "gsap",
      "@gsap/react",
      "gsap/DrawSVGPlugin",
      "sonner",
      "next-themes",
      "better-auth/react",
      "@orpc/server",
      "@orpc/client",
      "@orpc/tanstack-query",
    ],
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    fileParallelism: false,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
      viewport: { width: 1280, height: 800 },
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/**/*.d.ts",
        "src/routeTree.gen.ts",
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
})
