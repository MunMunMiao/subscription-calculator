import { env } from "cloudflare:workers"
import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"

import { createAuth } from "./auth"

function isHandFeelPreview() {
  try {
    return (env as { TECHO_PREVIEW?: string }).TECHO_PREVIEW === "1"
  } catch {
    return false
  }
}

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    if (isHandFeelPreview()) return null
    const auth = createAuth()
    return auth.api.getSession({
      headers: getRequestHeaders(),
    })
  }
)

export async function readSession() {
  return getSession()
}
