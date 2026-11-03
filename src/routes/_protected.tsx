import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { SiteHeader } from "@/components/site-header"

export const Route = createFileRoute("/_protected")({
  beforeLoad: ({ context, location }) => {
    if (!context.session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      })
    }
    return { session: context.session }
  },
  component: ProtectedLayout,
})

function ProtectedLayout() {
  const { session } = Route.useRouteContext()

  return (
    <div className="min-h-svh">
      <SiteHeader user={session.user} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
