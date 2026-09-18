# Halo

Scan a paper receipt, get rewarded onchain.

Halo is a mini app that turns everyday purchase receipts into onchain rewards. A
user photographs a receipt inside their wallet app, a vision model extracts and
scores it, and verified receipts become points that can be claimed as tokens on
Celo, World Chain, or Kaia.

This is the live codebase, opened up. It is what runs at
`api.halo.humanlabs.world` and the three mini app domains beside it — not a
demo, not a trimmed copy. Production configuration is here; only secrets are
not, and the commit history starts fresh at this point as the hackathon
baseline.

Two consequences worth knowing before you change anything:

- **The Solidity in `packages/onchain` is already deployed** behind a UUPS
  proxy holding real balances. Its inheritance, storage layout and EIP-712
  domain are fixed by what is on chain.
- **The database in `packages/database` has data in it.** Its Postgres schema is
  named `receipto` — an old product name that cannot be renamed — and its 17
  migrations are already applied.

Both are called out where it matters in the code. `AGENTS.md` has the rest.

---

## What is in the box

| Piece | Path | What it does |
|---|---|---|
| **API** | `apps/api` | Hono on Cloudflare Workers. Auth, receipt intake, AI analysis queue, points, raffle, admin. |
| **Mini app** | `apps/miniapp` | React + Vite SPA. One app, three wallet platforms, selected at runtime. |
| **Shared contracts** | `packages/contracts` | Zod schemas, chain constants and ABIs shared by API and frontend. |
| **Database** | `packages/database` | Drizzle ORM schema and migrations (PostgreSQL via Hyperdrive). |
| **Onchain** | `packages/onchain` | Solidity point-claim contract (Foundry). |
| **Tooling** | `tooling/*` | Shared ESLint and TypeScript configs. |

### How a receipt becomes a reward

```
 wallet app          Cloudflare Worker                     PostgreSQL
┌──────────┐        ┌─────────────────┐                  ┌──────────┐
│ miniapp  │──POST─▶│  /v1/receipts   │──── insert ─────▶│ receipts │
│  camera  │        └────────┬────────┘   status=pending └──────────┘
└──────────┘                 │
                             │ enqueue
                             ▼
                    ┌─────────────────┐
                    │ analysis queue  │── vision model ──▶ score + fields
                    └────────┬────────┘
                             │ status = claimable | rejected
                             ▼
┌──────────┐        ┌─────────────────┐                  ┌──────────┐
│ miniapp  │◀─sig───│ /v1/point/claim │─── sign claim ──▶│  signer  │
│  claim   │        └─────────────────┘                  └──────────┘
└────┬─────┘
     │ claimPoints(amount, claimId, deadline, signature)
     ▼
┌──────────────────────┐
│ PointClaim contract  │  Celo · World Chain · Kaia
└──────────────────────┘
```

The server never sends tokens. It signs a claim that the user redeems from their
own wallet, so a compromised API cannot drain the reward pool — it can only
authorise claims, which are capped per receipt and single-use by `claimId`.

### One app, three platforms

The mini app is **not** built three times. `apps/miniapp/src/lib/platform.ts`
resolves the platform from the hostname at runtime, and wallet-specific behaviour
lives behind an adapter:

```
lib/auth/adapter.ts  →  world.ts   (World App MiniKit)
                        celo.ts    (MiniPay injected provider)
                        kaia.ts    (Kaia wallet SDK)
```

Adding a fourth chain means adding one adapter file and one entry to the switch —
not copying the app.

---

## Quick start

**Requirements:** Node.js 22+, pnpm 9.15+, a PostgreSQL database.

```bash
pnpm install

# .env.example is the key manifest. Copy it where each app looks and fill in
# what you need — see "Environment" below.
cp .env.example apps/api/.dev.vars     # wrangler dev reads .dev.vars, not .env
cp .env.example apps/miniapp/.env
cp .env.example packages/database/.env
```

Point `DATABASE_MIGRATION_URL` at a local Postgres, create the schema, and start
both apps:

```bash
pnpm db:push        # local databases only — never staging or production
pnpm dev:apps
```

- API — http://localhost:8001 (OpenAPI UI at `/swagger`)
- Mini app — http://localhost:8000

