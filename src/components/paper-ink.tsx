import type {
  Dispatch,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  SetStateAction,
} from "react"

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
import { formatMoney } from "@/lib/money"
import { type BrowseTab, type SceneName } from "@/lib/scene"
import { type SpendItem } from "@/lib/spend"

export type SubscriptionRecord = SpendItem & {
  notes?: string | null
}

export type FormValues = {
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

const INK = "#2a2118"
const INK_MUTED = "#5c4a38"
const PAPER_WASH = "#f6eedc"

export const TAB_ENTITIES: Array<{
  kind: BrowseTab | "record"
  id: string
  label: string
  fill: string
  rotate: number
}> = [
  {
    kind: "overview",
    id: "tab-overview",
    label: "总览",
    fill: "#f4d5dc",
    rotate: -1.6,
  },
  {
    kind: "category",
    id: "tab-category",
    label: "分类",
    fill: "#d7ead0",
    rotate: 1.1,
  },
  {
    kind: "subs",
    id: "tab-subs",
    label: "订阅",
    fill: "#d7e8f3",
    rotate: -0.8,
  },
  {
    kind: "charges",
    id: "tab-charges",
    label: "扣费",
    fill: "#f3e3c2",
    rotate: 1.4,
  },
  {
    kind: "record",
    id: "tab-record",
    label: "记一笔",
    fill: "#d9cfc0",
    rotate: -1.2,
  },
]

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

const LINE0 = 196
const LINE_GAP = 28

function lineY(index: number) {
  return LINE0 + index * LINE_GAP
}

function onActivateKey(
  event: KeyboardEvent<SVGGElement>,
  activate?: () => void
) {
  if (!activate) return
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault()
    activate()
  }
}

function SceneHit({
  id,
  x,
  y,
  interactive = false,
  state = "idle",
  label,
  disabled,
  onActivate,
  children,
}: {
  id: string
  x: number
  y: number
  interactive?: boolean
  state?: string
  label?: string
  disabled?: boolean
  onActivate?: () => void
  children: ReactNode
}) {
  return (
    <g
      id={id}
      data-interactive={interactive ? "true" : "false"}
      data-state={state}
      transform={`translate(${x} ${y})`}
    >
      <g
        className="entity-motion"
        role={interactive ? "button" : undefined}
        tabIndex={interactive && !disabled ? 0 : undefined}
        aria-label={label}
        aria-disabled={disabled || undefined}
        onClick={interactive && !disabled ? onActivate : undefined}
        onKeyDown={(event) => {
          if (disabled) return
          onActivateKey(event, onActivate)
        }}
      >
        {children}
      </g>
    </g>
  )
}

function InkText({
  x,
  y,
  size = 18,
  fill = INK,
  anchor = "start",
  family = "serif",
  children,
}: {
  x: number
  y: number
  size?: number
  fill?: string
  anchor?: "start" | "middle" | "end"
  family?: "serif" | "title"
  children: ReactNode
}) {
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontSize={size}
      textAnchor={anchor}
      fontFamily={
        family === "title"
          ? '"Ma Shan Zheng", "KaiTi", "STKaiti", serif'
          : '"Noto Serif SC", "Songti SC", serif'
      }
    >
      {children}
    </text>
  )
}

function TapeMark({
  width,
  height,
  fill,
  opacity = 1,
}: {
  width: number
  height: number
  fill: string
  opacity?: number
}) {
  return (
    <path
      d={`M 2,3 Q 0,${height / 2} 3,${height - 2} L ${width - 3},${height} Q ${width},${height / 2} ${width - 4},1 Z`}
      fill={fill}
      fillOpacity={opacity}
      stroke={INK}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
  )
}

export function SceneTabs({
  scene,
  tab,
  onTab,
  onCompose,
}: {
  scene: SceneName
  tab: BrowseTab
  onTab: (next: BrowseTab) => void
  onCompose: () => void
}) {
  return (
    <g aria-label="手帐分页">
      {TAB_ENTITIES.map((item, index) => {
        const x = 508 + index * 108
        const settled =
          item.kind === "record"
            ? scene === "compose"
            : scene === "browse" && tab === item.kind
        return (
          <SceneHit
            key={item.id}
            id={item.id}
            x={x}
            y={88}
            interactive
            state={settled ? "settle" : "idle"}
            label={item.label}
            onActivate={() => {
              if (item.kind === "record") onCompose()
              else onTab(item.kind)
            }}
          >
            <g transform={`rotate(${item.rotate})`}>
              <TapeMark
                width={100}
                height={32}
                fill={item.fill}
                opacity={settled ? 1 : 0.88}
              />
              <InkText x={50} y={22} size={15} anchor="middle">
                {item.label}
              </InkText>
            </g>
          </SceneHit>
        )
      })}
    </g>
  )
}

