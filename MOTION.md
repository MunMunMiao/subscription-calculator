# MOTION v2 · Widget 关卡

对齐（MunMun 锁 · 唯一设计源）：

- [手帐 DeskScene Widget 关卡 v2](https://cursor.com/canvas/store-ca500a49-1eed-4ab7-8196-83b91a8be5cd/61c7901b-5faa-44ef-8b49-d026465db070)
- [手帐 UI Widget 贴纸 v2](https://cursor.com/canvas/store-ca500a49-1eed-4ab7-8196-83b91a8be5cd/cfcda443-ab93-4e33-bdce-4765e55443fb)

**舞台**：现有 DeskScene SVG（木桌 + 道具线稿），禁止换皮 / 新 scene-graph / 第二间房。  
**绑定**：时间轴绑场景态 `login-only | enter | desk | held(widgetId) | exit`，不绑路由。  
**login-only**：光木桌。零桌上物件（无登录卡 / 无杯笔植物胶带 / 无内容 Widget）。登录是右下角标 `#login-control`「GitHub 登录」，不是桌上物件。`widget-login` 作废。  
**禁止**：整页 opacity fade；开本翻封面当主进场；切签换墨迹旧模型；同时两个 expanded；`widget-overview`；`|Δ|≤160` 微移后隐身冒充飞入/飞出；破损叠纸 / 把 HTML 纸裂在 compact 美术上冒充展开。  
**双态（产品重锁 · iOS-like）**：桌上 **compact** = 异质摘要脸；点开 → **expanded dialog**（可操作详情/表单）；关 / 点木桌 → compact。旧闸「held = 只抬同一 SVG；禁第二脸」**作废**。展开必须是有意的第二显示态，等 UI 贴纸后再做；本分支 **暂停** P0-2「撕光 FO / 只抬同一 SVG」held UX，不把它当正式拿起。  
**手感**：场景轨 400–700ms · soft ease（`power2.inOut` / `power1.out`）· 吉卜力日常；描边轻、硬影无；接触影 `dy≤3` · `std≤1.6` · `opacity≤0.16`。

**v1 作废**：`sealed | opening | closing | browse | compose` 五态本/页签机、`#book-cover` 翻合、tab-flip / ink-swap 主隐喻全部清掉。本文件即 MOTION 唯一源。

内容 Widget（SCENE ids）：

| id                | 形态                    | 在场                                                       |
| ----------------- | ----------------------- | ---------------------------------------------------------- |
| `login-control`   | 右下角标「GitHub 登录」 | 仅 `login-only`；click → OAuth；enter 移出（不是桌上物件） |
| `widget-category` | 色块贴板                | enter 后 · desk/held                                       |
| `widget-subs`     | 索引卡叠                | enter 后 · desk/held                                       |
| `widget-charges`  | 日程条 / 票根           | enter 后 · desk/held                                       |
| `widget-compose`  | 便签 + 笔（唯一纸感）   | enter 后 · desk/held                                       |

**无 `widget-overview`**：`desk` 全 idle = 总览。

槽位：分类 / 订阅 / 扣费围边；记一笔近笔侧。  
次要胶带 id（装饰四态，本版不 held）：`prop-tape-floral` · `prop-tape-blue` · `prop-tape-gingham`

---

## 0. Widget 四态（idle / hover / act / held）

适用：`widget-category` · `widget-subs` · `widget-charges` · `widget-compose`；次要胶带仅前三态装饰反馈。`#login-control` 不是桌上 Widget，无四态拿放。

对齐贴纸页（待发 compact/expanded）：**idle/compact = 放下摘要**。展开 dialog **等贴纸**。旧「held = 只抬起」不作正式 UX。

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

顺序：角标 `#login-control` **整件移出视口**（禁 fade / 禁半途隐身）→ 四内容 Widget **从画外**错落入槽 → `desk`。总长 ≈ 1.3–1.8s。输入锁定至 `onComplete`。

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
      "#login-control",
      {
        ...LOGIN_OUT,
        autoAlpha: 1,
        duration: 0.65,
        ease: "power1.out",
      },
      "loginOut"
    )
    .set("#login-control", { autoAlpha: 0, x: 0, y: LOGIN_OUT.y, rotate: 0 }) // park ONLY after off-canvas

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

同四模块 **从画外**飞入（共用 `FROM`，`|Δ|≥420`）；**舞台上不出现** 登录 chrome。落定 → `desk` 全 idle = 总览。

```js
function playEnterLoggedInRefresh() {
  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onStart: () => {
      lockInput(true)
      gsap.set("#login-control", { autoAlpha: 0, x: 0, y: LOGIN_OUT.y }) // never on stage
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

Boot 分支：未登录 → `login-only`（光木桌 + 角标 `#login-control`，四槽空、无道具）；已登录 → 直接本轨 `enter`（无登录 chrome）。

---

## 3. `exit`（登出 · 不可打断）

若当前 `held`：先 put-down → 四内容 **飞出画外**（镜像 `FROM`，`|Δ|≥420`，途中 `autoAlpha:1`）→ 角标 `#login-control` 从 **画外**飞回角落 → `login-only` 光木桌。总长 ≈ 1.3–1.8s。

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
    .set("#login-control", {
      autoAlpha: 1,
      x: LOGIN_OUT.x,
      y: LOGIN_OUT.y,
      rotate: -6,
      scale: 1,
    })
    .to(
      "#login-control",
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

## 4. compact / expanded（桌上双态 · **等 UI 贴纸，本分支不实现展开**）

产品重锁：compact 摘要脸 ↔ expanded 全屏/对话框操作态（iOS-like）。  
**暂停**：P0-2「held = 只抬同一 SVG；禁任何第二脸 / 撕光 FO」。  
**仍禁**：裂开的 HTML 纸叠在 compact 线稿上。展开必须是独立 dialog 呈现，等贴纸。

工程现状（#8 可继续合进预览、**不要当正式 held UX 验收**）：状态机仍叫 `held`，只作占位点击；compact 摘要（P1-6）才是本版桌上脸。

- **compact**：`desk` 全 idle = 总览；四件摘要墨迹；顶栏仅 `$X.XX / 月`。
- **expanded**：点 Widget → 对话框式详情/表单（**未做，等贴纸**）。关 / 点木桌 → compact。
- **同时只一个 expanded**。`#login-control` 不是桌上 Widget。
- **命中**：木纹 / 污渍 / 植物等装饰必须 `pointer-events: none`（或等价）。

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

展开对话脸（compose 表单、订阅列表操作等）**等 UI compact/expanded 贴纸后再做**。禁止把旧 FO 纸层当展开。

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

1. 登录出镜：末帧前 `#login-control` 包围盒完全离开视口；禁止 `y≈-160` + `autoAlpha:0`。桌上无登录卡。
2. 四件飞入 / 飞出：相对槽位 `|Δx|` 或 `|Δy|` ≥ 420（本文件 `OFF = 480`）；禁止 80–160 pop-in。
3. 过场途中保持 `autoAlpha:1`；`.set(autoAlpha:0)` 只允许在出画之后。
4. `login-only` 光木桌：无杯/笔/植物/胶带，无内容 Widget。

```ts
type Scene =
  | "login-only"
  | "enter"
  | "desk"
  | "held"   // with heldWidgetId
  | "exit";

type WidgetId =
  | "widget-category"
  | "widget-subs"
  | "widget-charges"
  | "widget-compose";
// NO widget-overview, NO widget-login

playEnterAfterLogin(): Timeline; // flies #login-control off, then content FROM
playEnterLoggedInRefresh(): Timeline; // no login chrome on stage
playExit(heldId: WidgetId | null): Timeline;
pickUp(id: WidgetId): Timeline;
putDown(): Timeline | null;
setWidgetState(id: WidgetId | string, state: "idle" | "hover" | "act" | "held"): Timeline;
```

过场中 `#stage` 可点层 `pointer-events: none`。  
状态机：`login-only | enter | desk | held | exit`。  
Boot：未登录 → `login-only`；已登录 → `enter`（refresh 轨）→ `desk`。

旧 API 作废：`playOpening` / `playClosing` / `playTabFlip` / `enterCompose` / `exitCompose` / Scene `sealed|opening|closing|browse|compose`。
