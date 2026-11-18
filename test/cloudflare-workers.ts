const bag: Record<string, unknown> = {}
let explode = false

export function setWorkerEnv(next: Record<string, unknown>) {
  for (const key of Object.keys(bag)) delete bag[key]
  Object.assign(bag, next)
}

export function setWorkerEnvThrows(value: boolean) {
  explode = value
}

export const env: Record<string, unknown> = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined
      if (explode) throw new Error("cloudflare env unavailable")
      return bag[prop]
    },
  }
)
