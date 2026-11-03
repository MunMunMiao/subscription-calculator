import { createFileRoute } from "@tanstack/react-router"

import { createAuth } from "@/lib/auth"

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => {
        return createAuth().handler(request)
      },
      POST: ({ request }: { request: Request }) => {
        return createAuth().handler(request)
      },
    },
  },
})
