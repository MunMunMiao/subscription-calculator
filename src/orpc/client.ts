import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import type { RouterClient } from "@orpc/server"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"
import { createIsomorphicFn } from "@tanstack/react-start"
import { getRequest, getRequestHeaders } from "@tanstack/react-start/server"

import type { AppRouter } from "./router"

const getLink = createIsomorphicFn()
  .client(
    () =>
      new RPCLink({
        url: "/api/rpc",
      })
  )
  .server(
    () =>
      new RPCLink({
        url: () => new URL("/api/rpc", getRequest().url),
        headers: () => getRequestHeaders(),
      })
  )

export const client: RouterClient<AppRouter> = createORPCClient(getLink())
export const orpc = createTanstackQueryUtils(client)
