# Hiring Agent Web (Vercel + OpenRouter)

This repo now includes a Next.js + TypeScript implementation of the resume scoring pipeline, designed for Vercel deployment and BYO key model access via OpenRouter.

## What was added

- Next.js app router frontend in `app/page.tsx`
- API route in `app/api/score/route.ts`
- OpenRouter client in `lib/openrouter/client.ts`
- Prompt loader in `lib/prompts/loader.ts`
- PDF extraction in `lib/pdf/extract.ts`
- GitHub enrichment in `lib/github/client.ts`
- Full scoring pipeline orchestration in `lib/pipeline/score.ts`
- Transform helpers in `lib/pipeline/transform.ts`
- Zod schemas in `lib/schemas/types.ts`

## Production URLs

| What | URL |
|------|-----|
| Custom domain (portfolio) | https://shabad.sbs/hiring-agent |
| Vercel portfolio | https://shabadportfolio.vercel.app/hiring-agent |
| App origin (direct) | https://hiring-agent-lilac.vercel.app/hiring-agent |
| GitHub repo | https://github.com/ShabadVaswani/hiring-agent |

Both portfolio domains rewrite `/hiring-agent` to the hiring-agent Vercel deployment. Use whichever URL you are already on for browsing and scoring.

**GitHub OAuth** is registered and handled only on the stable Vercel portfolio URL (`shabadportfolio.vercel.app`). Connect GitHub always redirects there, even when you open the app from `shabad.sbs`.

## One-time production setup (Vercel only)

### Step 1 — GitHub OAuth app

1. Create a GitHub OAuth App: https://github.com/settings/developers
2. Register **Vercel URLs only** (not `shabad.sbs`):

| Field | Value |
|-------|--------|
| **Homepage URL** | `https://shabadportfolio.vercel.app/hiring-agent` |
| **Authorization callback URL** | `https://shabadportfolio.vercel.app/hiring-agent/api/auth/github/callback` |

3. Copy **Client ID** and generate a **Client secret**

### Step 2 — Vercel environment variables

In the **hiring-agent** Vercel project → Settings → Environment Variables:

| Name | Value |
|------|--------|
| `GITHUB_CLIENT_ID` | From Step 1 |
| `GITHUB_CLIENT_SECRET` | From Step 1 |
| `GITHUB_SESSION_SECRET` | Long random string (32+ chars) |
| `NEXT_PUBLIC_APP_URL` | `https://shabadportfolio.vercel.app/hiring-agent` |
| `OPENROUTER_API_KEY` | Shared app key for free default models |

Redeploy after saving env vars.

Users can still provide their own OpenRouter API key in Advanced settings.

### Step 3 — Use the app

1. Open https://shabad.sbs/hiring-agent or https://shabadportfolio.vercel.app/hiring-agent
2. Choose one of the free shared default models:
   - `Gemma 4 26B A4B (free)`
   - `Llama 3.2 3B Instruct (free)`
3. (Optional) Open Advanced settings:
   - add your own OpenRouter key (BYOK mode)
   - connect GitHub OAuth
   - or add a GitHub PAT for browser-only GitHub requests
4. Upload resume PDF and click **Run scoring pipeline**

## Rate limits and cooldown

- Shared free models are protected by app-level throttling:
  - `5` OpenRouter calls/minute per user
  - after repeated provider rate limits (`429`), shared models are paused for `10` minutes
- BYOK + GitHub OAuth mode:
  - `25` OpenRouter calls/minute per user
- BYOK without GitHub OAuth:
  - no app-level OpenRouter limit
- GitHub PAT mode:
  - PAT stays in browser storage (optional 30-day remember)
  - no app-level GitHub limit, but GitHub provider limits still apply

## Run locally (optional)

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.local.example` to `.env.local` and fill in GitHub OAuth vars (use `http://localhost:3000/hiring-agent` as `NEXT_PUBLIC_APP_URL` if using the `/hiring-agent` base path locally).

3. Start dev server:

```bash
npm run dev
```

4. Open http://localhost:3000/hiring-agent

## Notes

- The web version preserves the multi-stage flow: section extraction → optional GitHub enrichment → evaluation.
- Prompt templates are reused directly from `prompts/templates`.
- For best JSON reliability, use stronger instruction-following models.
- Vercel Hobby caps API routes at **60 seconds**. The pipeline makes ~8 LLM calls — use a fast model if you hit timeouts.
- Shared free models are allowlisted server-side; arbitrary model IDs are rejected unless user BYOK is provided.
