import type { ButtonHTMLAttributes } from "react"

const STROKE = "#D9CFC0"
const TEA = "#C4A484"
const PAPER = "#F4EFE6"
const LABEL_FONT = "Noto Serif SC, Songti SC, Georgia, serif"

type PaperTab = "summary" | "chart" | "list" | "upcoming" | "compose"

type TabMark = {
  mode: PaperTab
  label: string
  rotate: string
  fill: string
  d: string
}

const TAB_MARKS: Record<PaperTab, TabMark> = {
  summary: {
    mode: "summary",
    label: "总览",
    rotate: "rotate(-1.5 38 15)",
    fill: "#F0E8DA",
    d: "M3.8 5.8C4.6 3.2 9.2 2 16 1.8L62 1.5C68.5 1.4 72.2 3.2 72.8 6.8L73.6 22.8C73.9 26.2 70.5 28.4 63.5 28.6L12.2 29C6.2 29.2 3.1 26.8 2.9 23.2L3.8 5.8Z",
  },
  chart: {
    mode: "chart",
    label: "分类",
    rotate: "rotate(1.2 38 15)",
    fill: "#EDE6D6",
    d: "M4.2 6.2C5.1 3.5 10 2.2 17 2L61.5 1.7C68 1.6 72 3.5 72.5 7.1L73.2 23C73.5 26.4 70 28.5 63 28.7L13 29.1C6.8 29.3 3.4 26.9 3.2 23.4L4.2 6.2Z",
  },
  list: {
    mode: "list",
    label: "订阅",
    rotate: "rotate(-0.8 38 15)",
    fill: "#F2EAD8",
    d: "M3.5 5.5C4.4 3 9.5 1.9 16.5 1.7L63 1.4C69.2 1.3 72.8 3.2 73.3 6.9L74 23.2C74.3 26.5 70.8 28.6 64 28.8L11.5 29.2C5.8 29.4 2.8 26.9 2.6 23.3L3.5 5.5Z",
  },
  upcoming: {
    mode: "upcoming",
    label: "扣费",
    rotate: "rotate(1.6 38 15)",
    fill: "#EFE7D4",
    d: "M4 6C4.9 3.4 10.2 2.1 17.2 1.9L62 1.6C68.4 1.5 72.2 3.4 72.7 7L73.4 22.9C73.7 26.3 70.2 28.4 63.2 28.6L12.8 29C6.5 29.2 3.2 26.7 3 23.2L4 6Z",
  },
  compose: {
    mode: "compose",
    label: "记一笔",
    rotate: "rotate(-1.1 38 15)",
    fill: "#F1E9D9",
    d: "M3.6 5.9C4.5 3.3 9.8 2 16.8 1.8L62.5 1.5C68.8 1.4 72.5 3.3 73 7L73.7 23.1C74 26.4 70.5 28.5 63.6 28.7L12 29.1C6 29.3 2.9 26.8 2.7 23.3L3.6 5.9Z",
  },
}

export const TECHO_TABS: Array<{ mode: PaperTab; label: string }> = [
  TAB_MARKS.summary,
  TAB_MARKS.chart,
  TAB_MARKS.list,
  TAB_MARKS.upcoming,
  TAB_MARKS.compose,
].map(({ mode, label }) => ({ mode, label }))

type MarkButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type"
>

function markClass(base: string, extra?: string) {
  return extra ? `${base} ${extra}` : base
}

export function TechoTabButton({
  mode,
  active,
  className,
  ...props
}: MarkButtonProps & { mode: PaperTab; active: boolean }) {
  const tab = TAB_MARKS[mode]
  return (
    <button
      type="button"
      className={markClass("techo-mark techo-tab", className)}
      aria-pressed={active}
      aria-current={active ? "page" : undefined}
      aria-label={tab.label}
      data-active={active ? "true" : undefined}
      {...props}
    >
      <svg
        viewBox="0 0 76 30"
        width="76"
        height="30"
        fill="none"
        aria-hidden="true"
        overflow="visible"
      >
        <g transform={tab.rotate}>
          <path
            d={tab.d}
            fill={tab.fill}
            stroke={STROKE}
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </g>
        <text
          x="38"
          y="18.5"
          textAnchor="middle"
          fontFamily={LABEL_FONT}
          fontSize="11"
          fill="currentColor"
        >
          {tab.label}
        </text>
      </svg>
    </button>
  )
}

