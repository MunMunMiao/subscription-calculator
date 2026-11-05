# MOTION v2 · Widget 关卡

对齐（MunMun 锁 · 唯一设计源）：

- [手帐 DeskScene Widget 关卡 v2](https://cursor.com/canvas/store-ca500a49-1eed-4ab7-8196-83b91a8be5cd/61c7901b-5faa-44ef-8b49-d026465db070)
- [手帐 UI Widget 贴纸 v2](https://cursor.com/canvas/store-ca500a49-1eed-4ab7-8196-83b91a8be5cd/cfcda443-ab93-4e33-bdce-4765e55443fb)

**舞台**：现有 DeskScene SVG（木桌 + 道具线稿），禁止换皮 / 新 scene-graph / 第二间房。  
**绑定**：时间轴绑场景态 `login-only | enter | desk | held(widgetId) | exit`，不绑路由。  
**禁止**：整页 opacity fade；第二张 HTML 纸；开本翻封面当主进场；切签换墨迹旧模型；同时两个 held；`widget-overview`；`|Δ|≤160` 微移后隐身冒充飞入/飞出。  
**手感**：场景轨 400–700ms · soft ease（`power2.inOut` / `power1.out`）· 吉卜力日常；描边轻、硬影无；接触影 `dy≤3` · `std≤1.6` · `opacity≤0.16`。

**v1 作废**：`sealed | opening | closing | browse | compose` 五态本/页签机、`#book-cover` 翻合、tab-flip / ink-swap 主隐喻全部清掉。本文件即 MOTION 唯一源。

内容 Widget（SCENE ids）：

| id                | 形态                  | 在场                        |
| ----------------- | --------------------- | --------------------------- |
| `widget-login`    | 独立登录卡            | 仅 `login-only`；enter 移出 |
| `widget-category` | 色块贴板              | enter 后 · desk/held        |
| `widget-subs`     | 索引卡叠              | enter 后 · desk/held        |
| `widget-charges`  | 日程条 / 票根         | enter 后 · desk/held        |
| `widget-compose`  | 便签 + 笔（唯一纸感） | enter 后 · desk/held        |

**无 `widget-overview`**：`desk` 全 idle = 总览。

槽位：分类 / 订阅 / 扣费围边；记一笔近笔侧。  
次要胶带 id（装饰四态，本版不 held）：`prop-tape-floral` · `prop-tape-blue` · `prop-tape-gingham`

---

## 0. Widget 四态（idle / hover / act / held）

适用：`widget-login` · `widget-category` · `widget-subs` · `widget-charges` · `widget-compose`；次要胶带仅前三态装饰反馈。

对齐贴纸页：**idle = 放下** · **held = 拿起**。`settle` / put-down = held → 回槽 → idle。

| 态      | 含义            | tween（相对 slot 基线）                                    | 时长      |
| ------- | --------------- | ---------------------------------------------------------- | --------- |
| `idle`  | 放下贴槽        | `y:0, rotate:0, scale:1`；轻接触影                         | —         |
| `hover` | 可拿 · 微抬一角 | `y:-2, rotate:-0.8, scale:1.01`；影略长                    | 120–160ms |
| `act`   | 按下贴桌        | `y:1, rotate:0, scale:0.98`；影最短                        | 80–100ms  |
| `held`  | 拿起置前        | `y:-12~-18, rotate:-2~-4, scale:1.04~1.08`；z 前置；可操作 | 180–240ms |

```js
const WIDGET_FOUR = {
  idle: { y: 0, rotate: 0, scale: 1 },
  hover: { y: -2, rotate: -0.8, scale: 1.01 },
  act: { y: 1, rotate: 0, scale: 0.98 },
  held: { y: -15, rotate: -3, scale: 1.06 }, // mid of -12~-18 / -2~-4 / 1.04~1.08
}

const FOUR_DUR = {
  hover: 0.14, // 120–160ms
  act: 0.09, // 80–100ms
  held: 0.21, // 180–240ms
  idle: 0.22, // put-down settle
}

function setWidgetState(id, state) {
  const sel = `#${id}`
  const vars = WIDGET_FOUR[state]
  const dur = FOUR_DUR[state] ?? 0.2
  return gsap.to(sel, {
    ...vars,
    duration: dur,
    ease: state === "act" ? "power1.out" : "power2.inOut",
  })
}
```

同时最多一个 `held`。换件：旧件先 put-down（回 idle 槽）再拿新件。desk 全 idle = 总览，无需单独总览件。

---

## 1. `enter`（登录成功 · 不可打断）

顺序：登录 Widget **整件移出 viewBox**（禁 fade / 禁半途隐身）→ 四内容 Widget **从画外**错落入槽 → `desk`。总长 ≈ 1.3–1.8s。输入锁定至 `onComplete`。

**舞台**：`#stage` viewBox `0 0 1280 800`。  
**硬闸（产品拒签 P0/P1）**：

- 「出画」= 整件包围盒完全离开 `0…1280 × 0…800` 之后，才允许 `.set(…, { autoAlpha: 0 })` park。
- `|Δx| / |Δy| ≥ 420`（相对 slot 基线）。**禁止** 80–160 级微偏移 + `autoAlpha:0` 冒充飞入/飞出（那是 pop-in / 隐身）。
- 过场全程 `autoAlpha: 1`；park 只在出画之后。

```js
const STAGE = { w: 1280, h: 800 }
const OFF = 480 // ≥420 硬闸；给件宽高留余量

const CONTENT = [
  "#widget-category",
  "#widget-subs",
  "#widget-charges",
  "#widget-compose",
]

// true off-canvas starts (slot-local). Never reuse ≤160 pop deltas.
const FROM = {
  "#widget-category": { x: -OFF, y: -80 }, // left
  "#widget-subs": { x: OFF, y: -60 }, // right
  "#widget-charges": { x: -OFF, y: 120 }, // left-bottom
  "#widget-compose": { x: OFF, y: 140 }, // right-bottom
}

// login: fly UP until fully above y=0, then park
const LOGIN_OUT = { x: 48, y: -720, rotate: -8 } // -720 clears ~center card on 800h

function playEnterAfterLogin() {
  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onStart: () => lockInput(true),
    onComplete: () => {
      lockInput(false)
      setScene("desk") // 全 idle = 总览
    },
  })

  // 1) login translates fully OFF top edge (visible the whole way)
  tl.addLabel("loginOut")
    .to(
      "#widget-login",
      {
        ...LOGIN_OUT,
        autoAlpha: 1,
        duration: 0.65,
        ease: "power1.out",
      },
      "loginOut"
    )
    .set("#widget-login", { autoAlpha: 0, x: 0, y: LOGIN_OUT.y, rotate: 0 }) // park ONLY after off-canvas

  // 2) four content widgets fly IN from true offscreen into slots
  tl.addLabel("flyIn", "loginOut+=0.28")
  CONTENT.forEach((sel, i) => {
    const from = FROM[sel]
    tl.fromTo(
      sel,
      {
        x: from.x,
        y: from.y,
        rotate: i % 2 ? 5 : -5,
        scale: 0.96,
        autoAlpha: 1,
      },
      {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        duration: 0.6,
        ease: "power1.out",
      },
      `flyIn+=${i * 0.08}`
    )
  })

  return tl
}
```

**禁**：`#book-cover` 翻合当主进场；整页 `autoAlpha` fade；原地淡入落槽；`y:-160` / `|Δ|≤160` 后隐身。

---

## 2. `enter`（已登录刷新 · 不可打断）

同四模块 **从画外**飞入（共用 `FROM`，`|Δ|≥420`）；**舞台上不出现** `widget-login`。落定 → `desk` 全 idle = 总览。

```js
function playEnterLoggedInRefresh() {
  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onStart: () => {
      lockInput(true)
      gsap.set("#widget-login", { autoAlpha: 0, x: 0, y: LOGIN_OUT.y }) // never on stage
    },
    onComplete: () => {
      lockInput(false)
      setScene("desk")
    },
  })

  tl.addLabel("flyIn")
  CONTENT.forEach((sel, i) => {
    const from = FROM[sel]
    tl.fromTo(
      sel,
      {
        x: from.x,
        y: from.y,
        rotate: i % 2 ? 5 : -5,
        scale: 0.96,
        autoAlpha: 1,
      },
      {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        duration: 0.6,
        ease: "power1.out",
      },
      `flyIn+=${i * 0.08}`
    )
  })

  return tl
}
```

Boot 分支：未登录 → `login-only`（只放 `widget-login`，四槽空）；已登录 → 直接本轨 `enter`。

---

## 3. `exit`（登出 · 不可打断）

若当前 `held`：先 put-down → 四内容 **飞出画外**（镜像 `FROM`，`|Δ|≥420`，途中 `autoAlpha:1`）→ 登录卡从 **画外上方**飞回桌心 → `login-only`。总长 ≈ 1.3–1.8s。

```js
function playExit(heldId /* string | null */) {
  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onStart: () => lockInput(true),
    onComplete: () => {
      lockInput(false)
      setScene("login-only")
    },
  })

  // 0) put-down held first if any
  if (heldId) {
    tl.add(setWidgetState(heldId, "idle"), 0)
  }

  // 1) four content fly OUT to true off-canvas (same vectors as enter FROM)
  tl.addLabel("flyOut", heldId ? "+=0.05" : 0)
  CONTENT.forEach((sel, i) => {
    const to = FROM[sel]
    tl.to(
      sel,
      {
        x: to.x,
        y: to.y,
        rotate: i % 2 ? 6 : -6,
        autoAlpha: 1, // stay visible until off-canvas
        duration: 0.5,
        ease: "power1.in",
      },
      `flyOut+=${i * 0.05}`
    )
  })
  tl.set(CONTENT, { autoAlpha: 0 }) // park ONLY after off-canvas; leave x/y at FROM

  // 2) login flies IN from true above-canvas (not y:-160 pop)
  tl.addLabel("loginIn", "flyOut+=0.4")
    .set("#widget-login", {
      autoAlpha: 1,
      x: LOGIN_OUT.x,
      y: LOGIN_OUT.y,
      rotate: -6,
      scale: 1,
    })
    .to(
      "#widget-login",
      {
        x: 0,
        y: 0,
        rotate: 0,
        duration: 0.6,
        ease: "power1.out",
      },
      "loginIn"
    )

  return tl
}
```

触发：`#btn-logout`（或等价登出控件）。  
**禁**：「只藏内容、登录瞬切出现」；飞出中途 `autoAlpha:0`；登录从 `y:-160` 冒出。

---

## 4. `held` / put-down（桌上拿放）

- **拿起**：`desk` → 点某内容 Widget → `held(widgetId)`；抬起置前（四态 `held`）；其它件可轻让位 / 压暗，但仍贴槽。
- **放下**：点空桌 / 显式放下 / **再点当前 held 同件** / 点另一 Widget → 当前件回槽 `idle` → `desk`；若点了另一件，再播其 `held`。同件再点与点空桌等价。
- **同时只一个 held**。登录件不在 desk 态上场，故无拿起轨。
- **命中**：木纹 / 污渍 / 植物等装饰必须 `pointer-events: none`（或等价），空桌放下命中是工程硬闸，不改轨时长。

```js
let heldId = null

function pickUp(id) {
  if (getScene() !== "desk" && getScene() !== "held") return
  const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } })

  if (heldId && heldId !== id) {
    // put-down old first
    tl.add(setWidgetState(heldId, "idle"))
  }

  tl.add(() => {
    heldId = id
    setScene("held", id)
    bringToFront(id) // z-order
  })
  tl.add(setWidgetState(id, "held"))
  return tl
}

function putDown() {
  if (!heldId) return null
  const id = heldId
  const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } })
  tl.add(setWidgetState(id, "idle")).add(() => {
    heldId = null
    setScene("desk") // 全 idle = 总览
  })
  return tl
}

// click empty desk → putDown()
// click same held widget again → putDown()  // toggle
// click another widget → pickUp(otherId)  // handles put-down internally
```

`widget-compose` held 时：笔压下；本件内只有 SVG 横线 + 短填墨迹（禁 foreignObject / HTML 纸 / 系统滚动条）。保存墨迹长在本件。其余 held：色块可微弹、索引卡可翻、票根可滑——物件内反馈，不换皮。

---

## 5. 氛围与次要胶带

| id                                                          | 轨                                            |
| ----------------------------------------------------------- | --------------------------------------------- |
| `prop-cup`                                                  | opacity + y 慢脉冲（3–5s yoyo）               |
| `prop-plant`                                                | `scaleY: 1.02` yoyo 3–5s                      |
| `light`                                                     | opacity 0.85↔1                                |
| `prop-tape-floral` · `prop-tape-blue` · `prop-tape-gingham` | 装饰四态（idle/hover/act）；**本版不进 held** |

桌心可留轻量只读汇总墨迹作氛围（不可拿起），不算总览 Widget。

```js
function startAmbient() {
  gsap.to("#prop-cup", {
    y: "-=2",
    opacity: 0.92,
    duration: 3.5,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
  })
  gsap.to("#prop-plant", {
    scaleY: 1.02,
    transformOrigin: "50% 100%",
    duration: 4,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
  })
  gsap.to("#light", {
    opacity: 0.85,
    duration: 4.5,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
  })
}
```

---

## 6. `prefers-reduced-motion`

停氛围呼吸。`enter` / `exit` 可 `tl.progress(1)` 跳切到终帧（login 已出/已回；四模块在槽或已清）。拿放四态可缩到 ≤80ms 或直接 `set`。

```js
function playEnterRespectingMotion(kind /* "login" | "refresh" */) {
  const tl =
    kind === "login" ? playEnterAfterLogin() : playEnterLoggedInRefresh()
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    tl.progress(1)
  }
  return tl
}
```

---

## 7. 优先序

1. `enter`（登录成功 / 已登录刷新飞入）
2. `exit`（登出：放下 → 出镜 → 登录回桌）
3. `held` / put-down 拿放
4. Widget 四态（hover / act）
5. 次要胶带装饰四态
6. 氛围呼吸

---

## 8. 工程交接（@手帐工程师）

**在 #8 分支修 P0/P1 动效硬闸，不要新开无关分支。** #7 旧五态封本机继续不合。

**动效硬闸验收（产品 P0-1 / P1-4）**：

1. 登录出镜：末帧前 `#widget-login` 包围盒完全离开 viewBox；禁止 `y≈-160` + `autoAlpha:0`。
2. 四件飞入 / 飞出：相对槽位 `|Δx|` 或 `|Δy|` ≥ 420（本文件 `OFF = 480`）；禁止 80–160 pop-in。
3. 过场途中保持 `autoAlpha:1`；`.set(autoAlpha:0)` 只允许在出画之后。

```ts
type Scene =
  | "login-only"
  | "enter"
  | "desk"
  | "held"   // with heldWidgetId
  | "exit";

type WidgetId =
  | "widget-login"
  | "widget-category"
  | "widget-subs"
  | "widget-charges"
  | "widget-compose";
// NO widget-overview

playEnterAfterLogin(): Timeline;
playEnterLoggedInRefresh(): Timeline;
playExit(heldId: WidgetId | null): Timeline;
pickUp(id: Exclude<WidgetId, "widget-login">): Timeline;
putDown(): Timeline | null;
setWidgetState(id: WidgetId | string, state: "idle" | "hover" | "act" | "held"): Timeline;
```

过场中 `#stage` 可点层 `pointer-events: none`。  
状态机：`login-only | enter | desk | held | exit`。  
Boot：未登录 → `login-only`；已登录 → `enter`（refresh 轨）→ `desk`。

旧 API 作废：`playOpening` / `playClosing` / `playTabFlip` / `enterCompose` / `exitCompose` / Scene `sealed|opening|closing|browse|compose`。
