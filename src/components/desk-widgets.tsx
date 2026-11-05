import { useState, type ReactNode } from "react"

import {
  CATEGORIES,
  categoryLabels,
  type Category,
  type Currency,
  type Interval,
  type Status,
  type SubscriptionType,
} from "@/lib/catalog"
import {
  EMPTY_INK,
  abbreviateName,
  categorySummaries,
  compactAmount,
  compactDate,
} from "@/lib/desk-ink"

const INK = "#2a2118"
const PAPER = "#f3ead3"
const WOOD_DOT = "#c4a06a"

const CHIP = ["#e27898", "#7eb8d4", "#6a9a4e", "#d4a84b", "#c48a6a", "#8a7bb8"]

const CHIP_SLOTS = [
  { x: -70, y: -40, rot: -18, w: 88, h: 70 },
  { x: 10, y: -48, rot: 8, w: 92, h: 64 },
  { x: 78, y: -8, rot: 16, w: 80, h: 62 },
  { x: -40, y: 28, rot: -8, w: 96, h: 68 },
  { x: 48, y: 36, rot: 6, w: 86, h: 60 },
  { x: -90, y: 8, rot: -22, w: 70, h: 54 },
] as const

export const WIDGET_SLOTS = {
  category: { x: 216, y: 416 },
  subs: { x: 1040, y: 248 },
  charges: { x: 640, y: 608 },
  compose: { x: 320, y: 168 },
} as const

type SubRow = {
  id: string
  name: string
  amountCents: number
  currency: Currency
}

type ChargeRow = {
  id: string
  name: string
  amountCents: number
  currency: Currency
  date: string
}

