import { env } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/d1"

import { schema } from "./schema"

export function createDb() {
  return drizzle(env.DB, { schema })
}

export type Db = ReturnType<typeof createDb>
