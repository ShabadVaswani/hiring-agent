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
- Optionally provide GitHub token/override URL

## Deploy on Vercel

- Import repo in Vercel
- Framework preset: Next.js
- No required server env vars (keys are request-scoped from user input)
- Deploy

## Notes

- The web version preserves the multi-stage flow: section extraction -> optional GitHub enrichment -> evaluation.
- Prompt templates are reused directly from `prompts/templates`.
- For best JSON reliability, use stronger instruction-following models.
