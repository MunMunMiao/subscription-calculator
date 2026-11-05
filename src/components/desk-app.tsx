"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react"
import { toast } from "sonner"

import { DeskScene } from "@/components/desk-scene"
import {
  TECHO_TABS,
  TechoBrandMark,
  TechoLogoutButton,
  TechoSampleButton,
  TechoTabButton,
  TechoWriteButton,
} from "@/components/techo-controls"
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
import { gsap, useGSAP } from "@/lib/gsap"
import { authClient } from "@/lib/auth-client"
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
import { orpc } from "@/orpc/client"

export type DeskUser = {
  name: string
  email: string
  image?: string | null
} | null

type PaperMode =
  "landing" | "summary" | "chart" | "list" | "upcoming" | "compose"

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

function assertNever(value: never): never {
  throw new Error(`Unhandled paper mode: ${String(value)}`)
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
  const [mode, setMode] = useState<PaperMode>(user ? "summary" : "landing")
  const [editing, setEditing] = useState<SubscriptionRecord | undefined>()
  const [form, setForm] = useState<FormValues>(EMPTY_FORM)
  const [currency, setCurrency] = useState<Currency>("USD")
  const [now] = useState(() => new Date())

  const listQuery = useQuery({
    ...orpc.subscriptions.list.queryOptions(),
    enabled: Boolean(user),
  })
  const items = (listQuery.data ?? []) as SubscriptionRecord[]
  const currencies = usedCurrencies(items)
  const activeCurrency = currencies.includes(currency)
    ? currency
    : (currencies[0] ?? "USD")
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
        setMode("list")
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
        setMode("list")
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
      const mm = gsap.matchMedia()
      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const reduce = Boolean(context.conditions?.reduceMotion)
          const duration = reduce ? 0 : 0.7
          gsap.set(".letter-paper, .paper-slot", {
            rotation: -0.55,
            transformOrigin: "50% 50%",
          })
          const tl = gsap.timeline({
            defaults: { ease: "power2.out", duration },
          })
          tl.from(
            ".desk-prop",
            {
              autoAlpha: 0,
              scale: 0.86,
              y: 18,
              stagger: reduce ? 0 : 0.05,
              transformOrigin: "50% 50%",
            },
            0
          )
          tl.from(
            [".letter-paper", ".paper-slot"],
            { y: -42, autoAlpha: 0, rotation: -6 },
            0.12
          )
          if (!reduce) {
            tl.from(
              ".paper-line",
              { drawSVG: 0, stagger: 0.018, duration: 0.55 },
              0.18
            )
            tl.from(
              ".sparkle",
              { scale: 0, stagger: 0.07, ease: "back.out(2.2)" },
              0.42
            )
            gsap.to(".plant-leaf", {
              rotation: 2.6,
              transformOrigin: "50% 90%",
              yoyo: true,
              repeat: -1,
              duration: 2.6,
              stagger: 0.18,
              ease: "sine.inOut",
            })
            gsap.to(".sparkle", {
              scale: 1.18,
              autoAlpha: 0.72,
              yoyo: true,
              repeat: -1,
              duration: 1.15,
              stagger: 0.16,
              ease: "sine.inOut",
            })
            gsap.to(".pencil", {
              rotation: "+=1.6",
              yoyo: true,
              repeat: -1,
              duration: 3.2,
              ease: "sine.inOut",
            })
          }
        }
      )
      return () => mm.revert()
    },
    { scope: rootRef }
  )

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(
        { reduceMotion: "(prefers-reduced-motion: reduce)" },
        (context) => {
          const reduce = Boolean(context.conditions?.reduceMotion)
          const face = ".paper-face"
          const tl = gsap.timeline({
            defaults: {
              duration: reduce ? 0 : 0.48,
              ease: "power2.inOut",
            },
          })
          tl.fromTo(
            face,
            { autoAlpha: 0, y: reduce ? 0 : 22, rotation: reduce ? 0 : 1.4 },
            { autoAlpha: 1, y: 0, rotation: 0 }
          )
        }
      )
      return () => mm.revert()
    },
    { scope: rootRef, dependencies: [mode], revertOnUpdate: true }
  )

  function login() {
    void authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    })
  }

  async function logout() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const tl = gsap.timeline({
      defaults: { duration: reduce ? 0 : 0.4, ease: "power2.in" },
      onComplete: () => {
        void authClient.signOut().then(() => {
          window.location.assign("/")
        })
      },
    })
    tl.to(".paper-face", { autoAlpha: 0, y: 16 })
  }

  function go(next: PaperMode) {
    if (next === "compose" && mode !== "compose") {
      setEditing(undefined)
      setForm(EMPTY_FORM)
    }
    setMode(next)
  }

  function openEdit(item: SubscriptionRecord) {
    setEditing(item)
    setForm(recordToForm(item))
    setMode("compose")
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
    if (editing) {
      updateMutation.mutate({ ...payload, id: editing.id })
      return
    }
    createMutation.mutate(payload)
  }

  function renderFace() {
    switch (mode) {
      case "landing":
        return <LandingFace onLogin={login} />
      case "summary":
        return (
          <SummaryFace
            loading={listQuery.isLoading}
            items={items}
            totals={totals}
            currency={activeCurrency}
            currencies={currencies}
            onCurrency={setCurrency}
            onCompose={() => go("compose")}
            onSeed={() => seedMutation.mutate(undefined)}
            seeding={seedMutation.isPending}
          />
        )
      case "chart":
        return (
          <ChartFace
            loading={listQuery.isLoading}
            slices={slices}
            forecast={forecast}
            currency={activeCurrency}
          />
        )
      case "list":
        return (
          <ListFace
            loading={listQuery.isLoading}
            items={items}
            onEdit={openEdit}
            onDelete={(item) => {
              if (window.confirm(`删除「${item.name}」？`)) {
                removeMutation.mutate({ id: item.id })
              }
            }}
            onCompose={() => go("compose")}
            onSeed={() => seedMutation.mutate(undefined)}
            seeding={seedMutation.isPending}
          />
        )
      case "upcoming":
        return <UpcomingFace loading={listQuery.isLoading} charges={charges} />
      case "compose":
        return (
          <ComposeFace
            form={form}
            setForm={setForm}
            editing={Boolean(editing)}
            submitting={createMutation.isPending || updateMutation.isPending}
            onSubmit={submitForm}
            onCancel={() => {
              setEditing(undefined)
              setForm(EMPTY_FORM)
              setMode("list")
            }}
          />
        )
      default:
        return assertNever(mode)
    }
  }

  return (
    <div ref={rootRef} className="desk-root">
      <DeskScene />
      <div className="paper-layer">
        <div className="paper-slot">
          {user ? (
            <nav className="techo-tabs" aria-label="手帐分页">
              {TECHO_TABS.map((tab) => (
                <TechoTabButton
                  key={tab.mode}
                  mode={tab.mode}
                  active={mode === tab.mode}
                  onClick={() => go(tab.mode)}
                />
              ))}
            </nav>
          ) : null}
          <div className="paper-face">{renderFace()}</div>
          {user ? (
            <footer className="paper-footer">
              <TechoBrandMark name={user.name || "MunMunMiao"} />
              <TechoLogoutButton onClick={logout} />
            </footer>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Star({ className }: { className: string }) {
  return (
    <svg
      className={`sparkle ${className}`}
      viewBox="-10 -10 20 20"
      aria-hidden="true"
    >
      <path
        d="M 0 -9 L 1.6 -1.6 L 9 0 L 1.6 1.6 L 0 9 L -1.6 1.6 L -9 0 L -1.6 -1.6 Z"
        fill="#e8c44a"
        stroke="#c9a227"
        strokeWidth="0.8"
      />
    </svg>
  )
}

function LandingFace({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="cover-face">
      <div className="title-cluster">
        <Star className="sparkle-pos sparkle-tl" />
        <Star className="sparkle-pos sparkle-tr" />
        <Star className="sparkle-pos sparkle-top" />
        <h1 className="techo-title">手帐</h1>
        <Star className="sparkle-pos sparkle-bl" />
        <Star className="sparkle-pos sparkle-br" />
      </div>
      <button type="button" className="github-login" onClick={onLogin}>
        <span className="github-login-icon">
          <GitHubMark />
        </span>
        GitHub 登录
      </button>
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
        <TechoWriteButton onClick={onCompose} />
        <TechoSampleButton
          label={seeding ? "载入中…" : "载入示例"}
          onClick={onSeed}
          disabled={seeding}
        />
      </div>
    </div>
  )
}

function SummaryFace({
  loading,
  items,
  totals,
  currency,
  currencies,
  onCurrency,
  onCompose,
  onSeed,
  seeding,
}: {
  loading: boolean
  items: SubscriptionRecord[]
  totals:
    | {
        monthlyRecurring: number
        yearlyRecurring: number
        oneTimeThisMonth: number
        oneTimeThisYear: number
      }
    | undefined
  currency: Currency
  currencies: Currency[]
  onCurrency: (value: Currency) => void
  onCompose: () => void
  onSeed: () => void
  seeding: boolean
}) {
  if (loading) return <p className="ink-muted">读取中…</p>
  if (items.length === 0) {
    return <EmptyInk onCompose={onCompose} onSeed={onSeed} seeding={seeding} />
  }
  return (
    <div className="summary-face">
      {currencies.length > 1 ? (
        <div className="ink-row">
          {currencies.map((item) => (
            <button
              key={item}
              type="button"
              className={`ink-text-btn${item === currency ? " is-active" : ""}`}
              onClick={() => onCurrency(item)}
            >
              {item}
            </button>
          ))}
        </div>
      ) : (
        <p className="ink-kicker">{currency}</p>
      )}
      <dl className="stat-grid">
        <div>
          <dt>每月经常</dt>
          <dd>{formatMoney(totals?.monthlyRecurring ?? 0, currency)}</dd>
        </div>
        <div>
          <dt>每年经常</dt>
          <dd>{formatMoney(totals?.yearlyRecurring ?? 0, currency)}</dd>
        </div>
        <div>
          <dt>本月一次</dt>
          <dd>{formatMoney(totals?.oneTimeThisMonth ?? 0, currency)}</dd>
        </div>
        <div>
          <dt>本年一次</dt>
          <dd>{formatMoney(totals?.oneTimeThisYear ?? 0, currency)}</dd>
        </div>
      </dl>
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
