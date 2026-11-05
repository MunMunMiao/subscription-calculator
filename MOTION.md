# MOTION v2 · Widget 关卡

对齐（MunMun 锁 · 唯一设计源）：

- [手帐 DeskScene Widget 关卡 v2](https://cursor.com/canvas/store-ca500a49-1eed-4ab7-8196-83b91a8be5cd/61c7901b-5faa-44ef-8b49-d026465db070)
- [手帐 UI Widget 贴纸 v2](https://cursor.com/canvas/store-ca500a49-1eed-4ab7-8196-83b91a8be5cd/cfcda443-ab93-4e33-bdce-4765e55443fb)

**舞台**：现有 DeskScene SVG（木桌 + 道具线稿），禁止换皮 / 新 scene-graph / 第二间房。  
**相机（MunMun 锁 · 永不改）**：`#stage` viewBox `0 0 1280 800` **永远固定**。**HARD BAN**：永不 transform `#stage`（禁 scale / translate / zoom / tilt / 改 viewBox）。GSAP 不得 tween `#stage`；`lockStage` 只改 `pointer-events`。禁切页 / 禁第二登录世界 / 禁相机跟踪。login-only 与 desk 同一木桌取景。enter = 物件飞入画框，相机不动。expanded dialog **叠在同一相机上**，不跟随 Widget，不改 viewBox。  
**绑定**：时间轴绑场景态 `login-only | enter | desk | expanded(widgetId) | exit`，不绑路由。  
**login-only**：同一木桌取景。空木桌 + **仅 auth Widget**（本版只有一块 `widget-auth-github`「GitHub 登录」）。无内容 Widget、无杯笔植物胶带。禁把登录做成一次性 `#chrome-layer` / `#login-control` 角标。  
**Auth**：每个登录源自己一块桌上 Widget。**禁「更多登录」聚合 dialog**、禁 max-3 溢出桶。以后加源 = 桌上再放一块，不是收进一个入口。  
**禁止**：整页 opacity fade；开本翻封面当主进场；切签换墨迹旧模型；同时两个 expanded；`widget-overview`；`|Δ|≤160` 微移后隐身冒充飞入/飞出；破损叠纸 / 把 HTML 纸裂在 compact 美术上冒充展开。  
**双态**：桌上 **compact** = 异质 SVG 摘要脸，留在原槽。点开 → **独立** `#desk-dialog` 纸卡（HTML 只允许在这张卡里）。关 / 点木桌 / 再点同一件 → compact。旧「held = 原地把便签变成表单」作废。Auth 只有 compact，点击走 OAuth，不展开。  
**手感**：场景轨 400–700ms · soft ease（`power2.inOut` / `power1.out`）· 吉卜力日常；描边轻、硬影无；接触影 `dy≤3` · `std≤1.6` · `opacity≤0.16`。

**v1 作废**：`sealed | opening | closing | browse | compose` 五态本/页签机、`#book-cover` 翻合、tab-flip / ink-swap 主隐喻全部清掉。本文件即 MOTION 唯一源。

Auth Widget（SCENE ids；login-only 上场，enter 出画。本版 **仅一块**）：

| id                   | 形态            | 在场                                       |
| -------------------- | --------------- | ------------------------------------------ |
| `widget-auth-github` | 「GitHub 登录」 | 仅 `login-only`；click → OAuth；enter 移出 |

无 `widget-auth-more` / 「更多登录」。

内容 Widget（SCENE ids）：

| id                | 形态                  | 在场                     |
| ----------------- | --------------------- | ------------------------ |
| `widget-category` | 色块贴板              | enter 后 · desk/expanded |
| `widget-subs`     | 索引卡叠              | enter 后 · desk/expanded |
| `widget-charges`  | 日程条 / 票根         | enter 后 · desk/expanded |
| `widget-compose`  | 便签 + 笔（唯一纸感） | enter 后 · desk/expanded |

**无 `widget-overview`**：`desk` 全 idle = 总览。

槽位：分类 / 订阅 / 扣费围边；记一笔近笔侧。  
次要胶带 id（装饰四态，本版不 held）：`prop-tape-floral` · `prop-tape-blue` · `prop-tape-gingham`

---

## 0. Widget 四态（idle / hover / act / held）

适用：内容 Widget 的 hover 贴纸（idle / hover / act）。`held` 只留在四态表里，**不是**场景态。点开内容件走 §4 的独立 dialog，compact 留在槽里变淡，不再把 `held` 抬起当成展开。`widget-auth-github` 在 login-only 用 idle/hover/act，不展开。

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

同时最多一个 `expanded`。换件：上一张 dialog 收起，来源 compact 回到 opacity 1，再打开下一张。desk 全 idle = 总览，无需单独总览件。

---

## 1. `enter`（登录成功 · 不可打断）

顺序：`#widget-auth-github` **整件移出视口**（禁 fade / 禁半途隐身）→ 四内容 Widget **从画外**错落入槽 → `desk`。总长 ≈ 1.3–1.8s。输入锁定至 `onComplete`。

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
const AUTH_OUT = { github: { x: 48, y: -840, rotate: -8 } } // home translate(530 368), face 220×64; -840 still clears y=0

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
      AUTH_SELECTORS,
      {
        ...AUTH_OUT.github,
        autoAlpha: 1,
        duration: 0.65,
        ease: "power1.out",
      },
      "loginOut"
    )
    .set(AUTH_SELECTORS, {
      autoAlpha: 0,
      x: 0,
      y: AUTH_OUT.github.y,
      rotate: 0,
    }) // park ONLY after off-canvas

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

同四模块 **从画外**飞入（共用 `FROM`，`|Δ|≥420`）；**舞台上不出现** auth Widget。落定 → `desk` 全 idle = 总览。

```js
function playEnterLoggedInRefresh() {
  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onStart: () => {
      lockInput(true)
      gsap.set(AUTH_SELECTORS, { autoAlpha: 0, x: 0, y: AUTH_OUT.github.y }) // never on stage
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

Boot 分支：未登录 → `login-only`（光木桌 + auth Widget 家族，四槽空、无道具）；已登录 → 直接本轨 `enter`（无 auth Widget）。

---

## 3. `exit`（登出 · 不可打断）

若当前 `expanded`：先 `collapseExpanded`（320ms `power2.in`）→ 四内容 **飞出画外**（镜像 `FROM`，`|Δ|≥420`，途中 `autoAlpha:1`）→ auth Widget 家族从 **画外**飞回 → `login-only` 空木桌。总长 ≈ 1.3–1.8s。

```js
function playExit(expandedId /* string | null */) {
  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onStart: () => lockInput(true),
    onComplete: () => {
      lockInput(false)
      setScene("login-only")
    },
  })

  // 0) collapse the open dialog first (320ms power2.in)
  if (expandedId) {
    tl.add(collapseExpanded(expandedId), 0)
  }

  // 1) four content fly OUT to true off-canvas (same vectors as enter FROM)
  tl.addLabel("flyOut", expandedId ? "+=0.05" : 0)
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
    .set(AUTH_SELECTORS, {
      autoAlpha: 1,
      x: AUTH_OUT.github.x,
      y: AUTH_OUT.github.y,
      rotate: -6,
      scale: 1,
    })
    .to(
      AUTH_SELECTORS,
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

## 4. compact / expanded（桌上双态 · 已实现）

compact 摘要脸留在槽里。点开后 `#desk-dialog` 是另一张同相机纸卡，不把表单画进 compact SVG。

- **compact**：`desk` 且 `expanded === null` = 总览。四件摘要；顶栏仅 `$X.XX / 月`。无 `foreignObject`。
- **expanded**：点内容 Widget → `expandWidget`。关（`#dialog-close`）/ 点 `#desk-hit` / 再点同一件 → `collapseExpanded`。点另一件仍只展开一个。
- **Auth**：compact-only。`#widget-auth-github` 闲置停在桌心 `translate(530 368)`，脸约 220×64（包围盒 `530–750 × 368–432`，距 1280×800 四边 ≥80）。仍在切片安全区内，不当角标。
- **相机**：全程不 transform `#stage`。
- **命中**：木纹 / 污渍 / 植物 `pointer-events: none`。Dialog 组默认不吃事件，纸卡内部才接收点击。

```js
const EXPAND_DIALOG = {
  duration: 0.42,
  ease: "power2.out",
  fromScale: 0.92,
  fromY: 10,
  toScale: 1,
  toY: 0,
}
const EXPAND_SOURCE = { duration: 0.28, ease: "power2.out", opacity: 0.4 }
const COLLAPSE_MOTION = { duration: 0.32, ease: "power2.in" }

function expandWidget(id, previous) {
  // source stays in its slot: opacity → 0.4 in 280ms. No x/y lift.
  // #desk-dialog from slot center (svgOrigin): scale 0.92→1, y 10→0, 420ms power2.out
}

function collapseExpanded(id) {
  // dialog scale/y back and autoAlpha 0, source opacity → 1, 320ms power2.in
}
```

切片：`preserveAspectRatio="xMidYMid slice"`。16:9 相对 16:10 上下各裁约 40px，所以 `y=752..788` 会缺一截。Auth 包围盒必须落在 16:9、4:3、5:4 可见区再内收 20px 的交集里，不能只判断 `x+w≤1280 && y+h≤800`。

### 拖拽

只拖四块内容 compact。Auth、`#desk-dialog`、杯笔植物胶带不拖。指针位移 &lt; 8px 是点击；≥ 8px 只移动 compact，不开 dialog。松手时若包围盒超出当前切片可见区，`power2.out` 320ms 弹回刚好完整可见的位置。落点写入该用户的 slot（与 `CONTENT_SLOTS` 同一坐标系）。不把贴纸默认坐标写成一行。阴影：桌上 `dy 4 / std 5 / 0.22`，拖起 `10 / 12 / 0.26`，dialog `14 / 18 / 0.28`，颜色 INK。`#stage` 不动。

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
3. `expanded` 展开 / 收起（dialog 420ms，源件 280ms，收起 320ms）
4. Widget 四态（hover / act）
5. 次要胶带装饰四态
6. 氛围呼吸

---

## 8. 工程交接（@手帐工程师）

**在 #8 分支修 P0/P1 动效硬闸，不要新开无关分支。** #7 旧五态封本机继续不合。

**动效硬闸验收（产品 P0-1 / P1-4）**：

1. 登录出镜：末帧前 auth Widget 包围盒完全离开视口；禁止 `y≈-160` + `autoAlpha:0`。
2. 四件飞入 / 飞出：相对槽位 `|Δx|` 或 `|Δy|` ≥ 420（本文件 `OFF = 480`）；禁止 80–160 pop-in。
3. 过场途中保持 `autoAlpha:1`；`.set(autoAlpha:0)` 只允许在出画之后。
4. `login-only` 空木桌 + 仅 auth Widget：无杯/笔/植物/胶带，无内容 Widget。

```ts
type Scene =
  | "login-only"
  | "enter"
  | "desk"
  | "expanded" // with expanded widget id
  | "exit";

type ContentWidgetId = "category" | "subs" | "charges" | "compose";
type AuthWidgetId = "github"; // scene id widget-auth-github; no 更多登录
// NO widget-overview

playEnterAfterLogin(): Timeline; // flies AUTH_WIDGETS off, then content FROM
playEnterLoggedInRefresh(): Timeline;
playExit(expandedId: ContentWidgetId | null): Timeline; // collapse first
expandWidget(id: ContentWidgetId, previous: ContentWidgetId | null): Timeline;
collapseExpanded(id: ContentWidgetId): Timeline;
setWidgetState(id: string, state: "idle" | "hover" | "act" | "held"): Timeline;
```

过场中 `#stage` 可点层 `pointer-events: none`。  
状态机：`login-only | enter | desk | expanded | exit`。  
Boot：未登录 → `login-only`；已登录 → `enter`（refresh 轨）→ `desk`。

旧 API 作废：`playOpening` / `playClosing` / `playTabFlip` / `enterCompose` / `exitCompose` / Scene `sealed|opening|closing|browse|compose`。
