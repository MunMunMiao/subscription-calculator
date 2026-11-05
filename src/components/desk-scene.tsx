import type { ReactNode } from "react"

const INK = "#2a2118"
const PAPER = "#f3ead3"
const PAPER_BACK = "#e6d8b8"
const WOOD = "#c4a06a"

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

function buildWood() {
  const rand = rng(20261103)
  const grains: Array<{ d: string; opacity: number; width: number }> = []
  for (let i = 0; i < 58; i++) {
    const y0 = -30 + i * 16.2 + rand() * 7
    let d = `M -40 ${y0.toFixed(1)}`
    let x = -40
    let y = y0
    while (x < 1640) {
      const nx = x + 90 + rand() * 50
      const ny = y + (rand() - 0.48) * 16
      const cx = (x + nx) / 2
      const cy = y + (rand() - 0.5) * 20
      d += ` Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`
      x = nx
      y = ny
    }
    grains.push({
      d,
      opacity: 0.16 + rand() * 0.22,
      width: 0.8 + rand() * 1.6,
    })
  }

  const knots = Array.from({ length: 9 }, () => ({
    cx: 80 + rand() * 1440,
    cy: 60 + rand() * 780,
    rx: 14 + rand() * 22,
    ry: 9 + rand() * 14,
    rot: rand() * 80 - 40,
  }))

  const stains = Array.from({ length: 12 }, () => ({
    cx: 40 + rand() * 1520,
    cy: 30 + rand() * 840,
    rx: 40 + rand() * 120,
    ry: 18 + rand() * 50,
    rot: rand() * 60 - 30,
    opacity: 0.04 + rand() * 0.07,
  }))

  return { grains, knots, stains }
}

const WOOD_MARKS = buildWood()

function Heart({ fill = "#e27898" }: { fill?: string }) {
  return (
    <path
      d="M0,-8 C-6,-18 -22,-8 -14,4 C-8,12 0,18 0,18 C0,18 8,12 14,4 C22,-8 6,-18 0,-8 Z"
      fill={fill}
      stroke={INK}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
  )
}

function Pencil() {
  return (
    <g
      id="prop-pen"
      className="desk-prop"
      data-interactive="false"
      data-state="idle"
      transform="translate(168 118)"
    >
      <g className="scene-pose">
        <g className="entity-motion">
          <g className="pencil" transform="rotate(-42)">
            <path
              d="M -10,78 L 0,108 L 10,78 Z"
              fill="#e8c49a"
              stroke={INK}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path d="M -3.2,96 L 0,108 L 3.2,96 Z" fill="#2b2b2b" />
            <path
              d="M -11,-52 L -11,78 Q 0,82 11,78 L 11,-52 Z"
              fill="#5f7f3c"
              stroke={INK}
              strokeWidth="2.3"
              strokeLinejoin="round"
            />
            <path d="M -6,-48 L -6,74" stroke="#4e6c32" strokeWidth="1.2" />
            <path d="M 6,-48 L 6,74" stroke="#4e6c32" strokeWidth="1.2" />
            <rect
              x="-13"
              y="-68"
              width="26"
              height="18"
              rx="2"
              fill="#d7a84c"
              stroke={INK}
              strokeWidth="2.2"
            />
            <path
              d="M -11,-64 H 11 M -11,-58 H 11 M -11,-53 H 11"
              stroke="#b8862e"
              strokeWidth="1"
            />
            <path
              d="M -12,-86 Q -12,-94 0,-94 Q 12,-94 12,-86 L 12,-68 L -12,-68 Z"
              fill="#f0b3c6"
              stroke={INK}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <g transform="translate(28 -92) rotate(18) scale(1.15)">
              <Heart />
            </g>
          </g>
        </g>
      </g>
    </g>
  )
}

