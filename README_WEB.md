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

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

3. Open http://localhost:3000 and:
- Upload a resume PDF
- Provide OpenRouter API key
- Choose a model (or type any model slug)
- Optionally connect GitHub (OAuth) or set a GitHub profile URL override

### GitHub OAuth setup

1. Create a GitHub OAuth App: https://github.com/settings/developers
2. Set **Authorization callback URL** to:
   - Local: `http://localhost:3000/api/auth/github/callback`
   - Production: `https://your-domain/api/auth/github/callback`
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `GITHUB_SESSION_SECRET` (random string, 32+ chars)
   - `NEXT_PUBLIC_APP_URL`

## Deploy on Vercel

- Import repo in Vercel
- Framework preset: Next.js
- Set environment variables:
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `GITHUB_SESSION_SECRET`
  - `NEXT_PUBLIC_APP_URL` (your Vercel URL)
- OpenRouter keys are still supplied by each user in the UI
- Deploy

## Notes

- The web version preserves the multi-stage flow: section extraction -> optional GitHub enrichment -> evaluation.
- Prompt templates are reused directly from `prompts/templates`.
- For best JSON reliability, use stronger instruction-following models.
