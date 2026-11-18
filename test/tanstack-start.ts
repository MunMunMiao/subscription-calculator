type LinkFactory = () => unknown

type ServerLink = {
  codec?: {
    baseUrl?: unknown
    headers?: unknown
  }
}

export const isomorphicServerCall = {
  url: undefined as URL | undefined,
  headers: undefined as Headers | undefined,
}

export function createServerFn() {
  return {
    handler<T>(fn: T) {
      return fn
    },
  }
}

export function createIsomorphicFn() {
  const impls: { client?: LinkFactory; server?: LinkFactory } = {}
  function run() {
    const link = impls.server?.() as ServerLink | undefined
    const baseUrl = link?.codec?.baseUrl
    const headers = link?.codec?.headers
    if (typeof baseUrl === "function") isomorphicServerCall.url = baseUrl()
    if (typeof headers === "function") isomorphicServerCall.headers = headers()
    return impls.client?.()
  }
  run.client = (fn: LinkFactory) => {
    impls.client = fn
    return run
  }
  run.server = (fn: LinkFactory) => {
    impls.server = fn
    return run
  }
  return run
}
