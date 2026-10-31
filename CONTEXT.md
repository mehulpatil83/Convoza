# Convoza: project context

Paste this file at the start of a new chat or drop it in the repo root so any assistant or contributor has the full picture.

## 1. What this is

Convoza turns messy WhatsApp group chats into one clean grouped order, exact bills, and a moderated community feed (Crowdmind). It is a rebuild of a friend's project, Parchi (MLH Hack Day '26 Indore), renamed Convoza for Hacktoberfest Pune. The friend's repo is public and MIT licensed and was used as reference only; the friend asked for no credit. The code here is written fresh.

Goal: match Parchi's features and flows, plus extras, powered by Gemma 4.

## 2. Decisions made

- AI provider: cloud by default. Gemma 4 `gemma-4-26b-a4b-it` through the Gemini API (`@google/genai`). Ollama is a local fallback (`gemma4:e4b` light, `gemma4:26b` needs about 20 GB memory, Ollama 0.22+).
- Reason for cloud: the dev machine is weak (no usable GPU, limited RAM) and downloads should stay small.
- Storage for Crowdmind: Supabase optional. Without it, posts live in server memory and reset on restart. Not yet decided for deployment.
- Roles are self-chosen (demo). A real launch needs verified merchant accounts.
- Design: follows `docs/design/convoza-landing-reference.png` on every page (kraft paper grain, heavy black type, yellow brush highlights, red/yellow/olive shapes, hard offset shadows, pill buttons). Three themes (Classic = the reference, Vintage, Mono), system fonts only. Illustrations are inline SVG in `components/Art.tsx`.

## 3. Golden rule

Gemma understands language. Plain TypeScript handles everything that must be exact (quantities, prices, totals, splits, formatting, permissions). Never move maths into a prompt.

## 4. Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 (plus custom CSS in `app/globals.css`), zod 3, `@google/genai`, `@supabase/supabase-js`, `qrcode`, Vitest.

## 5. Features

- Paste or upload WhatsApp chat (Android, iOS, copied text); multi-line messages; system and media lines skipped.
- Per-message status: Added, Cancelled, Ignored, Needs a check, with original message, understanding and source words.
- Hindi and Hinglish; vague amounts and references to others raise questions (1 / 2 / 5 / Custom) instead of guesses.
- Zero-hallucination guard: every parsed item must quote words that appear in the message.
- Grouped order, per-person cancels, prices, who owes what, all in integer paise.
- Bills: number `CVZ-YYYYMMDD-NNNN`, IST date, amount in Indian words, roles decide from/to (merchant: one bill per customer; community: group bill split to the paisa; consumer: one bill to "You"), shared charges, print/PDF, copy for WhatsApp.
- Crowdmind: spaces Buyers, Groups, Shops with a read/post access matrix enforced server-side; Gemma tags, summarises, extracts quoted prices, blocks scams; if a post can't be checked it isn't published.
- Extras: UPI QR and deep link per payer, WhatsApp share, CSV export, saved history (last 8), code-level scam pre-filter, per-IP rate limiter, `/api/health`, switchable provider, Hacktoberfest repo files and CI.
- Landing page languages: English, Hindi, Kannada, Gujarati, Bengali (rotating hero word).

## 6. File map

```
app/
  page.tsx, layout.tsx, globals.css
  build/page.tsx          order builder (RoleGate + Builder)
  crowdmind/page.tsx      feed
  start/page.tsx          role picker
  bill/[id]/page.tsx      printable bill (reads browser localStorage)
  api/parse/route.ts      Gemma job 1: read ONE message
  api/crowdmind/posts/route.ts   Gemma job 2: check a post; GET feed (header x-convoza-role)
  api/health/route.ts     provider reachability
components/  Art (SVG logo, icons, shapes), Builder, Crowdmind, Header, Landing, Prefs (theme, language, role, name), RoleGate
lib/
  llm.ts            ONLY file that calls Gemma (gemini or ollama, retries, health check)
  llmJson.ts        clean JSON, zod-validate, retry once
  prompt.ts         order prompt with worked examples
  readMessage.ts    trivial-chatter skip -> model -> guard
  schema.ts         zod + JSON schema for job 1
  guard.ts          quote check, dedupe, trivial chatter
  parseChat.ts      chat text -> messages
  aggregate.ts      order engine (adds, cancels, flags, CSV, shop text)
  money.ts          paise parsing/formatting/splitting (Indian grouping)
  words.ts          amount in Indian words
  bill.ts           bills, who-owes, UPI link
  roles.ts          roles, spaces, access matrix
  i18n.ts           translations
  rateLimit.ts, sample.ts
  crowdmind/        schema, prompt, checkPost (prefilter + guard), store (Supabase or memory), seed
scripts/prompt-tests.mjs   10 order + 6 moderation cases against a running app
docs/SUPABASE.sql          table + row-level security
```

## 7. Environment

```
LLM_PROVIDER=gemini            # or ollama
GEMINI_API_KEY=...
GEMMA_MODEL=gemma-4-26b-a4b-it
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=gemma4:e4b
OLLAMA_NUM_CTX=8192            # Ollama defaults Gemma 4 to a small window
SUPABASE_URL= / SUPABASE_SECRET_KEY=   # optional
```

## 8. Commands

`npm install`, `npm run dev`, `npm test` (173 unit tests), `npm run typecheck`, `npm run build`, `npm run test:prompts` (needs running app and real model).

## 9. Verification status

Verified: 173 unit tests pass, typecheck clean, production build passes, API pipeline tested against a fake Ollama server (guard drops invented items, trivial chatter skips model, role 401/403, scam pre-filter 422, model-blocked 422, good post 201), all five pages return 200.

Not verified: real Gemma 4 output (no API key during the build), visual appearance and mobile layout (no browser screenshots), whether the Gemini API accepts `thinkingLevel: MINIMAL` for this model (code retries without it on a 400), native-speaker accuracy of Kannada, Gujarati and Bengali strings.

## 10. Known limits

- Roles self-chosen; no auth.
- Bills and history are stored in the browser (localStorage), not the server.
- In-memory rate limiter and post store reset on restart and don't share across serverless instances.
- Chat limit 300 messages per build; message text capped at 1000 characters.
- Builder translations beyond the landing page are English only.

## 11. Prompt-design lessons (from Parchi's README)

- Worked JSON examples beat written rules.
- Thinking level `MINIMAL` helped Gemma keep JSON stable.
- One fresh request per message, never chat history.
- Always trust-but-check: validate with zod, verify quotes, retry transient 5xx and 429.

## 12. Next steps

1. Add `GEMINI_API_KEY`, run `npm run dev`, build the sample chat.
2. Run `npm run test:prompts`, fix any failing prompts.
3. Check all pages on mobile and in each theme.
4. Decide on Supabase before deploying to Vercel.
5. Have native speakers review `lib/i18n.ts`.
6. Open Hacktoberfest issues (languages, prompt cases, accessibility, bill layouts).
