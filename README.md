# Convoza

**From chat to clarity.** Paste a messy WhatsApp group chat and get one clean order, an exact bill, and a moderated community feed. Built for Hacktoberfest Pune with **Gemma 4**.

In hostels, classes, housing societies and kirana shops, one person collects everyone's requests in a chat full of Hinglish, vague amounts and last-minute cancels. Convoza reads that chat, groups it, flags what it can't be sure about, and does the money maths exactly.

## Features

- **Chat parsing.** Paste a chat or upload a WhatsApp export (Android, iOS or copied text). Handles multi-line messages, system lines and media placeholders.
- **Hindi and Hinglish.** "2 copy aur ek sharpener" becomes 2 Notebook and 1 Sharpener.
- **Every message gets a status:** Added, Cancelled, Ignored, or Needs a check. Tap any message to see what Convoza understood and the exact source words.
- **No guessing.** "Some pens" or "same as Rahul" raises a question (1 / 2 / 5 / Custom) instead of an invented answer.
- **Zero-hallucination guard.** Every parsed item must quote words that really appear in the message, or the code rejects it.
- **Grouped orders and cancels.** Many people, one order. Cancels apply to that person's lines only.
- **Exact billing.** Prices, totals and splits are integer paise. Amounts are written in Indian words (Lakh, Crore). Group bills split shared charges to the paisa.
- **Three roles.** Consumer, Community (group) and Merchant (shop) decide who a bill is from and to.
- **Crowdmind feed.** Shops, groups and buyers post stock, offers and quote requests. Gemma tags each post, summarises it, pulls out quoted prices and blocks OTP, UPI PIN and advance-payment scams. If a post can't be checked, it isn't published.
- **Themes and languages.** Convoza Classic, Vintage and Mono themes. The landing page is available in English, Hindi, Kannada, Gujarati and Bengali.

**Extras beyond the basics:** UPI payment QR and deep link on each bill, "Share on WhatsApp", CSV export, saved history of recent orders, a code-level scam pre-filter that runs before the model, a per-IP rate limiter, a `/api/health` check, and a switchable AI provider.

## AI where it matters, code where it counts

| Gemma 4 | Plain TypeScript |
| --- | --- |
| Reads ONE message or post (English, Hindi, Hinglish) | Splits the chat into messages, senders and times |
| Decides order, cancel or chatter; tags posts and spots scams | Validates every answer with zod and checks quoted words really exist |
| Names products, variants and quantities (or `null` if vague) | Applies cancels, groups items, keeps a price only if it's in its quote |
| Quotes the exact words it used | All prices, totals, splits, bills, permissions and exports |

Gemma never sees prices and never invents a quantity. Anything unclear is flagged for a person.

## Quick start (cloud, recommended)

You need Node.js 20+ and a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
git clone <your-repo-url> convoza
cd convoza
npm install
cp .env.example .env.local      # then add GEMINI_API_KEY
npm run dev                     # http://localhost:3000
```

By default Convoza calls `gemma-4-26b-a4b-it` through the Gemini API with the official `@google/genai` SDK. The key stays on the server.

### Local fallback with Ollama

```bash
ollama pull gemma4:e4b          # light. gemma4:26b needs roughly 20 GB of memory
```

```env
LLM_PROVIDER=ollama
OLLAMA_MODEL=gemma4:e4b
OLLAMA_HOST=http://localhost:11434
OLLAMA_NUM_CTX=8192
```

Needs Ollama 0.22 or newer. Convoza sets `num_ctx` explicitly because Ollama defaults Gemma 4 to a small context window. Open `/api/health` to confirm the model is reachable. Smaller local models are less strict about JSON, so the zod guard and retry do more work.

### Persistent Crowdmind posts (optional)

Without Supabase, posts live in server memory and reset on restart. To persist them, run `docs/SUPABASE.sql` in a Supabase project and set `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Row-level security is on with no public policies. Only the server reads and writes.

## Tests

```bash
npm test              # unit tests (vitest): money, Indian words, chat parsing, order engine, guard, bills, roles, moderation
npm run typecheck
npm run test:prompts  # 10 order messages + 6 Crowdmind posts against a running app and your real model
```

Re-run `test:prompts` after any prompt change. Worked JSON examples in the prompts matter more than written rules.

## Project structure

```
app/            pages (landing, build, crowdmind, start, bill/[id]) and API routes (parse, crowdmind/posts, health)
components/     Builder, Crowdmind, Header, Landing, Prefs (theme, language, role), RoleGate
lib/            llm.ts (the ONLY file that calls Gemma), llmJson.ts, prompt.ts, readMessage.ts, schema.ts, guard.ts,
                parseChat.ts, aggregate.ts, money.ts, words.ts, bill.ts, roles.ts, i18n.ts, crowdmind/
scripts/        prompt-tests.mjs
docs/           SUPABASE.sql
```

## Deploy

Import the repo on Vercel and add `GEMINI_API_KEY` (and the Supabase variables if you use them). Ollama is for local development only.

## Honest limits

Roles are self-chosen in this demo. A real launch needs verified merchant accounts. Bills are stored in the browser that made them. The landing-page translations should be reviewed by native speakers.

## Contributing

Convoza is Hacktoberfest friendly. See [CONTRIBUTING.md](CONTRIBUTING.md) for good first issues (more languages, more prompt test cases, accessibility, bill templates).

## License

MIT
