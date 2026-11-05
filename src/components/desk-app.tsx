"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useLayoutEffect, useReducer, useRef, useState } from "react"
import { toast } from "sonner"

import { DeskDialogMount } from "@/components/desk-dialog"
import { DeskScene } from "@/components/desk-scene"
import {
  AuthLayer,
  CategoryWidget,
  ChargesWidget,
  ComposeWidget,
  DeskInk,
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
  bindContentDrag,
  bindWidgetStickers,
  collapseExpanded,
  expandWidget,
  playAmbient,
  playEnterRespectingMotion,
  playExit,
  poseLoginOnly,
  poseRefreshStart,
} from "@/lib/widget-motion"
import {
  isStickerDefault,
  placedSlots,
  readPreviewLayouts,
  writePreviewLayout,
  type WidgetSlot,
} from "@/lib/widget-slots"
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

export function readJustAuthed() {
  try {
    return sessionStorage.getItem(JUST_AUTHED_KEY) === "1"
  } catch {
    return false
  }
}

export function requireItem<T extends { id: string }>(
  items: readonly T[],
  id: string
): T {
  const item = items.find((row) => row.id === id)
  if (!item) throw new Error(`missing item ${id}`)
  return item
}

export function recordToForm(item: SubscriptionRecord): FormValues {
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

export function DeskApp({ user }: { user: DeskUser }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const activeUser = user
  const [desk, dispatch] = useReducer(reduceDesk, activeUser, (user) =>
    bootDesk({ user: Boolean(user), fromLogin: readJustAuthed() })
  )
  const expandedRef = useRef<ContentWidgetId | null>(null)
  const [painted, setPainted] = useState<ContentWidgetId | null>(null)
  const [editing, setEditing] = useState<SubscriptionRecord | undefined>()
  const [form, setForm] = useState<FormValues>(EMPTY_FORM)
  const [now] = useState(() => new Date())
  const preview = isE2ePreviewUser(activeUser)
  const previewLayout = allowE2ePreview()
  const [localItems, setLocalItems] = useState<SubscriptionRecord[]>(() =>
    preview ? (e2ePreviewItems(now) as SubscriptionRecord[]) : []
  )
  const [overrides, setOverrides] = useState<
    Partial<Record<ContentWidgetId, WidgetSlot>>
  >(() => (allowE2ePreview() ? readPreviewLayouts() : {}))
  const [dragging, setDragging] = useState<ContentWidgetId | null>(null)

  const listQuery = useQuery({
    ...orpc.subscriptions.list.queryOptions(),
    enabled: Boolean(activeUser) && !preview,
  })
  const layoutQuery = useQuery({
    ...orpc.widgetLayouts.list.queryOptions(),
    enabled: Boolean(activeUser) && !previewLayout,
  })
  const slots = placedSlots(
    previewLayout ? [] : (layoutQuery.data ?? []),
    overrides
  )
  const saveLayout = useMutation(orpc.widgetLayouts.save.mutationOptions())
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
        dispatch({ type: "collapse" })
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
        dispatch({ type: "collapse" })
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

  /* v8 ignore start -- placeholders until the layout effect installs the live handlers */
  const commitRef = useRef<(id: ContentWidgetId, slot: WidgetSlot) => void>(
    () => {}
  )
  const expandRef = useRef<(id: ContentWidgetId) => void>(() => {})
  /* v8 ignore stop */
  const enterStarted = useRef(false)

  useGSAP(
    () => {
      playAmbient()
      if (desk.phase === "login-only") poseLoginOnly()
      else poseRefreshStart()
      const root = rootRef.current!
      const unstick = bindWidgetStickers(
        root,
        () => root.dataset.locked === "true",
        () => {
          const expanded = root.dataset.expanded
          if (
            expanded === "category" ||
            expanded === "subs" ||
            expanded === "charges" ||
            expanded === "compose"
          ) {
            return expanded
          }
          return null
        }
      )
      const undrag = bindContentDrag(root, {
        enabled: () =>
          root.dataset.phase === "desk" || root.dataset.phase === "expanded",
        onDragStart: (id) => setDragging(id),
        onDrag: (id, slot) =>
          setOverrides((current) => ({ ...current, [id]: slot })),
        onDragEnd: () => setDragging(null),
        onCommit: (id, slot) => commitRef.current(id, slot),
        onClick: (id) => expandRef.current(id),
      })
      return () => {
        unstick()
        undrag()
      }
    },
    { scope: rootRef, revertOnUpdate: false }
  )

  useGSAP(
    () => {
      if (desk.phase !== "enter" || enterStarted.current) return
      if (!previewLayout && !layoutQuery.isFetched) return
      enterStarted.current = true
      sessionStorage.removeItem(JUST_AUTHED_KEY)
      playEnterRespectingMotion(desk.fromLogin ? "login" : "refresh", () => {
        dispatch({ type: "enter-done" })
      })
    },
    {
      scope: rootRef,
      dependencies: [desk.phase, previewLayout, layoutQuery.isFetched],
      revertOnUpdate: false,
    }
  )

  useGSAP(
    () => {
      if (desk.phase !== "exit") return
      playExit(expandedRef.current, () => {
        void authClient.signOut().finally(
          /* v8 ignore start -- assigning location reloads the browser and tears the runner down */
          () => {
            window.location.assign("/")
          }
          /* v8 ignore stop */
        )
      })
    },
    { scope: rootRef, dependencies: [desk.phase], revertOnUpdate: false }
  )

  useGSAP(
    () => {
      if (desk.phase !== "desk" && desk.phase !== "expanded") return
      const prev = expandedRef.current
      const next = desk.expanded
      if (prev === next) return
      if (next) {
        setPainted(next)
        expandWidget(next, prev)
      } else {
        collapseExpanded(prev as ContentWidgetId).eventCallback(
          "onComplete",
          () => {
            setPainted(null)
          }
        )
      }
      expandedRef.current = next
    },
    {
      scope: rootRef,
      dependencies: [desk.phase, desk.expanded],
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

  function logout() {
    dispatch({ type: "logout" })
  }

  function expand(id: ContentWidgetId) {
    dispatch({ type: "expand", id })
  }

  function commitSlot(id: ContentWidgetId, slot: WidgetSlot) {
    const stored = isStickerDefault(id, slot) ? null : slot
    setOverrides((current) => {
      const next = { ...current }
      if (stored) next[id] = stored
      else delete next[id]
      return next
    })
    if (previewLayout) {
      writePreviewLayout(id, stored)
      return
    }
    saveLayout.mutate({ widgetId: id, x: slot.x, y: slot.y })
  }

  useLayoutEffect(() => {
    commitRef.current = commitSlot
    expandRef.current = expand
  })

  function collapse() {
    dispatch({ type: "collapse" })
  }

  function openEdit(item: SubscriptionRecord) {
    setEditing(item)
    setForm(recordToForm(item))
    expand("compose")
  }

  function changeCategory(id: string, category: Category) {
    const item = requireItem(items, id)
    if (item.category === category) return
    if (preview) {
      setLocalItems((current) =>
        current.map((row) => (row.id === id ? { ...row, category } : row))
      )
      return
    }
    updateMutation.mutate({
      id: item.id,
      name: item.name,
      amount: centsToAmount(item.amountCents),
      currency: item.currency,
      category,
      notes: item.notes ?? null,
      type: item.type,
      interval: item.interval,
      intervalDays: item.intervalDays,
      chargeDate: item.chargeDate,
      status: item.status,
    })
  }

  function submitForm() {
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
      dispatch({ type: "collapse" })
      return
    }
    if (editing) {
      updateMutation.mutate({ ...payload, id: editing.id })
      return
    }
    createMutation.mutate(payload)
  }

  const onDesk = desk.phase === "desk" || desk.phase === "expanded"
  const summary = formatMonthlyBanner(
    totals?.monthlyRecurring ?? 0,
    activeCurrency
  )
  const dialogId = desk.expanded ?? painted

  return (
    <div
      ref={rootRef}
      className="desk-root"
      data-testid="desk-root"
      data-phase={desk.phase}
      data-from={desk.fromLogin ? "login" : "session"}
      data-expanded={desk.expanded ?? ""}
      data-locked={desk.locked ? "true" : "false"}
      data-dragging={dragging ?? undefined}
    >
      <DeskScene onDeskClick={collapse}>
        <AuthLayer onLogin={login} />
        <CategoryWidget slot={slots.category} items={items} />
        <SubsWidget slot={slots.subs} items={items} />
        <ChargesWidget slot={slots.charges} charges={charges} />
        <ComposeWidget
          slot={slots.compose}
          idleLine={form.name.trim() || EMPTY_INK.compose}
        />
        <DeskInk
          visible={onDesk}
          summary={summary}
          userName={activeUser?.name}
          onLogout={logout}
        />
        <DeskDialogMount
          widget={dialogId}
          items={items}
          charges={charges}
          form={form}
          editing={Boolean(editing)}
          submitting={createMutation.isPending || updateMutation.isPending}
          onClose={collapse}
          onEdit={(id) => {
            openEdit(requireItem(items, id))
          }}
          onDelete={(id) => {
            const item = requireItem(items, id)
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
          onCategory={changeCategory}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onSubmit={() => submitForm()}
        />
      </DeskScene>
    </div>
  )
}
