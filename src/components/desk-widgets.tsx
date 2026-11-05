import { useRef, type ReactNode } from "react"

import { CATEGORIES, categoryLabels, type Currency } from "@/lib/catalog"
import {
  EMPTY_INK,
  abbreviateName,
  categorySummaries,
  compactAmount,
  compactDate,
} from "@/lib/desk-ink"
import {
  AUTH_WIDGET_IDS,
  WIDGET_SCENE_IDS,
  type AuthWidgetId,
} from "@/lib/widget-machine"
import {
  AUTH_GITHUB_FACE,
  AUTH_SLOTS,
  SESSION_FACE,
  SESSION_SLOT,
  isDrag,
} from "@/lib/widget-motion"
import type { WidgetSlot } from "@/lib/widget-slots"

const INK = "#2a2118"
const PAPER = "#f3ead3"
const WOOD_DOT = "#c4a06a"
/** SVG user units on the 1280×800 stage: 小 / 中 / 大. */
const DESK_TYPE = { sm: 13, md: 16, lg: 18 } as const

function deskType(size: (typeof DESK_TYPE)[keyof typeof DESK_TYPE]) {
  return {
    fill: INK,
    fontSize: size,
    fontFamily: "'LXGW WenKai'",
    fontWeight: 400,
  }
}

const CHIP = ["#e27898", "#7eb8d4", "#6a9a4e", "#d4a84b", "#c48a6a", "#8a7bb8"]

const CHIP_SLOTS = [
  { x: -70, y: -40, rot: -18, w: 88, h: 70 },
  { x: 10, y: -48, rot: 8, w: 92, h: 64 },
  { x: 78, y: -8, rot: 16, w: 80, h: 62 },
  { x: -40, y: 28, rot: -8, w: 96, h: 68 },
  { x: 48, y: 36, rot: 6, w: 86, h: 60 },
  { x: -90, y: 8, rot: -22, w: 70, h: 54 },
] as const

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

export function CategoryWidget({
  slot,
  items,
}: {
  slot: WidgetSlot
  items: Array<{ category: string }>
}) {
  const summaries = categorySummaries(items)
  const chips =
    summaries.length === 0
      ? [
          {
            category: null,
            count: 0,
            label: EMPTY_INK.category,
            slot: CHIP_SLOTS[0],
            fill: "#eadcc0",
          },
        ]
      : summaries.slice(0, CHIP_SLOTS.length).map((row, index) => ({
          category: row.category,
          count: row.count,
          label: `${categoryLabels[row.category]} ${row.count}`,
          slot: CHIP_SLOTS[index],
          fill: CHIP[CATEGORIES.indexOf(row.category) % CHIP.length],
        }))

  return (
    <g id="widget-category-slot" transform={`translate(${slot.x} ${slot.y})`}>
      <g
        id="widget-category"
        className="desk-widget content-widget"
        data-interactive="true"
        data-state="idle"
      >
        {chips.map((chip) => {
          const originX = chip.slot.x + chip.slot.w / 2
          const originY = chip.slot.y + chip.slot.h / 2
          return (
            <g
              key={`${chip.slot.x}-${chip.label}`}
              transform={`rotate(${chip.slot.rot} ${originX} ${originY})`}
            >
              <rect
                x={chip.slot.x}
                y={chip.slot.y}
                width={chip.slot.w}
                height={chip.slot.h}
                rx="14"
                fill={chip.fill}
                stroke={INK}
                strokeWidth="2.2"
                className="ink-shadow"
              />
              <text
                x={originX}
                y={originY + 5}
                textAnchor="middle"
                {...deskType(DESK_TYPE.sm)}
              >
                {chip.label}
              </text>
            </g>
          )
        })}
      </g>
    </g>
  )
}

