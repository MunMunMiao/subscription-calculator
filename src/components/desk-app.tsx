"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useReducer, useRef, useState, type FormEvent } from "react"
import { toast } from "sonner"

import { DeskScene } from "@/components/desk-scene"
import {
  CategoryWidget,
  ChargesWidget,
  ComposeHeldInk,
  ComposeWidget,
  DeskInk,
  LoginWidget,
  SubsWidget,
} from "@/components/desk-widgets"
import {
  isCategory,
  type Category,
  type Currency,
  type Interval,
  type Status,
  type SubscriptionType,
} from "@/lib/catalog"
import { EMPTY_INK, formatMonthlyBanner } from "@/lib/desk-ink"
import { useGSAP } from "@/lib/gsap"
import { authClient } from "@/lib/auth-client"
import {
  E2E_PREVIEW_USER,
  allowE2ePreview,
  e2ePreviewItems,
  isE2ePreviewUser,
} from "@/lib/e2e-preview"
import { centsToAmount } from "@/lib/money"
import {
  toISODate,
  totalsByCurrency,
  upcomingCharges,
  usedCurrencies,
  type SpendItem,
} from "@/lib/spend"
import {
  bootDesk,
  reduceDesk,
  type ContentWidgetId,
} from "@/lib/widget-machine"
import {
  JUST_AUTHED_KEY,
  bindWidgetStickers,
  playAmbient,
  playEnterRespectingMotion,
  playExit,
  playPickUp,
  playPutDown,
  poseLoginOnly,
  poseRefreshStart,
} from "@/lib/widget-motion"
import { orpc } from "@/orpc/client"

export type DeskUser = {
  name: string
  email: string
  image?: string | null
} | null

type SubscriptionRecord = SpendItem & {
  notes?: string | null
}

type FormValues = {
  name: string
  amount: number
  currency: Currency
  category: Category
  notes: string
  type: SubscriptionType
  interval: Interval
  intervalDays: number
  chargeDate: string
  status: Status
}

const EMPTY_FORM: FormValues = {
  name: "",
  amount: 0,
  currency: "USD",
  category: "other",
  notes: "",
  type: "recurring",
  interval: "monthly",
  intervalDays: 30,
  chargeDate: toISODate(new Date()),
  status: "active",
}

function recordToForm(item: SubscriptionRecord): FormValues {
  return {
    name: item.name,
    amount: centsToAmount(item.amountCents),
    currency: item.currency,
    category: isCategory(item.category) ? item.category : "other",
    notes: item.notes ?? "",
    type: item.type,
    interval: item.interval ?? "monthly",
    intervalDays: item.intervalDays ?? 30,
    chargeDate: item.chargeDate,
    status: item.status,
  }
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 1C5.923 1 1 5.923 1 12c0 4.867 3.149 8.995 7.521 10.437.55.096.756-.233.756-.522 0-.262-.013-1.128-.013-2.049-2.764.509-3.479-.674-3.699-1.292-.124-.317-.66-1.293-1.127-1.554-.385-.207-.936-.715-.014-.729.867-.014 1.486.798 1.693 1.128.99 1.665 2.571 1.196 3.204.907.096-.715.385-1.196.701-1.471-2.448-.275-5.005-1.224-5.005-5.432 0-1.196.426-2.186 1.128-2.956-.111-.275-.496-1.402.11-2.915 0 0 .921-.289 3.024 1.128a10.193 10.193 0 0 1 2.75-.371c.936 0 1.871.123 2.75.371 2.104-1.431 3.025-1.128 3.025-1.128.605 1.513.221 2.64.111 2.915.701.77 1.127 1.747 1.127 2.956 0 4.222-2.571 5.157-5.019 5.432.399.344.743 1.004.743 2.035 0 1.471-.014 2.654-.014 3.025 0 .289.206.632.756.522C19.851 20.995 23 16.854 23 12c0-6.077-4.922-11-11-11Z"
      />
    </svg>
  )
}

