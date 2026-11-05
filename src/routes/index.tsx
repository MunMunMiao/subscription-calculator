import { createFileRoute } from "@tanstack/react-router"

import { DeskApp } from "@/components/desk-app"
import { e2ePreviewUser } from "@/lib/e2e-preview"

type IndexSearch = {
  e2e?: "browse" | "desk"
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    e2e:
      search.e2e === "browse" || search.e2e === "desk" ? search.e2e : undefined,
  }),
  component: Home,
})

function Home() {
  const { session } = Route.useRouteContext()
  const { e2e } = Route.useSearch()
  return <DeskApp user={session?.user ?? e2ePreviewUser(e2e)} />
}