export function SubsWidget({
  slot,
  items,
  monthly,
}: {
  slot: WidgetSlot
  items: SubRow[]
  monthly: string
}) {
  const rows = items.slice(0, 3)

  return (
    <g id="widget-subs-slot" transform={`translate(${slot.x} ${slot.y})`}>
      <g
        id="widget-subs"
        className="desk-widget content-widget"
        data-interactive="true"
        data-state="idle"
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
          className="ink-shadow"
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
        <g>
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
          className="ink-shadow"
        />
        {rows.length === 0 ? (
          <text x="-12" y="-20" textAnchor="middle" {...deskType(DESK_TYPE.md)}>
            {EMPTY_INK.subs}
          </text>
        ) : (
          rows.map((row, index) => {
            const y = -64 + index * 36
            return (
              <text key={row.id} x="-78" y={y} {...deskType(DESK_TYPE.md)}>
                {abbreviateName(row.name, 8)}
              </text>
            )
          })
        )}
        <text
          id="subs-monthly"
          x="-12"
          y="96"
          textAnchor="middle"
          {...deskType(DESK_TYPE.lg)}
        >
          {monthly}
        </text>
      </g>
    </g>
  )
}

export function ChargesWidget({
  slot,
  charges,
}: {
  slot: WidgetSlot
  charges: ChargeRow[]
}) {
  const fills = ["#f3e3c2", "#eadcc0", "#f6eedc", "#f3ead3", "#eadcc0"]
  const rots = [-2, 1.4, -1, 0.8, -1.2]
  const visible = charges.slice(0, 3)
  const startY = -48
  const gap = 40

  return (
    <g id="widget-charges-slot" transform={`translate(${slot.x} ${slot.y})`}>
      <g
        id="widget-charges"
        className="desk-widget content-widget"
        data-interactive="true"
        data-state="idle"
      >
        {visible.length === 0 ? (
          <g transform="rotate(-2)" className="ink-shadow">
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
            <text x="0" y="6" textAnchor="middle" {...deskType(DESK_TYPE.md)}>
              {EMPTY_INK.charges}
            </text>
          </g>
        ) : (
          visible.map((charge, index) => {
            const y = startY + index * gap
            return (
              <g
                key={charge.id}
                transform={`rotate(${rots[index]})`}
                className="ink-shadow"
              >
                <rect
                  x="-240"
                  y={y}
                  width="480"
                  height={34}
                  rx="6"
                  fill={fills[index]}
                  stroke={INK}
                  strokeWidth="2"
                />
                <circle
                  cx="-214"
                  cy={y + 17}
                  r="7"
                  fill={WOOD_DOT}
                  stroke={INK}
                  strokeWidth="1.4"
                />
                <text x="-196" y={y + 22} {...deskType(DESK_TYPE.md)}>
                  {`${compactDate(charge.date)}   ${compactAmount(charge.amountCents, charge.currency)}`}
                </text>
              </g>
            )
          })
        )}
      </g>
    </g>
  )
}

export function ComposeWidget({
  slot,
  idleLine,
}: {
  slot: WidgetSlot
  idleLine: string
}) {
  return (
    <g id="widget-compose-slot" transform={`translate(${slot.x} ${slot.y})`}>
      <g
        id="widget-compose"
        className="desk-widget content-widget"
        data-interactive="true"
        data-state="idle"
      >
        <g transform="rotate(-4)" className="ink-shadow">
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
          <text x="-90" y="-84" {...deskType(DESK_TYPE.md)}>
            {idleLine}
          </text>
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
      </g>
    </g>
  )
}