export function SceneFooter({
  name,
  onLogout,
}: {
  name: string
  onLogout: () => void
}) {
  return (
    <g>
      <SceneHit id="ink-sign" x={520} y={lineY(20)} state="idle">
        <InkText x={0} y={0} size={16} fill={INK_MUTED}>
          {name}
        </InkText>
      </SceneHit>
      <SceneHit
        id="btn-logout"
        x={1008}
        y={lineY(20) - 22}
        interactive
        label="退出"
        onActivate={onLogout}
      >
        <TapeMark width={72} height={28} fill={PAPER_WASH} />
        <InkText x={36} y={19} size={14} anchor="middle">
          退出
        </InkText>
      </SceneHit>
    </g>
  )
}

function Star({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <g className="sparkle" transform={`translate(${x} ${y}) scale(${size})`}>
      <path
        d="M 0 -9 L 1.6 -1.6 L 9 0 L 1.6 1.6 L 0 9 L -1.6 1.6 L -9 0 L -1.6 -1.6 Z"
        fill="#e8c44a"
        stroke="#c9a227"
        strokeWidth="0.8"
      />
    </g>
  )
}

function GitHubMark() {
  return (
    <path
      fill={INK}
      d="M12 1C5.923 1 1 5.923 1 12c0 4.867 3.149 8.995 7.521 10.437.55.096.756-.233.756-.522 0-.262-.013-1.128-.013-2.049-2.764.509-3.479-.674-3.699-1.292-.124-.317-.66-1.293-1.127-1.554-.385-.207-.936-.715-.014-.729.867-.014 1.486.798 1.693 1.128.99 1.665 2.571 1.196 3.204.907.096-.715.385-1.196.701-1.471-2.448-.275-5.005-1.224-5.005-5.432 0-1.196.426-2.186 1.128-2.956-.111-.275-.496-1.402.11-2.915 0 0 .921-.289 3.024 1.128a10.193 10.193 0 0 1 2.75-.371c.936 0 1.871.123 2.75.371 2.104-1.431 3.025-1.128 3.025-1.128.605 1.513.221 2.64.111 2.915.701.77 1.127 1.747 1.127 2.956 0 4.222-2.571 5.157-5.019 5.432.399.344.743 1.004.743 2.035 0 1.471-.014 2.654-.014 3.025 0 .289.206.632.756.522C19.851 20.995 23 16.854 23 12c0-6.077-4.922-11-11-11Z"
    />
  )
}

export function SceneLanding({ onLogin }: { onLogin: () => void }) {
  return (
    <g>
      <SceneHit id="brand-mark" x={800} y={318} state="idle">
        <Star x={-118} y={-58} size={1.05} />
        <Star x={122} y={-46} size={0.88} />
        <Star x={0} y={-78} size={0.68} />
        <Star x={-92} y={48} size={0.7} />
        <Star x={108} y={52} size={0.78} />
        <InkText x={0} y={18} size={92} anchor="middle" family="title">
          手帐
        </InkText>
      </SceneHit>
      <SceneHit
        id="btn-login"
        x={690}
        y={430}
        interactive
        label="GitHub 登录"
        onActivate={onLogin}
      >
        <rect
          width="220"
          height="52"
          rx="14"
          fill={PAPER_WASH}
          stroke={INK}
          strokeWidth="2.2"
        />
        <g transform="translate(18 13) scale(1.08)">{GitHubMark()}</g>
        <InkText x={128} y={34} size={22} anchor="middle">
          GitHub 登录
        </InkText>
      </SceneHit>
    </g>
  )
}

function SceneWriteButtons({
  onCompose,
  onSeed,
  seeding,
}: {
  onCompose: () => void
  onSeed: () => void
  seeding: boolean
}) {
  return (
    <g>
      <SceneHit
        id="btn-write"
        x={530}
        y={lineY(6) - 22}
        interactive
        label="记一笔"
        onActivate={onCompose}
      >
        <TapeMark width={108} height={34} fill={PAPER_WASH} />
        <InkText x={54} y={23} size={16} anchor="middle">
          记一笔
        </InkText>
      </SceneHit>
      <SceneHit
        id="btn-sample"
        x={656}
        y={lineY(6) - 22}
        interactive
        disabled={seeding}
        state={seeding ? "loading" : "idle"}
        label="载入示例"
        onActivate={onSeed}
      >
        <TapeMark
          width={124}
          height={34}
          fill={seeding ? "#efe4cc" : "transparent"}
        />
        <InkText x={62} y={23} size={16} anchor="middle">
          {seeding ? "载入中…" : "载入示例"}
        </InkText>
      </SceneHit>
    </g>
  )
}

