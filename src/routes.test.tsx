import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { describe, expect, test, vi } from "vitest"
import { render } from "vitest-browser-react"

import { AppProviders } from "@/components/providers"
import { Route as AuthRoute } from "@/routes/api/auth/$"
import { Route as RpcRoute } from "@/routes/api/rpc/$"
import { Route as AppRoute } from "@/routes/app"
import { Route as IndexRoute } from "@/routes/index"
import { Route as LoginRoute } from "@/routes/login"
import { Route as RootRoute, uiFlags } from "@/routes/__root"
import { Route as SubsRoute } from "@/routes/subscriptions"
import { routeTree } from "@/routeTree.gen"
import { setWorkerEnv } from "../test/cloudflare-workers"

const sessionBox = vi.hoisted(() => ({
  current: null as { user: { name: string; email: string } } | null,
}))

vi.mock("@/lib/session", () => ({
  getSession: async () => sessionBox.current,
}))

vi.mock("@tanstack/react-devtools", () => ({
  TanStackDevtools: () => <div data-testid="devtools">devtools</div>,
}))

vi.mock("@tanstack/react-router-devtools", () => ({
  TanStackRouterDevtoolsPanel: () => <div>panel</div>,
}))

type LooseHandlers = {
  GET?: (args: { request: Request }) => Promise<Response>
  POST?: (args: { request: Request }) => Promise<Response>
}

type LooseRoute = {
  options: {
    validateSearch?: (search: Record<string, unknown>) => { e2e?: string }
    head?: (ctx: unknown) => { meta?: Array<{ title?: string }> }
    beforeLoad?: () => void
    component?: () => null
    server?: { handlers?: LooseHandlers }
  }
}

function loose(route: object) {
  return route as unknown as LooseRoute
}

async function mount(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  return render(<RouterProvider router={router} />)
}

describe("routes", () => {
  test("search, redirects, documents, and api handlers", async () => {
    const index = loose(IndexRoute)
    expect(index.options.validateSearch?.({ e2e: "browse" })).toEqual({
      e2e: "browse",
    })
    expect(index.options.validateSearch?.({ e2e: "desk" })).toEqual({
      e2e: "desk",
    })
    expect(index.options.validateSearch?.({ e2e: "nope" })).toEqual({
      e2e: undefined,
    })
    expect(index.options.validateSearch?.({})).toEqual({ e2e: undefined })

    const head = loose(RootRoute).options.head?.({})
    expect(head?.meta?.some((item) => item.title === "手帐")).toBe(true)

    for (const route of [AppRoute, LoginRoute, SubsRoute]) {
      const page = loose(route)
      expect(() => page.options.beforeLoad?.()).toThrow()
      expect(page.options.component?.()).toBeNull()
    }

    setWorkerEnv({
      DB: {},
      BETTER_AUTH_URL: "https://techo.test",
      BETTER_AUTH_SECRET: "secret-secret-secret-secret",
      GITHUB_CLIENT_ID: "id",
      GITHUB_CLIENT_SECRET: "sec",
      TECHO_PREVIEW: "0",
    })
    const authHandlers = loose(AuthRoute).options.server?.handlers
    const getAuth = await authHandlers?.GET?.({
      request: new Request("https://techo.test/api/auth/ok"),
    })
    const postAuth = await authHandlers?.POST?.({
      request: new Request("https://techo.test/api/auth/ok", {
        method: "POST",
      }),
    })
    expect(getAuth).toBeInstanceOf(Response)
    expect(postAuth).toBeInstanceOf(Response)

    const rpc = loose(RpcRoute).options.server?.handlers
    const missing = await rpc?.GET?.({
      request: new Request("https://techo.test/not-rpc"),
    })
    const health = await rpc?.POST?.({
      request: new Request("https://techo.test/api/rpc/health", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: null }),
      }),
    })
    expect(missing?.status).toBe(404)
    expect(health).toBeInstanceOf(Response)
    expect(health?.status).not.toBe(404)

    sessionBox.current = { user: { name: "Ada", email: "ada@techo.test" } }
    uiFlags.devtools = false
    const signedIn = await mount("/")
    expect(document.querySelector("[data-testid='devtools']")).toBeNull()
    expect(document.querySelector("[data-testid='desk-root']")).toBeTruthy()
    await signedIn.unmount()

    sessionBox.current = null
    uiFlags.devtools = true
    const preview = await mount("/?e2e=browse")
    expect(document.querySelector("[data-testid='devtools']")).toBeTruthy()
    expect(document.querySelector("[data-testid='desk-root']")).toBeTruthy()
    await preview.unmount()

    const missingPage = await mount("/missing-page")
    expect(document.body.textContent).toContain("页面不存在")
    await missingPage.unmount()

    const providers = await render(
      <AppProviders>
        <p>provider-child</p>
      </AppProviders>
    )
    expect(providers.container.textContent).toContain("provider-child")
    await providers.unmount()
    uiFlags.devtools = false
  })
})