export function SessionWidget({
  name,
  onLogout,
}: {
  name: string
  onLogout: () => void
}) {
  const down = useRef<{ x: number; y: number } | null>(null)
  return (
    <g
      id="widget-session-slot"
      transform={`translate(${SESSION_SLOT.x} ${SESSION_SLOT.y})`}
    >
      <g
        id="widget-session"
        className="desk-widget session-widget"
        role="button"
        tabIndex={0}
        aria-label={`${name} 退出`}
        pointerEvents="auto"
        onPointerDown={(event) => {
          down.current = { x: event.clientX, y: event.clientY }
        }}
        onPointerUp={(event) => {
          event.stopPropagation()
          const origin = down.current
          down.current = null
          if (!origin) return
          const distance = Math.hypot(
            event.clientX - origin.x,
            event.clientY - origin.y
          )
          if (isDrag(distance)) return
          onLogout()
        }}
      >
        <rect
          className="ink-shadow"
          width={SESSION_FACE.w}
          height={SESSION_FACE.h}
          rx="6"
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.2"
        />
        <text
          x={SESSION_FACE.w / 2}
          y="26"
          textAnchor="middle"
          {...deskType(DESK_TYPE.lg)}
        >
          {abbreviateName(name, 12)}
        </text>
        <text
          x={SESSION_FACE.w / 2}
          y="46"
          textAnchor="middle"
          {...deskType(DESK_TYPE.sm)}
        >
          退出
        </text>
      </g>
    </g>
  )
}

const GITHUB_MARK =
  "M12 1C5.923 1 1 5.923 1 12c0 4.867 3.149 8.995 7.521 10.437.55.096.756-.233.756-.522 0-.262-.013-1.128-.013-2.049-2.764.509-3.479-.674-3.699-1.292-.124-.317-.66-1.293-1.127-1.554-.385-.207-.936-.715-.014-.729.867-.014 1.486.798 1.693 1.128.99 1.665 2.571 1.196 3.204.907.096-.715.385-1.196.701-1.471-2.448-.275-5.005-1.224-5.005-5.432 0-1.196.426-2.186 1.128-2.956-.111-.275-.496-1.402.11-2.915 0 0 .921-.289 3.024 1.128a10.193 10.193 0 0 1 2.75-.371c.936 0 1.871.123 2.75.371 2.104-1.431 3.025-1.128 3.025-1.128.605 1.513.221 2.64.111 2.915.701.77 1.127 1.747 1.127 2.956 0 4.222-2.571 5.157-5.019 5.432.399.344.743 1.004.743 2.035 0 1.471-.014 2.654-.014 3.025 0 .289.206.632.756.522C19.851 20.995 23 16.854 23 12c0-6.077-4.922-11-11-11Z"

function AuthGithubWidget({ onLogin }: { onLogin: () => void }) {
  const slot = AUTH_SLOTS.github
  return (
    <g
      id={`${WIDGET_SCENE_IDS.github}-slot`}
      transform={`translate(${slot.x} ${slot.y})`}
    >
      <g
        id={WIDGET_SCENE_IDS.github}
        className="desk-widget auth-widget"
        data-interactive="true"
        data-state="idle"
        role="button"
        tabIndex={0}
        aria-label="GitHub 登录"
        pointerEvents="auto"
        onPointerUp={(event) => {
          event.stopPropagation()
          onLogin()
        }}
      >
        <rect
          className="ink-shadow"
          width={AUTH_GITHUB_FACE.w}
          height={AUTH_GITHUB_FACE.h}
          rx="14"
          fill="#f6eedc"
          stroke={INK}
          strokeWidth="2.2"
        />
        <path transform="translate(28 20)" fill={INK} d={GITHUB_MARK} />
        <text
          x="128"
          y="40"
          textAnchor="middle"
          fill={INK}
          fontSize="16"
          fontFamily="Klee One, cursive"
          fontWeight="700"
        >
          GitHub 登录
        </text>
      </g>
    </g>
  )
}

export function renderAuthWidget(
  id: AuthWidgetId,
  onLogin: () => void
): ReactNode {
  switch (id) {
    case "github":
      return <AuthGithubWidget key={id} onLogin={onLogin} />
    default: {
      const _never: never = id
      return _never
    }
  }
}

export function AuthLayer({ onLogin }: { onLogin: () => void }) {
  return (
    <g id="auth-layer">
      {AUTH_WIDGET_IDS.map((id) => renderAuthWidget(id, onLogin))}
    </g>
  )
}