export type ComposeDraft = {
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

export function CategoryWidget({
  held,
  onPick,
  items,
}: {
  held: boolean
  onPick: () => void
  items: Array<{ category: string }>
}) {
  const [selected, setSelected] = useState<Category | null>(null)
  const summaries = categorySummaries(items)
  const chips =
    summaries.length === 0
      ? [
          {
            category: null as Category | null,
            count: 0,
            label: EMPTY_INK.category,
            slot: CHIP_SLOTS[0],
            fill: "#eadcc0",
          },
        ]
      : summaries.slice(0, CHIP_SLOTS.length).map((row, index) => ({
          category: row.category,
          count: row.count,
          label: held
            ? `${categoryLabels[row.category]} ${row.count}`
            : categoryLabels[row.category],
          slot: CHIP_SLOTS[index],
          fill: CHIP[CATEGORIES.indexOf(row.category) % CHIP.length],
        }))

  return (
    <g
      transform={`translate(${WIDGET_SLOTS.category.x} ${WIDGET_SLOTS.category.y})`}
    >
      <g
        id="widget-category"
        className="desk-widget content-widget"
        data-interactive="true"
        data-state={held ? "held" : "idle"}
        onPointerUp={(event) => {
          event.stopPropagation()
          onPick()
        }}
      >
        {chips.map((chip) => {
          const active = held && chip.category && selected === chip.category
          const originX = chip.slot.x + chip.slot.w / 2
          const originY = chip.slot.y + chip.slot.h / 2
          const scale = held ? 1.08 : 1
          return (
            <g
              key={`${chip.slot.x}-${chip.label}`}
              transform={`rotate(${chip.slot.rot} ${originX} ${originY}) translate(${originX} ${originY}) scale(${scale}) translate(${-originX} ${-originY})`}
              onPointerUp={(event) => {
                if (!held || !chip.category) return
                event.stopPropagation()
                setSelected(chip.category)
              }}
            >
              <rect
                x={chip.slot.x}
                y={chip.slot.y}
                width={chip.slot.w}
                height={chip.slot.h}
                rx="14"
                fill={chip.fill}
                stroke={INK}
                strokeWidth={active ? 3.2 : 2.2}
                filter="url(#widgetShadow)"
              />
              <text
                x={originX}
                y={originY + 5}
                textAnchor="middle"
                fill={INK}
                fontSize={chip.category ? 13 : 12}
                fontFamily="Noto Serif SC, serif"
              >
                {chip.label}
              </text>
            </g>
          )
        })}
        <text
          x="0"
          y="108"
          textAnchor="middle"
          fill={INK}
          fontSize="18"
          fontFamily="Noto Serif SC, serif"
        >
          分类
        </text>
      </g>
    </g>
  )
}

export function SubsWidget({
  held,
  onPick,
  items,
  onEdit,
  onDelete,
}: {
  held: boolean
  onPick: () => void
  items: SubRow[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [page, setPage] = useState(0)
  const pageSize = held ? 3 : 2
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = page % pageCount
  const rows = items.slice(safePage * pageSize, safePage * pageSize + pageSize)

  return (
    <g transform={`translate(${WIDGET_SLOTS.subs.x} ${WIDGET_SLOTS.subs.y})`}>
      <g
        id="widget-subs"
        className="desk-widget content-widget"
        data-interactive="true"
        data-state={held ? "held" : "idle"}
        onPointerUp={(event) => {
          event.stopPropagation()
          onPick()
        }}
      >
        <rect
          x="-78"
          y="-108"
          width="168"
          height="214"
          rx="8"
          fill="#e6d8b8"
          stroke={INK}
          strokeWidth="2.2"
          transform="rotate(7)"
          filter="url(#widgetShadow)"
        />
        <rect
          x="-86"
          y="-100"
          width="168"
          height="214"
          rx="8"
          fill="#eadcc0"
          stroke={INK}
          strokeWidth="2.2"
          transform="rotate(3)"
        />
        <g
          onPointerUp={(event) => {
            if (!held || items.length <= pageSize) return
            event.stopPropagation()
            setPage((current) => (current + 1) % pageCount)
          }}
        >
          <path
            d="M -108,-92 h 18 v 36 h -18 a 8,8 0 0 1 -8,-8 v -20 a 8,8 0 0 1 8,-8 z"
            fill="#7eb8d4"
            stroke={INK}
            strokeWidth="2"
          />
        </g>
        <rect
          x="-96"
          y="-92"
          width="168"
          height="214"
          rx="8"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.4"
          filter="url(#widgetShadow)"
        />
        {rows.length === 0 ? (
          <text
            x="-12"
            y="-20"
            textAnchor="middle"
            fill={INK}
            fontSize="16"
            fontFamily="Noto Serif SC, serif"
          >
            {EMPTY_INK.subs}
          </text>
        ) : (
          rows.map((row, index) => {
            const y = -64 + index * (held ? 42 : 36)
            return (
              <g
                key={row.id}
                onPointerUp={(event) => {
                  if (!held) return
                  event.stopPropagation()
                  onEdit(row.id)
                }}
              >
                <text
                  x="-78"
                  y={y}
                  fill={INK}
                  fontSize={held ? 14 : 15}
                  fontFamily="Noto Serif SC, serif"
                >
                  {abbreviateName(row.name, held ? 9 : 8)}
                </text>
                {held ? (
                  <>
                    <text
                      x="-78"
                      y={y + 16}
                      fill="#5c4a38"
                      fontSize="11"
                      fontFamily="Noto Serif SC, serif"
                    >
                      {compactAmount(row.amountCents, row.currency)}
                    </text>
                    <text
                      x="52"
                      y={y}
                      fill="#8a2f2f"
                      fontSize="12"
                      fontFamily="Noto Serif SC, serif"
                      onPointerUp={(event) => {
                        event.stopPropagation()
                        onDelete(row.id)
                      }}
                    >
                      删
                    </text>
                  </>
                ) : null}
              </g>
            )
          })
        )}
        <text
          x="-12"
          y="150"
          textAnchor="middle"
          fill={INK}
          fontSize="18"
          fontFamily="Noto Serif SC, serif"
        >
          订阅
        </text>
      </g>
    </g>
  )
}

export function ChargesWidget({
  held,
  onPick,
  charges,
}: {
  held: boolean
  onPick: () => void
  charges: ChargeRow[]
}) {
  const fills = ["#f3e3c2", "#eadcc0", "#f6eedc", "#f3ead3", "#eadcc0"]
  const rots = [-2, 1.4, -1, 0.8, -1.2]
  const visible = charges.slice(0, held ? 5 : 3)
  const startY = held ? -58 : -48
  const gap = held ? 28 : 40

  return (
    <g
      transform={`translate(${WIDGET_SLOTS.charges.x} ${WIDGET_SLOTS.charges.y})`}
    >
      <g
        id="widget-charges"
        className="desk-widget content-widget"
        data-interactive="true"
        data-state={held ? "held" : "idle"}
        onPointerUp={(event) => {
          event.stopPropagation()
          onPick()
        }}
      >
        {visible.length === 0 ? (
          <g transform="rotate(-2)" filter="url(#widgetShadow)">
            <rect
              x="-240"
              y="-18"
              width="480"
              height="36"
              rx="6"
              fill="#f3e3c2"
              stroke={INK}
              strokeWidth="2"
            />
            <circle
              cx="-214"
              cy="0"
              r="7"
              fill={WOOD_DOT}
              stroke={INK}
              strokeWidth="1.4"
            />
            <text
              x="0"
              y="6"
              textAnchor="middle"
              fill={INK}
              fontSize="16"
              fontFamily="Noto Serif SC, serif"
            >
              {EMPTY_INK.charges}
            </text>
          </g>
        ) : (
          visible.map((charge, index) => {
            const y = startY + index * gap
            return (
              <g
                key={charge.id}
                transform={`rotate(${rots[index] ?? 0})`}
                filter="url(#widgetShadow)"
              >
                <rect
                  x="-240"
                  y={y}
                  width="480"
                  height={held ? 26 : 34}
                  rx="6"
                  fill={fills[index] ?? PAPER}
                  stroke={INK}
                  strokeWidth="2"
                />
                <circle
                  cx="-214"
                  cy={y + (held ? 13 : 17)}
                  r="7"
                  fill={WOOD_DOT}
                  stroke={INK}
                  strokeWidth="1.4"
                />
                <text
                  x="-196"
                  y={y + (held ? 18 : 22)}
                  fill={INK}
                  fontSize={held ? 13 : 14}
                  fontFamily="Noto Serif SC, serif"
                >
                  {held
                    ? `${abbreviateName(charge.name, 10)}  ${compactDate(charge.date)}  ${compactAmount(charge.amountCents, charge.currency)}`
                    : `${compactDate(charge.date)}   ${compactAmount(charge.amountCents, charge.currency)}`}
                </text>
              </g>
            )
          })
        )}
        <text
          x="0"
          y={held ? 96 : 86}
          textAnchor="middle"
          fill={INK}
          fontSize="18"
          fontFamily="Noto Serif SC, serif"
        >
          扣费
        </text>
      </g>
    </g>
  )
}

export function ComposeWidget({
  held,
  onPick,
  idleLine,
  children,
}: {
  held: boolean
  onPick: () => void
  idleLine: string
  children?: ReactNode
}) {
  return (
    <g
      transform={`translate(${WIDGET_SLOTS.compose.x} ${WIDGET_SLOTS.compose.y})`}
    >
      <g
        id="widget-compose"
        className="desk-widget content-widget"
        data-interactive="true"
        data-state={held ? "held" : "idle"}
        onPointerUp={(event) => {
          event.stopPropagation()
          onPick()
        }}
      >
        <g transform="rotate(-4)" filter="url(#widgetShadow)">
          <rect
            x="-118"
            y="-130"
            width="236"
            height="260"
            rx="6"
            fill="#f5e49a"
            stroke={INK}
            strokeWidth="2.4"
          />
          <rect
            x="-40"
            y="-138"
            width="80"
            height="18"
            rx="2"
            fill="#e8c49a"
            stroke={INK}
            strokeWidth="1.8"
          />
          <path
            d="M -96,-90 h 192 M -96,-70 h 176 M -96,-50 h 184"
            stroke="#d4c37a"
            strokeWidth="1.5"
          />
          {held ? (
            children
          ) : (
            <text
              x="-90"
              y="-84"
              fill={INK}
              fontSize="16"
              fontFamily="Noto Serif SC, serif"
            >
              {idleLine}
            </text>
          )}
        </g>
        <g transform="translate(128 40) rotate(18)">
          <rect
            x="-8"
            y="-70"
            width="16"
            height="110"
            rx="2"
            fill="#5f7f3c"
            stroke={INK}
            strokeWidth="1.8"
          />
          <path
            d="M -8,40 L 0,62 L 8,40 Z"
            fill="#e8c49a"
            stroke={INK}
            strokeWidth="1.6"
          />
        </g>
        <text
          x="-20"
          y="160"
          textAnchor="middle"
          fill={INK}
          fontSize="18"
          fontFamily="Noto Serif SC, serif"
        >
          记一笔
        </text>
      </g>
    </g>
  )
}

function InkChip({
  x,
  y,
  label,
  active,
  onTap,
}: {
  x: number
  y: number
  label: string
  active: boolean
  onTap: () => void
}) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      onPointerUp={(event) => {
        event.stopPropagation()
        onTap()
      }}
    >
      <rect
        x="-22"
        y="-11"
        width="44"
        height="20"
        rx="6"
        fill={active ? "#e8c49a" : "#f6eedc"}
        stroke={INK}
        strokeWidth={active ? 2.2 : 1.4}
      />
      <text
        x="0"
        y="4"
        textAnchor="middle"
        fill={INK}
        fontSize="10"
        fontFamily="Noto Serif SC, serif"
      >
        {label}
      </text>
    </g>
  )
}

export function ComposeHeldInk({
  form,
  editing,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: ComposeDraft
  editing: boolean
  submitting: boolean
  onChange: (patch: Partial<ComposeDraft>) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  const cats = [
    ...CATEGORIES.filter((item) => item === form.category),
    ...CATEGORIES.filter((item) => item !== form.category),
  ].slice(0, 8)
  const nameLine = form.name.trim() || "名称"
  const amountLine =
    Number.isFinite(form.amount) && form.amount > 0
      ? compactAmount(Math.round(form.amount * 100), form.currency)
      : "金额"
  const dateLine = form.chargeDate || "下次扣费"

  return (
    <g>
      <text
        x="-90"
        y="-84"
        fill={INK}
        fontSize="15"
        fontFamily="Noto Serif SC, serif"
      >
        {nameLine}
      </text>
      <text
        x="-90"
        y="-64"
        fill={INK}
        fontSize="15"
        fontFamily="Noto Serif SC, serif"
      >
        {amountLine}
      </text>
      <text
        x="-90"
        y="-44"
        fill={INK}
        fontSize="15"
        fontFamily="Noto Serif SC, serif"
      >
        {dateLine}
      </text>
      <InkChip
        x={-54}
        y={-18}
        label="$"
        active={form.currency === "USD"}
        onTap={() => onChange({ currency: "USD" })}
      />
      <InkChip
        x={-6}
        y={-18}
        label="¥"
        active={form.currency === "CNY"}
        onTap={() => onChange({ currency: "CNY" })}
      />
      <InkChip
        x={42}
        y={-18}
        label="月"
        active={form.interval === "monthly"}
        onTap={() => onChange({ type: "recurring", interval: "monthly" })}
      />
      <InkChip
        x={90}
        y={-18}
        label="年"
        active={form.interval === "yearly"}
        onTap={() => onChange({ type: "recurring", interval: "yearly" })}
      />
      {cats.map((category, index) => (
        <InkChip
          key={category}
          x={-72 + (index % 4) * 48}
          y={12 + Math.floor(index / 4) * 26}
          label={categoryLabels[category].slice(0, 3)}
          active={form.category === category}
          onTap={() => onChange({ category })}
        />
      ))}
      <text
        x="-70"
        y="78"
        fill={INK}
        fontSize="13"
        fontFamily="Noto Serif SC, serif"
        onPointerUp={(event) => {
          event.stopPropagation()
          onCancel()
        }}
      >
        返回
      </text>
      <text
        x="40"
        y="78"
        fill={INK}
        fontSize="13"
        fontFamily="Noto Serif SC, serif"
        onPointerUp={(event) => {
          event.stopPropagation()
          onSubmit()
        }}
      >
        {submitting ? "保存中…" : editing ? "更新" : "保存"}
      </text>
    </g>
  )
}

export function DeskInk({
  visible,
  summary,
  userName,
  onLogout,
}: {
  visible: boolean
  summary: string
  userName?: string
  onLogout: () => void
}) {
  if (!visible) return null
  return (
    <g id="desk-ink" pointerEvents="none">
      <text
        id="desk-ink-total"
        x="640"
        y="51"
        textAnchor="middle"
        fill={INK}
        fontSize="22"
        fontFamily="Ma Shan Zheng, KaiTi, serif"
        opacity="0.72"
      >
        {summary}
      </text>
      {userName ? (
        <g
          id="btn-logout"
          className="desk-widget"
          transform="translate(144 688)"
          pointerEvents="auto"
          onPointerUp={(event) => {
            event.stopPropagation()
            onLogout()
          }}
        >
          <rect
            x="-70"
            y="-18"
            width="140"
            height="32"
            rx="10"
            fill="#f6eedc"
            stroke={INK}
            strokeWidth="2"
          />
          <text
            x="0"
            y="6"
            textAnchor="middle"
            fill={INK}
            fontSize="14"
            fontFamily="Noto Serif SC, serif"
          >
            {userName} · 退出
          </text>
        </g>
      ) : null}
    </g>
  )
}
