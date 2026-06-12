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
| Public app (via portfolio) | https://shabad.sbs/hiring-agent |
| Vercel deployment | https://hiring-agent-lilac.vercel.app/hiring-agent |
| GitHub repo | https://github.com/ShabadVaswani/hiring-agent |

The portfolio at `shabad.sbs` rewrites `/hiring-agent` to the Vercel deployment.

## One-time production setup (Vercel only)

### Step 1 — GitHub OAuth app

1. Create a GitHub OAuth App: https://github.com/settings/developers
2. Register:

| Field | Value |
|-------|--------|
| **Homepage URL** | `https://shabad.sbs/hiring-agent` |
| **Authorization callback URL** | `https://shabad.sbs/hiring-agent/api/auth/github/callback` |

3. Copy **Client ID** and generate a **Client secret**

### Step 2 — Vercel environment variables

In the **hiring-agent** Vercel project → Settings → Environment Variables:

| Name | Value |
|------|--------|
| `GITHUB_CLIENT_ID` | From Step 1 |
| `GITHUB_CLIENT_SECRET` | From Step 1 |
| `GITHUB_SESSION_SECRET` | Long random string (32+ chars) |
| `NEXT_PUBLIC_APP_URL` | `https://shabad.sbs/hiring-agent` |

Redeploy after saving env vars.

**Not needed on Vercel:** OpenRouter API key — each user enters their own in the UI.

### Step 3 — Use the app

1. Open https://shabad.sbs/hiring-agent
2. Click **Connect GitHub** → authorize
3. Upload resume PDF, paste OpenRouter key, pick a model
4. Click **Run scoring pipeline**

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
