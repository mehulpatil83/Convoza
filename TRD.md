# Convoza — Technical Requirements Document (TRD)

## 1. Purpose & Scope
Convoza is a Next.js 16 web application that converts messy WhatsApp group chats into a clean grouped order, an exact bill, and a moderated community feed ("Crowdmind"). This TRD captures the technical requirements, architecture, APIs, data models, non-functional requirements, and deployment constraints. It is the single source of truth for engineering.

## 2. Product Overview
- **Problem:** In hostels, classes, societies and shops, one person collects requests in a chat full of Hinglish, vague amounts and late cancels; manual tallying is error-prone.
- **Solution:** Parse chat → group items/cancels → flag ambiguities → exact integer-paise billing → moderated community feed.
- **Tagline:** "From chat to clarity."
- **License:** MIT. Hacktoberfest Pune.

## 3. Golden Rule (Architecture Principle)
Gemma understands language; plain TypeScript handles everything that must be exact (quantities, prices, totals, splits, formatting, permissions). **Never move maths into a prompt.** Gemma never sees prices and never invents a quantity; unclear items are flagged for a human.

## 4. Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5.6 |
| Styling | Tailwind 4 + custom CSS (`app/globals.css`), CSS variables, 3 themes |
| Validation | zod 3 |
| AI | `@google/genai` (Gemma 4 `gemma-4-26b-a4b-it` via Gemini API); Ollama fallback (`gemma4:e4b`) |
| Storage | `@supabase/supabase-js` (optional Crowdmind backend); browser localStorage (bills/history) |
| QR | `qrcode` |
| Testing | Vitest 3 |
| Runtime | Node.js 20+ (24 LTS default on Vercel) |

## 5. Functional Requirements
### 5.1 Chat parsing
- Accept pasted text or uploaded WhatsApp export (Android, iOS, copied text).
- Handle multi-line messages, skip system/media lines.
- Split into messages with sender and timestamp.
- Limit: 300 messages per build; message text capped at 1000 chars.

### 5.2 Per-message status
Each message classified: **Added**, **Cancelled**, **Ignored**, **Needs a check**. Show original message, understanding, and exact source words.

### 5.3 Language
Hindi and Hinglish support. Vague amounts/references raise questions (1 / 2 / 5 / Custom) instead of guesses.

### 5.4 Zero-hallucination guard
Every parsed item must quote words present in the source message; code rejects invented items.

### 5.5 Order engine
- Grouped order across multiple people; per-person cancels.
- Integer paise for all money.
- CSV export, shop text, WhatsApp share.

### 5.6 Billing
- Bill number format `CVZ-YYYYMMDD-NNNN`, IST date.
- Amount in Indian words (Lakh/Crore).
- Roles decide from/to: Merchant (one bill per customer), Community (group bill split to paisa), Consumer (one bill to "You").
- Shared charges split to the paisa.
- Print/PDF, copy for WhatsApp.
- UPI QR code + deep link per payer.

### 5.7 Crowdmind feed
- Spaces: Buyers, Groups, Shops.
- Read/post access matrix enforced server-side.
- Gemma tags, summarises, extracts quoted prices, blocks scams (OTP/UPI PIN/advance-payment).
- Uncheckable posts are not published.
- Storage: Supabase (optional) or in-memory (resets on restart).

### 5.8 Chat analysis & tools
Paste any chat → "Analyze chat" → summary (people, key points with quoted evidence, decisions, open questions, scam warnings) + tools that fit: receipt, expense summary, task checklist, Google Calendar schedule (.ics + "Add to Google Calendar"), announcements digest, delivery tracker, interactive timeline. Gemma picks tools; code adds topic-required tools, validates quotes/dates/amounts, does totals. Unclear dates → user picks. Nothing guessed.

### 5.9 Roles & preferences
- Self-chosen roles (demo): Consumer, Community, Merchant.
- Themes: Classic, Vintage, Mono.
- Languages (landing): English, Hindi, Kannada, Gujarati, Bengali.
- Preferences persisted in localStorage (`convoza.theme`, `convoza.lang`, `convoza.role`, `convoza.name`).

### 5.10 Extras
- Per-IP rate limiter.
- `/api/health` provider reachability.
- Switchable AI provider (gemini/ollama).
- Saved history (last 8 orders, browser).
- Code-level scam pre-filter before model.