function PolkaWashi() {
  const dots = [
    [10, 12],
    [28, 10],
    [46, 14],
    [16, 28],
    [34, 26],
    [8, 42],
    [26, 44],
    [44, 40],
    [18, 58],
    [38, 56],
  ]
  return (
    <g
      id="prop-tape"
      className="desk-prop polka-washi"
      data-interactive="true"
      data-state="idle"
      role="button"
      tabIndex={0}
      aria-label="波点胶带"
      transform="translate(78 292) rotate(-18)"
    >
      <g className="scene-pose">
        <g className="entity-motion">
          <path
            d="M 4,8 L 58,2 L 62,68 L 50,72 L 44,66 L 8,74 Z"
            fill="#ef9db3"
            stroke={INK}
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          {dots.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="3.4" fill="#f7f1e6" />
          ))}
        </g>
      </g>
    </g>
  )
}

function Flower({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="-4" cy="-1" r="3.2" fill={fill} />
      <circle cx="4" cy="-1" r="3.2" fill={fill} />
      <circle cx="0" cy="4" r="3.2" fill={fill} />
      <circle
        cx="0"
        cy="0"
        r="2.1"
        fill="#f2d36b"
        stroke={INK}
        strokeWidth="0.8"
      />
    </g>
  )
}

function FloralRoll() {
  return (
    <g
      id="prop-tape-floral"
      className="desk-prop floral-roll"
      data-interactive="true"
      data-state="idle"
      role="button"
      tabIndex={0}
      aria-label="碎花胶带"
      transform="translate(118 682) rotate(-12)"
    >
      <g className="scene-pose">
        <g className="entity-motion">
          <ellipse
            cx="6"
            cy="10"
            rx="46"
            ry="44"
            fill="#d9c7a1"
            stroke={INK}
            strokeWidth="2.2"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="46"
            ry="44"
            fill="#f6ecd8"
            stroke={INK}
            strokeWidth="2.4"
          />
          <Flower x={-18} y={-16} fill="#e8899c" />
          <Flower x={20} y={-10} fill="#7eb3d6" />
          <Flower x={8} y={16} fill="#e8899c" />
          <ellipse
            cx="-22"
            cy="14"
            rx="7"
            ry="3.6"
            fill="#6a9a4e"
            stroke={INK}
            strokeWidth="1.2"
            transform="rotate(-28 -22 14)"
          />
          <ellipse
            cx="26"
            cy="12"
            rx="6.5"
            ry="3.2"
            fill="#6a9a4e"
            stroke={INK}
            strokeWidth="1.2"
            transform="rotate(32 26 12)"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="16"
            ry="15"
            fill="#efe4cc"
            stroke={INK}
            strokeWidth="2"
          />
          <ellipse
            cx="0"
            cy="0"
            rx="8"
            ry="7.5"
            fill="#d7c4a0"
            stroke={INK}
            strokeWidth="1.6"
          />
        </g>
      </g>
    </g>
  )
}

