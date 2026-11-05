import type { ReactNode } from "react"

const INK = "#2a2118"
const PAPER = "#f3ead3"

const CHIP = ["#e27898", "#7eb8d4", "#6a9a4e", "#d4a84b", "#c48a6a", "#8a7bb8"]

export const WIDGET_SLOTS = {
  login: { x: 800, y: 430 },
  category: { x: 270, y: 520 },
  subs: { x: 1300, y: 310 },
  charges: { x: 800, y: 760 },
  compose: { x: 400, y: 210 },
} as const

function Face({
  x,
  y,
  width,
  height,
  active,
  children,
}: {
  x: number
  y: number
  width: number
  height: number
  active: boolean
  children: ReactNode
}) {
  return (
    <foreignObject
      x={x}
      y={y}
      width={width}
      height={height}
      className={active ? "widget-face is-open" : "widget-face"}
      pointerEvents={active ? "auto" : "none"}
    >
      <div className="widget-face-inner">{children}</div>
    </foreignObject>
  )
}

export function LoginWidget({ children }: { children: ReactNode }) {
  return (
    <g transform={`translate(${WIDGET_SLOTS.login.x} ${WIDGET_SLOTS.login.y})`}>
      <g
        id="widget-login"
        className="desk-widget"
        data-interactive="true"
        data-state="idle"
      >
        <rect
          x="-150"
          y="-118"
          width="300"
          height="236"
          rx="22"
          fill="#f6eedc"
          stroke={INK}
          strokeWidth="2.6"
          filter="url(#widgetShadow)"
        />
        <rect
          x="-138"
          y="-106"
          width="276"
          height="212"
          rx="16"
          fill="none"
          stroke={INK}
          strokeWidth="1.2"
          opacity="0.35"
        />
        <circle cx="0" cy="-48" r="30" fill={INK} />
        <path
          transform="translate(-12 -60) scale(1.05)"
          fill="#f6eedc"
          d="M12 1C5.923 1 1 5.923 1 12c0 4.867 3.149 8.995 7.521 10.437.55.096.756-.233.756-.522 0-.262-.013-1.128-.013-2.049-2.764.509-3.479-.674-3.699-1.292-.124-.317-.66-1.293-1.127-1.554-.385-.207-.936-.715-.014-.729.867-.014 1.486.798 1.693 1.128.99 1.665 2.571 1.196 3.204.907.096-.715.385-1.196.701-1.471-2.448-.275-5.005-1.224-5.005-5.432 0-1.196.426-2.186 1.128-2.956-.111-.275-.496-1.402.11-2.915 0 0 .921-.289 3.024 1.128a10.193 10.193 0 0 1 2.75-.371c.936 0 1.871.123 2.75.371 2.104-1.431 3.025-1.128 3.025-1.128.605 1.513.221 2.64.111 2.915.701.77 1.127 1.747 1.127 2.956 0 4.222-2.571 5.157-5.019 5.432.399.344.743 1.004.743 2.035 0 1.471-.014 2.654-.014 3.025 0 .289.206.632.756.522C19.851 20.995 23 16.854 23 12c0-6.077-4.922-11-11-11Z"
        />
        <text
          id="brand-mark"
          x="0"
          y="12"
          textAnchor="middle"
          fill={INK}
          fontSize="36"
          fontFamily="Ma Shan Zheng, KaiTi, serif"
        >
          手帐
        </text>
        <Face x={-130} y={24} width={260} height={90} active>
          {children}
        </Face>
      </g>
    </g>
  )
}

export function CategoryWidget({
  held,
  onPick,
  children,
}: {
  held: boolean
  onPick: () => void
  children: ReactNode
}) {
  const chips = [
    { x: -70, y: -40, rot: -18, w: 88, h: 70 },
    { x: 10, y: -48, rot: 8, w: 92, h: 64 },
    { x: 78, y: -8, rot: 16, w: 80, h: 62 },
    { x: -40, y: 28, rot: -8, w: 96, h: 68 },
    { x: 48, y: 36, rot: 6, w: 86, h: 60 },
    { x: -90, y: 8, rot: -22, w: 70, h: 54 },
  ]
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
        {chips.map((chip, index) => (
          <rect
            key={chip.x}
            x={chip.x}
            y={chip.y}
            width={chip.w}
            height={chip.h}
            rx="14"
            transform={`rotate(${chip.rot} ${chip.x + chip.w / 2} ${chip.y + chip.h / 2})`}
            fill={CHIP[index % CHIP.length]}
            stroke={INK}
            strokeWidth="2.2"
            filter="url(#widgetShadow)"
          />
        ))}
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
        <Face x={-120} y={-90} width={250} height={200} active={held}>
          {children}
        </Face>
      </g>
    </g>
  )
}

export function SubsWidget({
  held,
  onPick,
  children,
}: {
  held: boolean
  onPick: () => void
  children: ReactNode
}) {
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
        <path
          d="M -108,-92 h 18 v 36 h -18 a 8,8 0 0 1 -8,-8 v -20 a 8,8 0 0 1 8,-8 z"
          fill="#7eb8d4"
          stroke={INK}
          strokeWidth="2"
        />
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
        <path
          d="M -78,-70 h 132 M -78,-48 h 118 M -78,-26 h 124"
          stroke="#d5c7ae"
          strokeWidth="1.6"
        />
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
        <Face x={-90} y={-80} width={156} height={190} active={held}>
          {children}
        </Face>
      </g>
    </g>
  )
}

export function ChargesWidget({
  held,
  onPick,
  children,
}: {
  held: boolean
  onPick: () => void
  children: ReactNode
}) {
  const strips = [
    { y: -48, fill: "#f3e3c2", rot: -2 },
    { y: -8, fill: "#eadcc0", rot: 1.4 },
    { y: 32, fill: "#f6eedc", rot: -1 },
  ]
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
        {strips.map((strip) => (
          <g
            key={strip.y}
            transform={`rotate(${strip.rot})`}
            filter="url(#widgetShadow)"
          >
            <rect
              x="-240"
              y={strip.y}
              width="480"
              height="34"
              rx="6"
              fill={strip.fill}
              stroke={INK}
              strokeWidth="2"
            />
            <circle
              cx="-214"
              cy={strip.y + 17}
              r="7"
              fill={WOOD_DOT}
              stroke={INK}
              strokeWidth="1.4"
            />
          </g>
        ))}
        <text
          x="0"
          y="86"
          textAnchor="middle"
          fill={INK}
          fontSize="18"
          fontFamily="Noto Serif SC, serif"
        >
          扣费
        </text>
        <Face x={-230} y={-58} width={460} height={120} active={held}>
          {children}
        </Face>
      </g>
    </g>
  )
}

const WOOD_DOT = "#c4a06a"

export function ComposeWidget({
  held,
  onPick,
  children,
}: {
  held: boolean
  onPick: () => void
  children: ReactNode
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
        <Face x={-108} y={-118} width={216} height={236} active={held}>
          {children}
        </Face>
      </g>
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
        x="800"
        y="64"
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
          transform="translate(800 860)"
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