export function TechoWriteButton({
  label = "记一笔",
  className,
  ...props
}: MarkButtonProps & { label?: string }) {
  return (
    <button
      type="button"
      className={markClass("techo-mark techo-btn techo-btn-write", className)}
      aria-label={label}
      {...props}
    >
      <svg
        viewBox="0 0 128 46"
        width="128"
        height="46"
        fill="none"
        aria-hidden="true"
        overflow="visible"
      >
        <path
          d="M8.5 9.2C11 5.2 24 3.6 42 3.3L98 3C112 2.8 119.5 5.8 121 11.2L122.5 32C123 37.5 114.5 41.5 96 42L30 42.5C14 42.9 6 38.8 5.2 32.5L8.5 9.2Z"
          fill="#F0E8DA"
          stroke={STROKE}
          strokeWidth="1.05"
          strokeLinejoin="round"
        />
        <path
          d="M14 38C36 39.8 78 39.5 108 37.5"
          stroke={TEA}
          strokeWidth="0.7"
          strokeLinecap="round"
          opacity="0.35"
        />
        <text
          x="64"
          y="27"
          textAnchor="middle"
          fontFamily={LABEL_FONT}
          fontSize="14"
          fill="currentColor"
        >
          {label}
        </text>
      </svg>
    </button>
  )
}

export function TechoSampleButton({
  label = "载入示例",
  className,
  ...props
}: MarkButtonProps & { label?: string }) {
  return (
    <button
      type="button"
      className={markClass("techo-mark techo-btn techo-btn-sample", className)}
      aria-label={label}
      {...props}
    >
      <svg
        viewBox="0 0 128 46"
        width="128"
        height="46"
        fill="none"
        aria-hidden="true"
        overflow="visible"
      >
        <path
          d="M9 10C11.8 5.8 26 4 44 3.7L96 3.4C110 3.2 117 6.2 118.5 11.5L119.8 31.5C120.3 37 112 40.8 94 41.2L32 41.8C15 42.2 6.5 38 5.8 32L9 10Z"
          fill={PAPER}
          stroke={STROKE}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <text
          x="64"
          y="27"
          textAnchor="middle"
          fontFamily={LABEL_FONT}
          fontSize="14"
          fill="currentColor"
        >
          {label}
        </text>
      </svg>
    </button>
  )
}

export function TechoBrandMark({ name = "MunMunMiao" }: { name?: string }) {
  return (
    <span className="techo-brand">
      <svg
        viewBox="0 0 168 40"
        width="168"
        height="40"
        fill="none"
        aria-hidden="true"
        overflow="visible"
      >
        <text
          x="6"
          y="24"
          fontFamily="Georgia, Times New Roman, Noto Serif SC, serif"
          fontSize="17"
          fontStyle="italic"
          fill="currentColor"
          letterSpacing="0.5"
        >
          {name}
        </text>
        <path
          d="M5 30.5C22 33 55 34.2 92 33.5C120 32.9 148 30.8 160 28.5"
          stroke={STROKE}
          strokeWidth="1.15"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M8 31.2C30 32.8 70 33.5 110 32.2"
          stroke={TEA}
          strokeWidth="0.6"
          strokeLinecap="round"
          opacity="0.4"
        />
        <circle cx="162" cy="28" r="1.2" fill="currentColor" opacity="0.4" />
      </svg>
    </span>
  )
}

export function TechoLogoutButton({
  label = "退出",
  className,
  ...props
}: MarkButtonProps & { label?: string }) {
  return (
    <button
      type="button"
      className={markClass("techo-mark techo-logout", className)}
      aria-label={label}
      {...props}
    >
      <svg
        viewBox="0 0 60 30"
        width="60"
        height="30"
        fill="none"
        aria-hidden="true"
        overflow="visible"
      >
        <path
          d="M7.2 7C9 4.5 16.5 3.2 26 3.1L44 3.4C52 3.6 54.5 6.2 54 11L53.2 20.5C52.7 25 48.5 27.2 39.5 27.4L17 27.2C9.5 27 5.8 24.2 6.1 19.2L7.2 7Z"
          fill={PAPER}
          stroke={STROKE}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <text
          x="30"
          y="18.5"
          textAnchor="middle"
          fontFamily={LABEL_FONT}
          fontSize="12"
          fill="currentColor"
        >
          {label}
        </text>
      </svg>
    </button>
  )
}