function Clip({
  x,
  y,
  rotation,
  color,
}: {
  x: number
  y: number
  rotation: number
  color: string
}) {
  return (
    <g
      className="desk-prop clip"
      transform={`translate(${x} ${y}) rotate(${rotation})`}
    >
      <path
        d="M 7,-26
           v 36
           a 9,9 0 0 1 -18,0
           v -46
           a 9,9 0 0 1 18,0
           v 32
           a 4.5,4.5 0 0 1 -9,0
           v -26"
        fill="none"
        stroke={color}
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

function Mug() {
  return (
    <g
      id="prop-cup"
      className="desk-prop mug"
      data-interactive="false"
      data-state="steam"
      transform="translate(1310 92)"
    >
      <g className="scene-pose">
        <g className="entity-motion">
          <ellipse
            cx="8"
            cy="118"
            rx="78"
            ry="14"
            fill="#8d6a3a"
            opacity="0.22"
          />
          <path
            d="M 78,28 C 118,32 124,92 86,108"
            fill="none"
            stroke={INK}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 78,28 C 118,32 124,92 86,108"
            fill="none"
            stroke="#f6f1e6"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <g transform="translate(108 48) rotate(16) scale(0.72)">
            <Heart />
          </g>
          <path
            d="M -70,18 Q -78,70 -62,112 Q 0,128 62,112 Q 76,70 70,18 Z"
            fill="#f4efe4"
            stroke={INK}
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <ellipse
            cx="0"
            cy="18"
            rx="72"
            ry="22"
            fill="#efe8da"
            stroke={INK}
            strokeWidth="2.4"
          />
          <ellipse
            cx="0"
            cy="20"
            rx="54"
            ry="14"
            fill="#6a4024"
            stroke={INK}
            strokeWidth="1.8"
          />
          <path
            d="M -18,18 Q 0,8 16,22 Q 4,26 -8,20"
            fill="none"
            stroke="#c9a07a"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <g className="cat-face" transform="translate(0 70)">
            <path
              d="M -20,-8 L -14,-16 L -8,-8"
              fill="none"
              stroke={INK}
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 8,-8 L 14,-16 L 20,-8"
              fill="none"
              stroke={INK}
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M -3,2 L 0,6 L 3,2"
              fill="none"
              stroke={INK}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M -9,12 L -4,8 L 0,12 L 4,8 L 9,12"
              fill="none"
              stroke={INK}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M -22,4 L -36,-2 M -22,8 L -36,10 M -20,12 L -34,18"
              stroke={INK}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M 22,4 L 36,-2 M 22,8 L 36,10 M 20,12 L 34,18"
              stroke={INK}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
        </g>
      </g>
    </g>
  )
}

function Plant() {
  return (
    <g
      id="prop-plant"
      className="desk-prop plant"
      data-interactive="false"
      data-state="breathe"
      transform="translate(1324 430)"
    >
      <g className="scene-pose">
        <g className="entity-motion">
          <ellipse
            cx="4"
            cy="168"
            rx="70"
            ry="12"
            fill="#8d6a3a"
            opacity="0.2"
          />
          <path
            d="M -62,40 Q -70,120 -48,168 Q 4,186 56,168 Q 74,118 64,40 Q 4,22 -62,40 Z"
            fill="#f3ead8"
            stroke={INK}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M -6,70 Q 8,90 2,118 Q -10,142 8,156"
            fill="none"
            stroke={INK}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <g className="plant-leaves">
            <path
              className="plant-leaf"
              d="M -6,36 C -38,-28 -4,-78 12,-12 C 16,12 8,34 -6,36 Z"
              fill="#5f8a45"
              stroke={INK}
              strokeWidth="2.2"
            />
            <path
              className="plant-leaf"
              d="M 4,28 C 8,-36 58,-48 44,-2 C 36,18 14,34 4,28 Z"
              fill="#6a984c"
              stroke={INK}
              strokeWidth="2.2"
            />
            <path
              className="plant-leaf"
              d="M 10,32 C 28,-16 86,-8 62,28 C 48,44 22,42 10,32 Z"
              fill="#6f9b52"
              stroke={INK}
              strokeWidth="2.2"
            />
            <path
              className="plant-leaf"
              d="M 14,42 C 52,10 96,42 50,68 C 30,76 12,56 14,42 Z"
              fill="#4e7a38"
              stroke={INK}
              strokeWidth="2.2"
            />
            <path
              className="plant-leaf"
              d="M -10,42 C -68,8 -72,70 -22,74 C -6,74 2,54 -10,42 Z"
              fill="#7eaa5c"
              stroke={INK}
              strokeWidth="2.2"
            />
            <path
              className="plant-leaf"
              d="M -2,24 C -28,-20 -4,-58 14,-18 C 22,4 10,26 -2,24 Z"
              fill="#557e3c"
              stroke={INK}
              strokeWidth="2.1"
            />
            <path
              className="plant-leaf"
              d="M 22,36 C 48,8 90,22 64,46 C 48,56 30,48 22,36 Z"
              fill="#64944a"
              stroke={INK}
              strokeWidth="2.1"
            />
          </g>
        </g>
      </g>
    </g>
  )
}

function BlueWashi() {
  const dots = [
    [8, 10],
    [22, 8],
    [12, 22],
    [26, 24],
    [6, 34],
    [20, 36],
  ]
  return (
    <g
      id="prop-tape-blue"
      className="desk-prop blue-washi"
      data-interactive="true"
      data-state="idle"
      role="button"
      tabIndex={0}
      aria-label="蓝点胶带"
      transform="translate(1458 528) rotate(16)"
    >
      <g className="scene-pose">
        <g className="entity-motion">
          <path
            d="M 2,4 L 36,0 L 40,44 L 28,48 L 22,42 L 4,46 Z"
            fill="#7eb8d4"
            stroke={INK}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {dots.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill="#3f7fa3" />
          ))}
        </g>
      </g>
    </g>
  )
}

