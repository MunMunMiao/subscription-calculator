import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"

import { createAuth } from "./auth"

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const auth = createAuth()
    return auth.api.getSession({
      headers: getRequestHeaders(),
    })
  }
)
