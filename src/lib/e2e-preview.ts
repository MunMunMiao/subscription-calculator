export const E2E_PREVIEW_USER = {
  name: "MunMunMiao",
  email: "e2e@local",
} as const

export function allowE2ePreview() {
  const env = import.meta.env as { DEV?: boolean; VITE_TECHO_E2E?: string }
  return env.DEV === true || env.VITE_TECHO_E2E === "1"
}

export function e2ePreviewUser(e2e: string | undefined) {
  if (!allowE2ePreview() || e2e !== "browse") return null
  return {
    name: E2E_PREVIEW_USER.name,
    email: E2E_PREVIEW_USER.email,
  }
}

export function isE2ePreviewUser(user: { email?: string } | null | undefined) {
  return allowE2ePreview() && user?.email === E2E_PREVIEW_USER.email
}
