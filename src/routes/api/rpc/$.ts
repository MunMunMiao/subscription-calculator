import { RPCHandler } from "@orpc/server/fetch"
import {
  RequestHeadersPlugin,
  ResponseHeadersPlugin,
} from "@orpc/server/plugins"
import { createFileRoute } from "@tanstack/react-router"

import { createORPCContext } from "@/orpc/context"
import { router } from "@/orpc/router"

const handler = new RPCHandler(router, {
  plugins: [new RequestHeadersPlugin(), new ResponseHeadersPlugin()],
})

async function handle({ request }: { request: Request }) {
  const { response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context: createORPCContext(),
  })

  return response ?? new Response("Not found", { status: 404 })
}

export const Route = createFileRoute("/api/rpc/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
})