function GinghamWashi() {
  return (
    <g
      id="prop-tape-gingham"
      className="desk-prop gingham-washi"
      data-interactive="true"
      data-state="idle"
      role="button"
      tabIndex={0}
      aria-label="格纹胶带"
      transform="translate(1418 792) rotate(12)"
    >
      <g className="scene-pose">
        <g className="entity-motion">
          <path
            d="M 0,8 L 18,2 L 86,10 L 92,38 L 78,44 L 64,36 L 8,42 Z"
            fill="#f4d5dc"
            stroke={INK}
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <g stroke="#e38a9c" strokeWidth="7" opacity="0.85">
            <path d="M 16,6 L 12,40" />
            <path d="M 34,6 L 30,42" />
            <path d="M 52,6 L 48,42" />
            <path d="M 70,8 L 66,42" />
          </g>
          <g stroke="#e38a9c" strokeWidth="7" opacity="0.55">
            <path d="M 4,16 L 88,16" />
            <path d="M 6,30 L 86,30" />
          </g>
        </g>
      </g>
    </g>
  )
}

function paperFacePath(x: number, y: number, w: number, h: number) {
  return `M ${x} ${y}
           C ${x} ${y} ${x + w - 8} ${y - 6} ${x + w} ${y + 4}
           C ${x + w + 6} ${y + 18} ${x + w + 4} ${y + h - 12} ${x + w - 4} ${y + h}
           C ${x + w - 40} ${y + h + 6} ${x + 24} ${y + h + 4} ${x + 6} ${y + h - 2}
           C ${x - 6} ${y + h - 18} ${x - 4} ${y + 16} ${x} ${y} Z`
}

function LetterPaper({ children }: { children?: ReactNode }) {
  const x = 480
  const y = 78
  const w = 640
  const h = 744
  const lines = Array.from({ length: 22 }, (_, i) => {
    const yy = y + 118 + i * 28
    const wobble = Math.sin(i * 1.35) * 1.1
    return (
      <path
        key={i}
        className="paper-line"
        d={`M ${x + 30} ${yy + wobble} Q ${x + w / 2} ${yy - 0.9} ${x + w - 32} ${yy - wobble * 0.4}`}
        stroke="#d5c7ae"
        strokeWidth="1.45"
        fill="none"
      />
    )
  })

  return (
    <g
      id="page"
      className="letter-paper"
      data-interactive="false"
      data-state="open"
    >
      <path
        d={`M ${x - 10} ${y + 8} L ${x + w - 18} ${y + 14} L ${x + w - 14} ${y + h + 6} L ${x - 6} ${y + h + 2} Z`}
        fill={PAPER_BACK}
        stroke={INK}
        strokeWidth="2.2"
      />
      <path
        d={`M ${x + 8} ${y + 4} L ${x + w - 8} ${y + 10} L ${x + w - 4} ${y + h} L ${x + 4} ${y + h - 4} Z`}
        fill="#eadcc0"
        stroke={INK}
        strokeWidth="2"
      />
      <path
        className="paper-sheet"
        d={paperFacePath(x, y, w, h)}
        fill={PAPER}
        stroke={INK}
        strokeWidth="2.8"
        strokeLinejoin="round"
        filter="url(#paperContactShadow)"
      />
      <g id="rules" fill="none" strokeLinecap="round">
        {lines}
      </g>
      {children}
    </g>
  )
}

