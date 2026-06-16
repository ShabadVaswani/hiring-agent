# Hiring Agent Web (Vercel + OpenRouter)

This repo includes a Next.js + TypeScript implementation of the resume scoring pipeline, designed for Vercel deployment and BYO key model access via OpenRouter.

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
| **Primary domain** | https://openats.shabad.sbs |
| Vercel direct | https://hiring-agent-lilac.vercel.app |
| GitHub repo | https://github.com/ShabadVaswani/hiring-agent |

The app is deployed at the root of `openats.shabad.sbs` — no subpath needed.

## One-time production setup

### Step 1 — DNS (on your domain registrar / Cloudflare / wherever shabad.sbs is managed)

Add a **CNAME** record:

| Field | Value |
|-------|-------|
| Name | `openats` |
| Target | `cname.vercel-dns.com` |
| Proxy | Off / DNS only (if using Cloudflare) |

### Step 2 — Add the custom domain in Vercel

1. Go to your **hiring-agent** Vercel project → Settings → Domains
2. Add `openats.shabad.sbs`
3. Vercel will confirm once DNS propagates (usually under 5 minutes)

### Step 3 — GitHub OAuth app

1. Create or update a GitHub OAuth App: https://github.com/settings/developers
2. Set these fields (use the new domain):

| Field | Value |
|-------|--------|
| **Homepage URL** | `https://openats.shabad.sbs` |
| **Authorization callback URL** | `https://openats.shabad.sbs/api/auth/github/callback` |

3. Copy **Client ID** and generate a **Client secret**

### Step 4 — Vercel environment variables

In the **hiring-agent** Vercel project → Settings → Environment Variables:

| Name | Value |
|------|--------|
| `GITHUB_CLIENT_ID` | From Step 3 |
| `GITHUB_CLIENT_SECRET` | From Step 3 |
| `GITHUB_SESSION_SECRET` | Long random string (32+ chars) |
| `NEXT_PUBLIC_APP_URL` | `https://openats.shabad.sbs` |
| `NEXT_PUBLIC_BASE_PATH` | *(leave empty / delete this var)* |

> **Important**: Delete or blank out `NEXT_PUBLIC_BASE_PATH` — the app now deploys at the root, no subpath.

Redeploy after saving env vars.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.local.example` to `.env.local` and fill in GitHub OAuth vars:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
# NEXT_PUBLIC_BASE_PATH=   <-- leave empty for root-path local dev
```

3. Start dev server:

```bash
npm run dev
```

4. Open http://localhost:3000

## Rate limits

- BYOK (your OpenRouter key): no app-level limit
- BYOK + GitHub OAuth: no app-level limit
- GitHub PAT mode: PAT stays in browser storage (30-day optional remember), no app-level GitHub limit

## Notes

- The web version preserves the multi-stage flow: section extraction → optional GitHub enrichment → evaluation.
- Prompt templates are reused directly from `prompts/templates`.
- For best JSON reliability, use stronger instruction-following models.
- Vercel Hobby caps API routes at **60 seconds**. The pipeline makes ~8 LLM calls — use a fast model if you hit timeouts.