To open the mini app inside a real wallet app you need a public https origin.
`pnpm dev` starts a Cloudflare tunnel alongside the dev servers; set
`CLOUDFLARE_TUNNEL_TOKEN` in `.env.local` first. Without a token it is skipped
and only the local servers start.

---

## Environment

Configuration is split three ways by who is allowed to read it. This repo is
public, so the split is load-bearing rather than cosmetic.

**1. Public runtime config — committed.** Non-secret Worker settings live in
`apps/api/wrangler.jsonc` under each environment's `vars`: API URL, CORS
domains, the World app id, the claim contract address. Knowing them buys an
attacker nothing.

**2. Public build-time config — committed.** `apps/miniapp/.env.staging` and
`.env.production`. Every `VITE_` value is compiled into the browser bundle and
is therefore already public the moment the app ships; committing them is what
makes a clean checkout produce the same build. **If a value must stay private it
cannot be a `VITE_` variable** — it belongs behind the API.

> The RPC entries in those files are intentionally blank. Our provider URLs
> carry an API key in the path, and a key in a public repo is on a scraper's
> list within the hour. Unset falls back to public endpoints; inject a keyed URL
> from CI if you need the throughput.

**3. Secrets — never in this repo, in any form.** Not even encrypted: a
committed ciphertext is an offline cracking target that never expires. They are
set directly on Cloudflare and injected in CI from GitHub Environment secrets.

```bash
# once per environment, from a machine that already has the value
cd apps/api
echo -n "<value>" | pnpm exec wrangler secret put JWT_SECRET --env production
```

The full list of secret keys is in `.env.example` and in the sync step of
`.github/workflows/deploy.yaml`. `.env.example` is the single manifest of every
key the system reads — names only, no values.

A few keys deserve a note:

- `ADMIN_API_TOKEN` — guards every `/v1/admin/*` route. Use 32+ random bytes.
  It is compared in constant time, but a guessable value defeats that.
- `SERVER_SIGNER_PRIVATE_KEY` — signs claim authorisations. It holds no funds and
  cannot move tokens; it only attests that a receipt earned N points.
- `DEPLOYER_PRIVATE_KEY` — used only by `packages/onchain` at deploy time. Keep it
  out of the Worker environment.

---

## Commands

```bash
pnpm dev              # all apps + tunnel
pnpm dev:apps         # all apps, no tunnel
pnpm build
pnpm typecheck
pnpm lint
pnpm test

pnpm db:push          # apply schema directly (local only)
pnpm db:generate      # create a migration from schema changes
pnpm db:migrate       # apply migrations (CI runs this; do not run against prod by hand)
pnpm db:studio        # Drizzle Studio
```

Scoped to a single workspace:

```bash
pnpm --filter @halo/api dev
pnpm --filter @halo/miniapp build
pnpm --filter @halo/onchain test
```

---

## Deployment

Everything runs on Cloudflare Workers.

- Push to `main` → staging.
- Publish a GitHub release → production.
- Unchanged apps are skipped.

`.github/workflows/ci.yaml` gates pull requests on lint, typecheck and test.
`.github/workflows/deploy.yaml` runs typecheck → test → migrations → secret sync
→ deploy, in that order: a failing test stops the pipeline before it has touched
the schema.

Secrets are read from **GitHub Environment** secrets (`staging` and
`production`), so the same workflow file cannot push a staging value over a
production one. The deploy job needs `CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID` and `DATABASE_MIGRATION_URL`; the rest of the list is in
the "Sync API secrets" step.

Forking this to run your own stack? Everything in `wrangler.jsonc` points at our
Cloudflare resources. Create your own Hyperdrive config, R2 bucket, queues and
domains, and replace the ids and routes.

---

## Building on this

Good places to start:

- **New chain** — add an adapter in `apps/miniapp/src/lib/auth/`, a chain entry in
  `packages/contracts/src/platform.ts`, and a route in `apps/miniapp/wrangler.jsonc`.
- **New reward mechanic** — the raffle in `apps/api/src/routes/client/raffle.ts` is
  self-contained and a reasonable template.
- **Better extraction** — receipt analysis lives in `apps/api/src/lib/receipt-processor/`.
  The prompt and the scoring rule are in one place.

Conventions that keep this codebase navigable are written down in
[AGENTS.md](./AGENTS.md) — worth five minutes before your first pull request.

---

## License

[MIT](./LICENSE)