function BookCover({ children }: { children?: ReactNode }) {
  const x = 480
  const y = 78
  const w = 640
  const h = 744
  return (
    <g id="book-cover" data-interactive="false" data-state="closed">
      <g className="scene-pose">
        <path
          d={`M ${x - 10} ${y + 8} L ${x + w - 18} ${y + 14} L ${x + w - 14} ${y + h + 6} L ${x - 6} ${y + h + 2} Z`}
          fill={PAPER_BACK}
          stroke={INK}
          strokeWidth="2.2"
        />
        <path
          className="paper-sheet"
          d={paperFacePath(x, y, w, h)}
          fill={PAPER}
          stroke={INK}
          strokeWidth="2.8"
          strokeLinejoin="round"
          filter="url(#paperContactShadow)"
        />
        {children}
      </g>
    </g>
  )
}

export function DeskScene({
  children,
  cover,
}: {
  children?: ReactNode
  cover?: ReactNode
}) {
  return (
    <svg
      id="stage"
      className="desk-svg"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      data-model="game-scene"
      data-no-paper-layer="true"
    >
      <defs>
        <filter
          id="paperContactShadow"
          x="-4%"
          y="-2%"
          width="108%"
          height="110%"
        >
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="1.6"
            floodColor="#5c3d1c"
            floodOpacity="0.16"
          />
        </filter>
        <clipPath id="page-ink-clip">
          <rect x="508" y="140" width="584" height="630" />
        </clipPath>
      </defs>
      <g id="desk" data-interactive="false" data-state="idle">
        <rect width="1600" height="900" fill={WOOD} />
        {WOOD_MARKS.stains.map((stain, index) => (
          <ellipse
            key={`stain-${index}`}
            cx={stain.cx}
            cy={stain.cy}
            rx={stain.rx}
            ry={stain.ry}
            transform={`rotate(${stain.rot} ${stain.cx} ${stain.cy})`}
            fill="#8a6238"
            opacity={stain.opacity}
          />
        ))}
        <g fill="none" stroke="#7a4e28" strokeLinecap="round">
          {WOOD_MARKS.grains.map((grain, index) => (
            <path
              key={`grain-${index}`}
              d={grain.d}
              opacity={grain.opacity}
              strokeWidth={grain.width}
            />
          ))}
        </g>
        {WOOD_MARKS.knots.map((knot, index) => (
          <g
            key={`knot-${index}`}
            transform={`rotate(${knot.rot} ${knot.cx} ${knot.cy})`}
          >
            <ellipse
              cx={knot.cx}
              cy={knot.cy}
              rx={knot.rx}
              ry={knot.ry}
              fill="#8a5a30"
              stroke="#5c3a1c"
              strokeWidth="1.6"
              opacity="0.85"
            />
            <ellipse
              cx={knot.cx}
              cy={knot.cy}
              rx={knot.rx * 0.55}
              ry={knot.ry * 0.5}
              fill="none"
              stroke="#5c3a1c"
              strokeWidth="1.2"
              opacity="0.7"
            />
            <ellipse
              cx={knot.cx - 2}
              cy={knot.cy}
              rx={knot.rx * 0.22}
              ry={knot.ry * 0.2}
              fill="#4a2e16"
              opacity="0.8"
            />
          </g>
        ))}
      </g>
      <LetterPaper>{children}</LetterPaper>
      <BookCover>{cover}</BookCover>
      <Pencil />
      <PolkaWashi />
      <FloralRoll />
      <Clip x={248} y={768} rotation={18} color="#e27898" />
      <Clip x={318} y={786} rotation={-12} color="#d4a84b" />
      <Mug />
      <Plant />
      <BlueWashi />
      <Clip x={1178} y={768} rotation={-8} color="#4a7ab8" />
      <Clip x={1262} y={792} rotation={14} color="#d4a84b" />
      <GinghamWashi />
    </svg>
  )
}