export function SceneEmpty({
  onCompose,
  onSeed,
  seeding,
}: {
  onCompose: () => void
  onSeed: () => void
  seeding: boolean
}) {
  return (
    <g>
      <SceneHit id="ink-empty" x={530} y={lineY(3)} state="show">
        <InkText x={0} y={0} size={22} fill={INK_MUTED}>
          还没有记录
        </InkText>
      </SceneHit>
      <SceneWriteButtons
        onCompose={onCompose}
        onSeed={onSeed}
        seeding={seeding}
      />
    </g>
  )
}

function SceneMuted({ text }: { text: string }) {
  return (
    <InkText x={530} y={lineY(3)} size={18} fill={INK_MUTED}>
      {text}
    </InkText>
  )
}

export function SceneSummary({
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
  if (loading) return <SceneMuted text="读取中…" />
  if (items.length === 0) {
    return (
      <SceneEmpty onCompose={onCompose} onSeed={onSeed} seeding={seeding} />
    )
  }

  const stats: Array<{ label: string; value: number }> = [
    { label: "每月经常", value: totals?.monthlyRecurring ?? 0 },
    { label: "每年经常", value: totals?.yearlyRecurring ?? 0 },
    { label: "本月一次", value: totals?.oneTimeThisMonth ?? 0 },
    { label: "本年一次", value: totals?.oneTimeThisYear ?? 0 },
  ]

  return (
    <g>
      {currencies.length > 1 ? (
        currencies.map((item, index) => (
          <SceneHit
            key={item}
            id={`btn-currency-${item}`}
            x={530 + index * 64}
            y={lineY(1) - 18}
            interactive
            state={item === currency ? "active" : "idle"}
            label={item}
            onActivate={() => onCurrency(item)}
          >
            <rect width="56" height="24" fill="transparent" />
            <InkText
              x={0}
              y={18}
              size={16}
              fill={item === currency ? INK : INK_MUTED}
            >
              {item}
            </InkText>
          </SceneHit>
        ))
      ) : (
        <InkText x={530} y={lineY(1)} size={16} fill={INK_MUTED}>
          {currency}
        </InkText>
      )}
      {stats.map((stat, index) => {
        const col = index % 2
        const row = Math.floor(index / 2)
        const x = 530 + col * 270
        const y = lineY(3 + row * 3)
        return (
          <g key={stat.label}>
            <InkText x={x} y={y} size={15} fill={INK_MUTED}>
              {stat.label}
            </InkText>
            <InkText x={x} y={y + 28} size={26}>
              {formatMoney(stat.value, currency)}
            </InkText>
          </g>
        )
      })}
    </g>
  )
}

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

export function SceneChart({
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
  if (loading) return <SceneMuted text="读取中…" />
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
    <g>
      {slices.length === 0 ? (
        <SceneMuted text="暂无分类数据" />
      ) : (
        <g transform="translate(800 268)">
          {arcs.map((arc) => (
            <path
              key={arc.category}
              d={donutSlice(0, 0, 58, 24, arc.start, arc.end)}
              fill={arc.color}
              stroke={INK}
              strokeWidth="1.6"
            />
          ))}
        </g>
      )}
      {slices.map((slice, index) => (
        <g
          key={slice.category}
          transform={`translate(530 ${lineY(8 + index)})`}
        >
          <rect
            width="12"
            height="12"
            y={-11}
            fill={PIE_COLORS[index % PIE_COLORS.length]}
            stroke={INK}
            strokeWidth="1.4"
          />
          <InkText x={20} y={0} size={15}>
            {categoryLabel(slice.category)}
          </InkText>
          <InkText x={540} y={0} size={15} anchor="end">
            {formatMoney(slice.amountCents, currency)}
          </InkText>
        </g>
      ))}
      {forecast.map((item, index) => {
        const height = (item.amountCents / maxBar) * 72
        const x = 530 + index * 88
        return (
          <g key={item.month} transform={`translate(${x} 720)`}>
            <rect
              x="18"
              y={-height}
              width="28"
              height={Math.max(4, height)}
              fill="#c48a6a"
              stroke={INK}
              strokeWidth="1.6"
            />
            <InkText x={32} y={18} size={12} anchor="middle" fill={INK_MUTED}>
              {item.month.slice(5)}
            </InkText>
          </g>
        )
      })}
    </g>
  )
}

export function SceneList({
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
  if (loading) return <SceneMuted text="读取中…" />
  if (items.length === 0) {
    return (
      <SceneEmpty onCompose={onCompose} onSeed={onSeed} seeding={seeding} />
    )
  }

  return (
    <g>
      {items.slice(0, 16).map((item, index) => (
        <g key={item.id}>
          <SceneHit
            id={`list-${item.id}`}
            x={520}
            y={lineY(1 + index) - 18}
            interactive
            label={item.name}
            onActivate={() => onEdit(item)}
          >
            <rect width="500" height="26" fill="transparent" />
            <InkText x={8} y={18} size={16}>
              {item.name}
            </InkText>
            <InkText x={500} y={18} size={14} fill={INK_MUTED} anchor="end">
              {formatMoney(item.amountCents, item.currency)}
              {" · "}
              {item.type === "recurring" && item.interval
                ? item.interval === "custom"
                  ? `每 ${item.intervalDays} 天`
                  : intervalLabels[item.interval]
                : typeLabels[item.type]}
            </InkText>
          </SceneHit>
          <SceneHit
            id={`list-delete-${item.id}`}
            x={1036}
            y={lineY(1 + index) - 16}
            interactive
            label={`删除 ${item.name}`}
            onActivate={() => onDelete(item)}
          >
            <rect width="40" height="22" fill="transparent" />
            <InkText x={0} y={16} size={13} fill="#8a2f2f">
              删除
            </InkText>
          </SceneHit>
        </g>
      ))}
    </g>
  )
}

export function SceneUpcoming({
  loading,
  charges,
}: {
  loading: boolean
  charges: Array<{
    id: string
    name: string
    date: string
    category: string
    amountCents: number
    currency: Currency
  }>
}) {
  if (loading) return <SceneMuted text="读取中…" />
  if (charges.length === 0) {
    return <SceneMuted text="暂无即将扣费" />
  }

  return (
    <g>
      {charges.slice(0, 14).map((charge, index) => (
        <g
          key={charge.id}
          id={`list-${charge.id}`}
          data-interactive="false"
          data-state="idle"
          transform={`translate(520 ${lineY(1 + index)})`}
        >
          <InkText x={8} y={0} size={16}>
            {charge.name}
          </InkText>
          <InkText x={280} y={0} size={14} fill={INK_MUTED}>
            {charge.date} · {categoryLabel(charge.category)}
          </InkText>
          <InkText x={560} y={0} size={15} anchor="end">
            {formatMoney(charge.amountCents, charge.currency)}
          </InkText>
        </g>
      ))}
    </g>
  )
}

export function SceneComposeHost({ children }: { children: ReactNode }) {
  return (
    <foreignObject id="compose-form" x="508" y="148" width="584" height="540">
      <div className="ink-form-host">{children}</div>
    </foreignObject>
  )
}

export function SceneComposeActions({
  submitting,
  onBack,
  onSave,
}: {
  submitting: boolean
  onBack: () => void
  onSave: () => void
}) {
  return (
    <g>
      <SceneHit
        id="btn-back"
        x={860}
        y={lineY(18) - 8}
        interactive
        label="返回"
        onActivate={onBack}
      >
        <TapeMark width={88} height={30} fill="transparent" />
        <InkText x={44} y={21} size={15} anchor="middle">
          返回
        </InkText>
      </SceneHit>
      <SceneHit
        id="btn-save"
        x={962}
        y={lineY(18) - 8}
        interactive
        disabled={submitting}
        state={submitting ? "act" : "idle"}
        label="保存"
        onActivate={onSave}
      >
        <TapeMark width={88} height={30} fill={PAPER_WASH} />
        <InkText x={44} y={21} size={15} anchor="middle">
          {submitting ? "保存中…" : "保存"}
        </InkText>
      </SceneHit>
    </g>
  )
}

export function ComposeFace({
  form,
  setForm,
  editing,
  onSubmit,
}: {
  form: FormValues
  setForm: Dispatch<SetStateAction<FormValues>>
  editing: boolean
  onSubmit: (event: FormEvent) => void
}) {
  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <form id="ink-form" className="ink-form" onSubmit={onSubmit}>
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
    </form>
  )
}
