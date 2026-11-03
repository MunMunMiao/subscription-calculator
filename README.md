# Subscription Calculator

Track recurring subscriptions and one-time fees, then understand spend through monthly/yearly totals, category breakdowns, upcoming charges, and simple charts.

订阅计算器：用 GitHub 登录后管理自己的周期性订阅和一次性费用，并在总览里查看月/年支出、分类占比与即将扣费时间线。

## Stack

- **Bun 1.4.4** (runtime, package manager, type checker, formatter)
- TanStack Start (React, Vite)
- shadcn/ui on Base UI (`base-nova`)
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

| Resource         | Value                                |
| ---------------- | ------------------------------------ |
| Worker name      | `subscription-calculator`            |
| D1 binding       | `DB`                                 |
| D1 database name | `subscription-calculator`            |
| Wrangler config  | `wrangler.jsonc`                     |
| Migrations       | `drizzle/` (`0001_init.sql`)         |
| Worker entry     | `@tanstack/react-start/server-entry` |

Replace the placeholder `database_id` in `wrangler.jsonc` after you create a real D1 database:

```sh
bunx wrangler d1 create subscription-calculator
```

Paste the returned `database_id` into `wrangler.jsonc`. Local `vite dev` still works with the placeholder; Wrangler creates a local SQLite file under `.wrangler/`.

## Environment variables

Copy the examples, then fill in real values. **Do not commit secrets.**

```sh
cp .dev.vars.example .dev.vars
# optional convenience copy; Vite/Wrangler local secrets come from .dev.vars
cp .env.example .env
```

| Name                   | Where                                   | Purpose                                                                             |
| ---------------------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| `BETTER_AUTH_URL`      | `wrangler.jsonc` `vars` and `.dev.vars` | Public origin used as better-auth `baseURL` (local default `http://localhost:3000`) |
| `BETTER_AUTH_SECRET`   | `.dev.vars` / `wrangler secret put`     | Session signing secret (`openssl rand -hex 32`)                                     |
| `GITHUB_CLIENT_ID`     | `.dev.vars` / `wrangler secret put`     | GitHub OAuth app client id                                                          |
| `GITHUB_CLIENT_SECRET` | `.dev.vars` / `wrangler secret put`     | GitHub OAuth app client secret                                                      |

GitHub OAuth callback URLs:

- Local: `http://localhost:3000/api/auth/callback/github`
- Production: `https://<your-worker>.workers.dev/api/auth/callback/github`

Grant the GitHub app **email read** access (OAuth app: `user:email`; GitHub App: Account Permissions → Email addresses → Read-only).

Production secrets (not committed, not stored in `wrangler.jsonc`):

```sh
bunx wrangler secret put BETTER_AUTH_SECRET
bunx wrangler secret put GITHUB_CLIENT_ID
bunx wrangler secret put GITHUB_CLIENT_SECRET
```

Then set production `BETTER_AUTH_URL` in `wrangler.jsonc` `vars` (or the Cloudflare dashboard) to your deployed origin.

## Local development

```sh
bun install
bun run cf-typegen
bun run db:migrate:local
bun run dev
```

Open `http://localhost:3000`. Sign in with GitHub, add subscriptions (or load sample data from the empty state), then open **总览** for charts.

`install` + `check` + `build` do **not** need real GitHub/Cloudflare credentials. Runtime sign-in, D1 persistence, and `wrangler deploy` do.

## Deploy outline

1. Create D1 and put the real `database_id` in `wrangler.jsonc`.
2. Apply schema: `bun run db:migrate:remote`
3. Put GitHub + better-auth secrets on the Worker.
4. Set `BETTER_AUTH_URL` to the production origin.
5. Deploy: `bun run deploy` (runs `vite build` then `wrangler deploy`).

Preview a production build locally with `bun run preview` (Workers runtime via the Cloudflare Vite plugin).

## Architecture

| Layer           | Location                                                      |
| --------------- | ------------------------------------------------------------- |
| Drizzle schema  | `src/db/schema.ts`                                            |
| D1 client       | `src/db/index.ts` (`env.DB` from `cloudflare:workers`)        |
| better-auth     | `src/lib/auth.ts` (server factory) + `src/lib/auth-client.ts` |
| oRPC procedures | `src/orpc/router.ts`                                          |
| RPC HTTP        | `src/routes/api/rpc/$.ts`                                     |
| Auth HTTP       | `src/routes/api/auth/$.ts`                                    |
| UI              | `src/routes/*` + `src/components/*`                           |
| Spend math      | `src/lib/spend.ts`                                            |

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