## 6. Non-Functional Requirements
- **Exactness:** All money in integer paise; no floating point.
- **Security:** API key stays server-side; Supabase RLS on with no public policies; server-only reads/writes; per-IP rate limiting; scam pre-filter.
- **Performance:** Turbopack dev; streaming supported on Node.js runtime (no edge required).
- **Reliability:** Retry transient 5xx/429; zod validation; retry once on JSON failure; provider health check.
- **Accessibility:** WCAG-oriented UI (keyboard, ARIA menu roles).
- **i18n:** Landing in 5 languages; builder English-only.
- **Limits:** 300 messages/build, 1000 chars/message, 8 saved orders.

## 7. Architecture
```
app/            pages + API routes
components/     UI components
lib/            core logic (llm is ONLY Gemma caller)
lib/crowdmind/  moderation schema/prompt/check/store/seed
lib/whatsapp/   WhatsApp integration (config, parse, signature, store, send, processor, confirm)
lib/analyze/    chat analysis (schema, prompt, guard, analyzeChat)
```
- `lib/llm.ts` — sole Gemma caller (gemini/ollama, retries, health).
- `lib/llmJson.ts` — clean JSON + zod validate + retry once.
- `lib/readMessage.ts` — trivial-chatter skip → model → guard.
- `lib/guard.ts` — quote check, dedupe, trivial chatter.
- `lib/aggregate.ts` — order engine.
- `lib/money.ts` — paise parse/format/split (Indian grouping).
- `lib/words.ts` — amount in Indian words.
- `lib/bill.ts` — bills, who-owes, UPI link.
- `lib/roles.ts` — roles, spaces, access matrix.
- `lib/rateLimit.ts` — per-IP limiter.
- `lib/calendar.ts` — Google Calendar / .ics.

## 8. API Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/parse` | Gemma job 1: read one message |
| POST | `/api/analyze` | Chat analysis + tool selection |
| POST | `/api/extract` | Extraction endpoint |
| GET/POST | `/api/crowdmind/posts` | Feed (GET, header `x-convoza-role`) / check a post (POST) |
| GET | `/api/health` | Provider reachability |
| POST/GET | `/api/webhooks/whatsapp` | WhatsApp webhook (signature-verified) |

## 9. Data Models (key)
- **Message:** sender, time, text, status, understanding, sourceWords.
- **Order item:** product, variant, quantity, person, cancelled flag.
- **Bill:** number, date (IST), role-based from/to, items, shared charges, total (paise), Indian-words amount, UPI link.
- **Crowdmind post:** space, author role, content, tags, summary, quoted prices, scam verdict, published flag.
- **WhatsApp:** config, signature, store, processor, confirm, send.

## 10. Environment Variables
```
LLM_PROVIDER=gemini            # or ollama
GEMINI_API_KEY=...
GEMMA_MODEL=gemma-4-26b-a4b-it
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=gemma4:e4b
OLLAMA_NUM_CTX=8192
SUPABASE_URL= / SUPABASE_SECRET_KEY=   # optional
```
WhatsApp/Google Calendar vars per `lib/whatsapp/config.ts` and `lib/calendar.ts`.

## 11. Database
- `docs/SUPABASE.sql` — Crowdmind table + RLS (no public policies; server-only).
- `docs/WHATSAPP_SUPABASE.sql` — WhatsApp tables.

## 12. Testing
- `npm test` — Vitest unit tests (money, Indian words, chat parsing, order engine, guard, bills, roles, moderation, whatsapp, analyze, calendar).
- `npm run typecheck` — `tsc --noEmit`.
- `npm run build` — production build.
- `npm run test:prompts` — 10 order + 6 moderation cases against running app + real model.

## 13. Deployment
- Vercel: import repo, add `GEMINI_API_KEY` (and Supabase vars if used). Ollama is local-only.
- `vercel.json` present. `AGENTS.md` auto-generated by Next.js dev.
- No Edge runtime required; streaming on Node.js.

## 14. Known Limits
- Roles self-chosen (demo); no auth.
- Bills/history in browser localStorage, not server.
- In-memory rate limiter/post store reset on restart; don't share across serverless instances.
- Chat limit 300 messages; message text 1000 chars.
- Builder translations English only.
- Landing translations need native-speaker review.

## 15. Repository
- Origin: https://github.com/mehulpatil83/Convoza.git
- Branch: main
- Latest feature work includes WhatsApp integration, chat analysis tools, Google Calendar scheduling.

---
*Generated for Convoza. Update this document when architecture or requirements change.*