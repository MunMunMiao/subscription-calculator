export function getRequestHeaders() {
  return new Headers({ cookie: "session=1" })
}

export function getRequest() {
  return new Request("https://techo.test/desk")
}
