import type {
  RequestHeadersPluginContext,
  ResponseHeadersPluginContext,
} from "@orpc/server/plugins"

import { createAuth } from "@/lib/auth"
import { createDb } from "@/db"

export type ORPCContext = RequestHeadersPluginContext &
  ResponseHeadersPluginContext & {
    db: ReturnType<typeof createDb>
    auth: ReturnType<typeof createAuth>
  }

export function createORPCContext(): ORPCContext {
  return {
    db: createDb(),
    auth: createAuth(),
  }
}