export function DeskApp({ user }: { user: DeskUser }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const [e2eUser, setE2eUser] = useState<DeskUser>(null)
  const activeUser = user ?? e2eUser
  const [desk, dispatch] = useReducer(
    reduceDesk,
    Boolean(activeUser),
    (hasUser) => bootDesk({ user: hasUser, fromLogin: false })
  )
  const heldRef = useRef<ContentWidgetId | null>(null)
  const [editing, setEditing] = useState<SubscriptionRecord | undefined>()
  const [form, setForm] = useState<FormValues>(EMPTY_FORM)
  const [now] = useState(() => new Date())
  const preview = isE2ePreviewUser(activeUser)
  const [localItems, setLocalItems] = useState<SubscriptionRecord[]>(() =>
    preview ? (e2ePreviewItems(now) as SubscriptionRecord[]) : []
  )

  const listQuery = useQuery({
    ...orpc.subscriptions.list.queryOptions(),
    enabled: Boolean(activeUser) && !preview,
  })
  const items = (
    preview ? localItems : (listQuery.data ?? [])
  ) as SubscriptionRecord[]
  const currencies = usedCurrencies(items)
  const activeCurrency = currencies[0] ?? "USD"
  const totals = totalsByCurrency(items, now).find(
    (item) => item.currency === activeCurrency
  )
  const charges = upcomingCharges(items, now, 90)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: orpc.subscriptions.key() })

  const createMutation = useMutation(
    orpc.subscriptions.create.mutationOptions({
      onSuccess: async () => {
        toast.success("已记下")
        setEditing(undefined)
        setForm(EMPTY_FORM)
        dispatch({ type: "put-down" })
        await invalidate()
      },
      onError: (error) => toast.error(error.message),
    })
  )

  const updateMutation = useMutation(
    orpc.subscriptions.update.mutationOptions({
      onSuccess: async () => {
        toast.success("已更新")
        setEditing(undefined)
        setForm(EMPTY_FORM)
        dispatch({ type: "put-down" })
        await invalidate()
      },
      onError: (error) => toast.error(error.message),
    })
  )

  const removeMutation = useMutation(
    orpc.subscriptions.remove.mutationOptions({
      onSuccess: async () => {
        toast.success("已删除")
        await invalidate()
      },
      onError: (error) => toast.error(error.message),
    })
  )

  useGSAP(
    () => {
      playAmbient()
      if (desk.phase === "login-only") poseLoginOnly()
      else poseRefreshStart()
      return bindWidgetStickers(
        rootRef.current!,
        () => rootRef.current?.dataset.locked === "true",
        () => {
          const held = rootRef.current?.dataset.held
          if (
            held === "category" ||
            held === "subs" ||
            held === "charges" ||
            held === "compose"
          ) {
            return held
          }
          return null
        }
      )
    },
    { scope: rootRef, revertOnUpdate: false }
  )

  useGSAP(
    () => {
      if (desk.phase !== "enter") return
      const fromLogin =
        desk.fromLogin || sessionStorage.getItem(JUST_AUTHED_KEY) === "1"
      sessionStorage.removeItem(JUST_AUTHED_KEY)
      playEnterRespectingMotion(fromLogin ? "login" : "refresh", () => {
        dispatch({ type: "enter-done" })
      })
    },
    { scope: rootRef, dependencies: [desk.phase], revertOnUpdate: false }
  )

  useGSAP(
    () => {
      if (desk.phase !== "exit") return
      playExit(heldRef.current ? `widget-${heldRef.current}` : null, () => {
        void authClient.signOut().finally(() => {
          window.location.assign("/")
        })
      })
    },
    { scope: rootRef, dependencies: [desk.phase], revertOnUpdate: false }
  )

  useGSAP(
    () => {
      if (desk.phase !== "desk" && desk.phase !== "held") return
      const prev = heldRef.current
      const next = desk.held
      if (prev === next) return
      if (next) playPickUp(next, prev)
      else if (prev) playPutDown(prev)
      heldRef.current = next
    },
    {
      scope: rootRef,
      dependencies: [desk.phase, desk.held],
      revertOnUpdate: false,
    }
  )

  function login() {
    sessionStorage.setItem(JUST_AUTHED_KEY, "1")
    void authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    })
  }

  function enterPreview() {
    sessionStorage.setItem(JUST_AUTHED_KEY, "1")
    setE2eUser({
      name: E2E_PREVIEW_USER.name,
      email: E2E_PREVIEW_USER.email,
    })
    setLocalItems(e2ePreviewItems(now) as SubscriptionRecord[])
    dispatch({ type: "login-success" })
  }

  function logout() {
    dispatch({ type: "logout" })
  }

  function pick(id: ContentWidgetId) {
    dispatch({ type: "pick", id })
  }

  function putDown() {
    dispatch({ type: "put-down" })
  }

  function openEdit(item: SubscriptionRecord) {
    setEditing(item)
    setForm(recordToForm(item))
    pick("compose")
  }

  function submitForm(event?: FormEvent) {
    event?.preventDefault()
    const payload = {
      name: form.name.trim() || "新订阅",
      amount: form.amount,
      currency: form.currency,
      category: form.category,
      notes: form.notes.trim() ? form.notes : null,
      type: form.type,
      interval: form.type === "recurring" ? form.interval : null,
      intervalDays:
        form.type === "recurring" && form.interval === "custom"
          ? form.intervalDays
          : null,
      chargeDate: form.chargeDate,
      status: form.status,
    }
    if (preview) {
      const record: SubscriptionRecord = {
        id: editing?.id ?? `e2e-${Date.now()}`,
        name: payload.name,
        amountCents: Math.round(payload.amount * 100),
        currency: payload.currency,
        category: payload.category,
        notes: payload.notes,
        type: payload.type,
        interval: payload.interval,
        intervalDays: payload.intervalDays,
        chargeDate: payload.chargeDate,
        status: payload.status,
      }
      setLocalItems((current) =>
        editing
          ? current.map((item) => (item.id === editing.id ? record : item))
          : [...current, record]
      )
      toast.success(editing ? "已更新" : "已记下")
      setEditing(undefined)
      setForm(EMPTY_FORM)
      dispatch({ type: "put-down" })
      return
    }
    if (editing) {
      updateMutation.mutate({ ...payload, id: editing.id })
      return
    }
    createMutation.mutate(payload)
  }

  const onDesk = desk.phase === "desk" || desk.phase === "held"
  const summary = formatMonthlyBanner(
    totals?.monthlyRecurring ?? 0,
    activeCurrency
  )

  return (
    <div
      ref={rootRef}
      className="desk-root"
      data-testid="desk-root"
      data-phase={desk.phase}
      data-from={desk.fromLogin ? "login" : "session"}
      data-held={desk.held ?? ""}
      data-locked={desk.locked ? "true" : "false"}
    >
      <DeskScene onDeskClick={putDown}>
        <LoginWidget
          onPreviewEnter={allowE2ePreview() ? enterPreview : undefined}
        >
          <LandingFace onLogin={login} />
        </LoginWidget>
        <CategoryWidget
          held={desk.held === "category"}
          onPick={() => pick("category")}
          items={items}
        />
        <SubsWidget
          held={desk.held === "subs"}
          onPick={() => pick("subs")}
          items={items}
          onEdit={(id) => {
            const item = items.find((row) => row.id === id)
            if (item) openEdit(item)
          }}
          onDelete={(id) => {
            const item = items.find((row) => row.id === id)
            if (!item) return
            if (!window.confirm(`删除「${item.name}」？`)) return
            if (preview) {
              setLocalItems((current) =>
                current.filter((row) => row.id !== item.id)
              )
              toast.success("已删除")
              return
            }
            removeMutation.mutate({ id: item.id })
          }}
        />
        <ChargesWidget
          held={desk.held === "charges"}
          onPick={() => pick("charges")}
          charges={charges}
        />
        <ComposeWidget
          held={desk.held === "compose"}
          onPick={() => pick("compose")}
          idleLine={form.name.trim() || EMPTY_INK.compose}
        >
          {desk.held === "compose" ? (
            <ComposeHeldInk
              form={form}
              editing={Boolean(editing)}
              submitting={createMutation.isPending || updateMutation.isPending}
              onChange={(patch) =>
                setForm((current) => ({ ...current, ...patch }))
              }
              onSubmit={() => submitForm()}
              onCancel={() => {
                setEditing(undefined)
                setForm(EMPTY_FORM)
                dispatch({ type: "put-down" })
              }}
            />
          ) : null}
        </ComposeWidget>
        <DeskInk
          visible={onDesk}
          summary={summary}
          userName={activeUser?.name}
          onLogout={logout}
        />
      </DeskScene>
    </div>
  )
}

function LandingFace({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="login-actions">
      <button
        type="button"
        id="btn-login"
        className="github-login"
        onClick={onLogin}
      >
        <span className="github-login-icon">
          <GitHubMark />
        </span>
        GitHub 登录
      </button>
    </div>
  )
}
