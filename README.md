# 手帐

GitHub 登录后记录周期性订阅和一次性费用，并在同一张书桌上查看月/年支出、分类占比、订阅列表和即将扣费。

## Stack

- **Bun 1.4.4** (runtime, package manager, type checker, formatter)
- TanStack Start (React, Vite) — used for SSR, session, and HTTP endpoints
- GSAP + `@gsap/react` for desk/paper transitions (no client router for UI modes)
- oRPC
- Drizzle ORM + Cloudflare D1 (SQLite)
- better-auth with **GitHub OAuth only**
- Cloudflare Workers (`@cloudflare/vite-plugin`)
- oxlint (lint)

## Requirements

- **Bun 1.4.4** — this repo is pinned to that version (`packageManager`, `engines.bun`, `.bun-version`). Install with:

  ```sh
  curl -fsSL https://bun.com/install | bash -s "bun-v1.4.4"
  bun --version   # 1.4.4
  ```

- A [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- A Cloudflare account for remote D1 + deploy (local D1 does not need a real database id)

Node.js and pnpm are not the project toolchain. Install, scripts, typecheck, and format run through Bun 1.4.4. Local `vite dev` / Wrangler still start Cloudflare's **workerd** runtime (not a Node app server).

## Cloudflare resources

| Resource         | Value                                  |
| ---------------- | -------------------------------------- |
| Worker name      | `subscription-calculator`              |
| Production host  | `https://orbit.lyz.cloud`              |
| D1 binding       | `DB`                                   |
| D1 database name | `subscription-calculator`              |
| D1 database id   | `2200c603-924c-48a2-a8c0-e4b9a47e83da` |
| Wrangler config  | `wrangler.jsonc`                       |
| Migrations       | `drizzle/` (`0001_init.sql`)           |
| Worker entry     | `@tanstack/react-start/server-entry`   |

Production Wrangler already points at this D1 database and custom domain (`routes` with `custom_domain: true`). Local `vite dev` still uses a Wrangler-managed SQLite file under `.wrangler/`; keep `BETTER_AUTH_URL=http://localhost:3000` in `.dev.vars` so local OAuth is not sent to production.

## Environment variables

Copy the examples, then fill in real values. **Do not commit secrets.**

```sh
cp .dev.vars.example .dev.vars
# optional convenience copy; Vite/Wrangler local secrets come from .dev.vars
cp .env.example .env
```

| Name                   | Where                                                                                                          | Purpose                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `BETTER_AUTH_URL`      | `wrangler.jsonc` `vars` (production `https://orbit.lyz.cloud`) and `.dev.vars` (local `http://localhost:3000`) | Public origin used as better-auth `baseURL`     |
| `BETTER_AUTH_SECRET`   | `.dev.vars` / `wrangler secret put`                                                                            | Session signing secret (`openssl rand -hex 32`) |
| `GITHUB_CLIENT_ID`     | `.dev.vars` / `wrangler secret put`                                                                            | GitHub OAuth app client id                      |
| `GITHUB_CLIENT_SECRET` | `.dev.vars` / `wrangler secret put`                                                                            | GitHub OAuth app client secret                  |

GitHub OAuth callback URLs:

- Local: `http://localhost:3000/api/auth/callback/github`
- Production: `https://orbit.lyz.cloud/api/auth/callback/github`

Grant the GitHub app **email read** access (OAuth app: `user:email`; GitHub App: Account Permissions → Email addresses → Read-only).

Production secrets (not committed, not stored in `wrangler.jsonc`):

```sh
bunx wrangler secret put BETTER_AUTH_SECRET
bunx wrangler secret put GITHUB_CLIENT_ID
bunx wrangler secret put GITHUB_CLIENT_SECRET
```

Production `BETTER_AUTH_URL` is already set in `wrangler.jsonc` `vars` to `https://orbit.lyz.cloud`. Do not put GitHub or better-auth secrets in the repo.

## Local development

```sh
bun install
bun run cf-typegen
bun run db:migrate:local
bun run dev
```

Open `http://localhost:3000`.

1. Unauthed landing is `login-only`: the wooden desk with only **widget-login** (手帐 + GitHub 登录). No content widgets, and no overview widget.
2. After GitHub OAuth (or Preview `/?e2e=browse`), MOTION `enter` flies the four content widgets in from off-screen. Idle desk with nothing held **is** 总览.
3. Click a widget to pick it up (`held`); click the wood to put it down. Logout plays `exit`. `/app`, `/login`, and `/subscriptions` redirect to `/`.

`install` + `check` + `build` do **not** need real GitHub/Cloudflare credentials. Runtime sign-in, D1 persistence, and `wrangler deploy` do.

## Deploy outline

1. D1 (`subscription-calculator` / `2200c603-924c-48a2-a8c0-e4b9a47e83da`) and custom domain `orbit.lyz.cloud` are already in `wrangler.jsonc`.
2. Apply schema: `bun run db:migrate:remote`
3. Put GitHub + better-auth secrets on the Worker (`wrangler secret put`, not in git).
4. Deploy: `bun run deploy` (runs `vite build` then `wrangler deploy`).

Preview a production build locally with `bun run preview` (Workers runtime via the Cloudflare Vite plugin).

## Architecture

| Layer           | Location                                                        |
| --------------- | --------------------------------------------------------------- |
| Drizzle schema  | `src/db/schema.ts`                                              |
| D1 client       | `src/db/index.ts` (`env.DB` from `cloudflare:workers`)          |
| better-auth     | `src/lib/auth.ts` (server factory) + `src/lib/auth-client.ts`   |
| oRPC procedures | `src/orpc/router.ts`                                            |
| RPC HTTP        | `src/routes/api/rpc/$.ts`                                       |
| Auth HTTP       | `src/routes/api/auth/$.ts`                                      |
| Desk UI         | `src/components/desk-app.tsx` + `src/components/desk-scene.tsx` |
| GSAP register   | `src/lib/gsap.ts`                                               |
| Spend math      | `src/lib/spend.ts`                                              |

The visible desk and stationery are one SVG scene. Content lives in heterogeneous widgets (`widget-login`, `widget-category`, `widget-subs`, `widget-charges`, `widget-compose`). GSAP timelines bind to `login-only | enter | desk | held | exit` (see `MOTION.md`). TanStack Router is not used to switch those views.

Amounts are stored as integer minor units (`amount_cents`). USD and CNY are totaled separately; the app does not invent an exchange rate.

## Scripts

| Command                     | What it does                                                       |
| --------------------------- | ------------------------------------------------------------------ |
| `bun install`               | Install dependencies from `bun.lock`                               |
| `bun run dev`               | Vite + Workers local runtime on port 3000                          |
| `bun check`                 | Typecheck with Bun (`bun check --no-script`)                       |
| `bun fmt`                   | Format with Bun (`bun fmt --no-script`)                            |
| `bun fmt --check`           | Check formatting without writing                                   |
| `bun run lint`              | Lint with oxlint                                                   |
| `bun run build`             | Production Worker + assets                                         |
| `bun run db:migrate:local`  | Apply `drizzle/` SQL to local D1                                   |
| `bun run db:migrate:remote` | Apply SQL to remote D1 (needs Cloudflare login + real database id) |
| `bun run cf-typegen`        | Generate `worker-configuration.d.ts` from Wrangler config          |
| `bun run deploy`            | Build and deploy to Cloudflare Workers                             |
