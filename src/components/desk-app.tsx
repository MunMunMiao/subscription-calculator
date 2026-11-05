"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react"
import { toast } from "sonner"

import { DeskScene } from "@/components/desk-scene"
import {
  CategoryWidget,
  ChargesWidget,
  ComposeWidget,
  DeskInk,
  LoginWidget,
  SubsWidget,
} from "@/components/desk-widgets"
import {
  CATEGORIES,
  CURRENCIES,
  INTERVALS,
  STATUSES,
  SUBSCRIPTION_TYPES,
  categoryLabel,
  categoryLabels,
  intervalLabels,
  isCategory,
  statusLabels,
  typeLabels,
  type Category,
  type Currency,
  type Interval,
  type Status,
  type SubscriptionType,
} from "@/lib/catalog"
import { useGSAP } from "@/lib/gsap"
import { authClient } from "@/lib/auth-client"
import {
  E2E_PREVIEW_USER,
  allowE2ePreview,
  e2ePreviewItems,
  isE2ePreviewUser,
} from "@/lib/e2e-preview"
import { centsToAmount, formatMoney } from "@/lib/money"
import {
  categoryBreakdown,
  sixMonthForecast,
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

const PIE_COLORS = [
  "#e27898",
  "#7eb8d4",
  "#6a9a4e",
  "#d4a84b",
  "#c48a6a",
  "#8a7bb8",
  "#e38a6c",
  "#5f7f3c",
  "#4a7ab8",
]

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
  const slices = categoryBreakdown(items, activeCurrency)
  const forecast = sixMonthForecast(items, activeCurrency, now)

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

  const seedMutation = useMutation(
    orpc.subscriptions.seedDemo.mutationOptions({
      onSuccess: async (result) => {
        if (result.seeded) toast.success("已载入示例")
        else toast.message("已有记录")
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

  function submitForm(event: FormEvent) {
    event.preventDefault()
    const payload = {
      name: form.name,
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

  function seed() {
    if (preview) {
      setLocalItems(e2ePreviewItems(now) as SubscriptionRecord[])
      toast.success("已载入示例")
      return
    }
    seedMutation.mutate(undefined)
  }

  const onDesk = desk.phase === "desk" || desk.phase === "held"
  const summary = items.length
    ? `${formatMoney(totals?.monthlyRecurring ?? 0, activeCurrency)} / 月`
    : "手帐"

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
        <LoginWidget>
          <LandingFace
            onLogin={login}
            onPreviewEnter={allowE2ePreview() ? enterPreview : undefined}
          />
        </LoginWidget>
        <CategoryWidget
          held={desk.held === "category"}
          onPick={() => pick("category")}
        >
          <ChartFace
            loading={listQuery.isLoading && !preview}
            slices={slices}
            forecast={forecast}
            currency={activeCurrency}
          />
        </CategoryWidget>
        <SubsWidget held={desk.held === "subs"} onPick={() => pick("subs")}>
          <ListFace
            loading={listQuery.isLoading && !preview}
            items={items}
            onEdit={openEdit}
            onDelete={(item) => {
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
            onCompose={() => pick("compose")}
            onSeed={seed}
            seeding={seedMutation.isPending}
          />
        </SubsWidget>
        <ChargesWidget
          held={desk.held === "charges"}
          onPick={() => pick("charges")}
        >
          <UpcomingFace
            loading={listQuery.isLoading && !preview}
            charges={charges}
          />
        </ChargesWidget>
        <ComposeWidget
          held={desk.held === "compose"}
          onPick={() => pick("compose")}
        >
          <ComposeFace
            form={form}
            setForm={setForm}
            editing={Boolean(editing)}
            submitting={createMutation.isPending || updateMutation.isPending}
            onSubmit={submitForm}
            onCancel={() => {
              setEditing(undefined)
              setForm(EMPTY_FORM)
              dispatch({ type: "put-down" })
            }}
          />
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

function LandingFace({
  onLogin,
  onPreviewEnter,
}: {
  onLogin: () => void
  onPreviewEnter?: () => void
}) {
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
      {onPreviewEnter ? (
        <button
          type="button"
          id="btn-e2e-enter"
          className="ink-btn"
          onClick={onPreviewEnter}
        >
          进入桌面
        </button>
      ) : null}
    </div>
  )
}

function EmptyInk({
  onCompose,
  onSeed,
  seeding,
}: {
  onCompose: () => void
  onSeed: () => void
  seeding?: boolean
}) {
  return (
    <div className="empty-ink">
      <p>还没有记录</p>
      <div className="ink-row">
        <button type="button" className="ink-btn" onClick={onCompose}>
          记一笔
        </button>
        <button
          type="button"
          className="ink-btn ink-btn-ghost"
          onClick={onSeed}
          disabled={seeding}
        >
          {seeding ? "载入中…" : "载入示例"}
        </button>
      </div>
    </div>
  )
}

function ChartFace({
  loading,
  slices,
  forecast,
  currency,
}: {
  loading: boolean
  slices: Array<{ category: string; amountCents: number }>
  forecast: Array<{ month: string; amountCents: number }>
  currency: Currency
}) {
  if (loading) return <p className="ink-muted">读取中…</p>
  const total = slices.reduce((sum, slice) => sum + slice.amountCents, 0)
  const maxBar = Math.max(1, ...forecast.map((item) => item.amountCents))
  const arcs = slices.map((slice, index) => {
    const start = slices
      .slice(0, index)
      .reduce(
        (sum, item) => sum + (total === 0 ? 0 : item.amountCents / total),
        0
      )
    const fraction = total === 0 ? 0 : slice.amountCents / total
    return {
      category: slice.category,
      amountCents: slice.amountCents,
      start,
      end: start + fraction,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }
  })

  return (
    <div className="chart-face">
      {slices.length === 0 ? (
        <p className="ink-muted">暂无分类数据</p>
      ) : (
        <svg viewBox="0 0 240 160" className="ink-chart" aria-hidden="true">
          {arcs.map((arc) => (
            <path
              key={arc.category}
              d={donutSlice(120, 78, 52, 22, arc.start, arc.end)}
              fill={arc.color}
              stroke={INK_SOFT}
              strokeWidth="1.6"
            />
          ))}
        </svg>
      )}
      <ul className="legend">
        {slices.map((slice, index) => (
          <li key={slice.category}>
            <span
              className="swatch"
              style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
            />
            {categoryLabel(slice.category)}
            <em>{formatMoney(slice.amountCents, currency)}</em>
          </li>
        ))}
      </ul>
      <div className="bars">
        {forecast.map((item) => (
          <div key={item.month} className="bar-col">
            <div
              className="bar"
              style={{ height: `${(item.amountCents / maxBar) * 72}px` }}
            />
            <span>{item.month.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const INK_SOFT = "#2a2118"

function polar(cx: number, cy: number, r: number, t: number) {
  const a = (t - 0.25) * Math.PI * 2
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
}

function donutSlice(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  start: number,
  end: number
) {
  const span = Math.min(end - start, 0.9999)
  const stop = start + span
  const large = span > 0.5 ? 1 : 0
  const a0 = polar(cx, cy, rOuter, start)
  const a1 = polar(cx, cy, rOuter, stop)
  const b0 = polar(cx, cy, rInner, stop)
  const b1 = polar(cx, cy, rInner, start)
  return `M ${a0.x} ${a0.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${a1.x} ${a1.y} L ${b0.x} ${b0.y} A ${rInner} ${rInner} 0 ${large} 0 ${b1.x} ${b1.y} Z`
}

function ListFace({
  loading,
  items,
  onEdit,
  onDelete,
  onCompose,
  onSeed,
  seeding,
}: {
  loading: boolean
  items: SubscriptionRecord[]
  onEdit: (item: SubscriptionRecord) => void
  onDelete: (item: SubscriptionRecord) => void
  onCompose: () => void
  onSeed: () => void
  seeding: boolean
}) {
  if (loading) return <p className="ink-muted">读取中…</p>
  if (items.length === 0) {
    return <EmptyInk onCompose={onCompose} onSeed={onSeed} seeding={seeding} />
  }
  return (
    <ul className="ink-list">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className="ink-list-main"
            onClick={() => onEdit(item)}
          >
            <strong>{item.name}</strong>
            <span>
              {formatMoney(item.amountCents, item.currency)} ·{" "}
              {item.type === "recurring" && item.interval
                ? item.interval === "custom"
                  ? `每 ${item.intervalDays} 天`
                  : intervalLabels[item.interval]
                : typeLabels[item.type]}
            </span>
          </button>
          <button
            type="button"
            className="ink-text-btn danger"
            onClick={() => onDelete(item)}
          >
            删除
          </button>
        </li>
      ))}
    </ul>
  )
}

function UpcomingFace({
  loading,
  charges,
}: {
  loading: boolean
  charges: ReturnType<typeof upcomingCharges>
}) {
  if (loading) return <p className="ink-muted">读取中…</p>
  if (charges.length === 0) {
    return <p className="ink-muted">暂无即将扣费</p>
  }
  return (
    <ul className="ink-list">
      {charges.slice(0, 14).map((charge) => (
        <li key={charge.id}>
          <div className="ink-list-main">
            <strong>{charge.name}</strong>
            <span>
              {charge.date} · {categoryLabel(charge.category)}
            </span>
          </div>
          <em>{formatMoney(charge.amountCents, charge.currency)}</em>
        </li>
      ))}
    </ul>
  )
}

function ComposeFace({
  form,
  setForm,
  editing,
  submitting,
  onSubmit,
  onCancel,
}: {
  form: FormValues
  setForm: Dispatch<SetStateAction<FormValues>>
  editing: boolean
  submitting: boolean
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
}) {
  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <form className="ink-form" onSubmit={onSubmit}>
      <p className="ink-kicker">{editing ? "改一笔" : "记一笔"}</p>
      <label>
        名称
        <input
          className="ink-field"
          required
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
        />
      </label>
      <div className="ink-split">
        <label>
          金额
          <input
            className="ink-field"
            type="number"
            min="0"
            step="0.01"
            required
            value={Number.isFinite(form.amount) ? form.amount : 0}
            onChange={(event) =>
              update("amount", Number.parseFloat(event.target.value) || 0)
            }
          />
        </label>
        <label>
          货币
          <select
            className="ink-field"
            value={form.currency}
            onChange={(event) => {
              const value = event.target.value
              if (value === "USD" || value === "CNY") update("currency", value)
            }}
          >
            {CURRENCIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="ink-split">
        <label>
          类型
          <select
            className="ink-field"
            value={form.type}
            onChange={(event) => {
              const value = event.target.value
              if (value === "recurring" || value === "one_time") {
                update("type", value)
              }
            }}
          >
            {SUBSCRIPTION_TYPES.map((item) => (
              <option key={item} value={item}>
                {typeLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          分类
          <select
            className="ink-field"
            value={form.category}
            onChange={(event) => {
              const value = event.target.value
              if (isCategory(value)) update("category", value)
            }}
          >
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {categoryLabels[item]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {form.type === "recurring" ? (
        <div className="ink-split">
          <label>
            周期
            <select
              className="ink-field"
              value={form.interval}
              onChange={(event) => {
                const value = event.target.value
                if (
                  value === "monthly" ||
                  value === "yearly" ||
                  value === "weekly" ||
                  value === "custom"
                ) {
                  update("interval", value)
                }
              }}
            >
              {INTERVALS.map((item) => (
                <option key={item} value={item}>
                  {intervalLabels[item]}
                </option>
              ))}
            </select>
          </label>
          {form.interval === "custom" ? (
            <label>
              天数
              <input
                className="ink-field"
                type="number"
                min="1"
                required
                value={form.intervalDays}
                onChange={(event) =>
                  update(
                    "intervalDays",
                    Number.parseInt(event.target.value, 10) || 1
                  )
                }
              />
            </label>
          ) : (
            <label>
              状态
              <select
                className="ink-field"
                value={form.status}
                onChange={(event) => {
                  const value = event.target.value
                  if (
                    value === "active" ||
                    value === "paused" ||
                    value === "cancelled"
                  ) {
                    update("status", value)
                  }
                }}
              >
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {statusLabels[item]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      ) : (
        <label>
          状态
          <select
            className="ink-field"
            value={form.status}
            onChange={(event) => {
              const value = event.target.value
              if (
                value === "active" ||
                value === "paused" ||
                value === "cancelled"
              ) {
                update("status", value)
              }
            }}
          >
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {statusLabels[item]}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        {form.type === "recurring" ? "下次扣费" : "购买日"}
        <input
          className="ink-field"
          type="date"
          required
          value={form.chargeDate}
          onChange={(event) => update("chargeDate", event.target.value)}
        />
      </label>
      <label>
        备注
        <input
          className="ink-field"
          value={form.notes}
          onChange={(event) => update("notes", event.target.value)}
        />
      </label>
      <div className="ink-row end">
        <button
          type="button"
          className="ink-btn ink-btn-ghost"
          onClick={onCancel}
        >
          返回
        </button>
        <button type="submit" className="ink-btn" disabled={submitting}>
          {submitting ? "保存中…" : "保存"}
        </button>
      </div>
    </form>
  )
}
