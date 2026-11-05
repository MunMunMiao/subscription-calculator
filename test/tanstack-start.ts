type LinkFactory = () => unknown

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
    impls.server?.()
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
