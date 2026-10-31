# Contributing to Convoza

Thanks for helping. Hacktoberfest contributions are welcome all month.

## Set up

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY, or set LLM_PROVIDER=ollama
npm run dev
npm test && npm run typecheck
```

## The one rule

Gemma understands language. Plain TypeScript handles everything that must be exact: quantities, prices, totals, splits, formatting and permissions. Please don't move maths into a prompt.

## Good first issues

- Add or review translations in `lib/i18n.ts` (Marathi, Tamil, Telugu, Malayalam, Punjabi)
- Add Hinglish cases to `scripts/prompt-tests.mjs`
- Add tests to `lib/*.test.ts` for chat formats we don't parse yet
- Improve keyboard and screen-reader behaviour in `components/`
- A new bill layout, or a GST line on shop bills
- Voice note transcript import

## Changing prompts

1. Edit `lib/prompt.ts` or `lib/crowdmind/prompt.ts`. Prefer adding a worked example over adding a rule.
2. Run `npm run test:prompts` against a real model and paste the result in your PR.

## Pull requests

Keep PRs small, add tests for logic changes, and make sure `npm test`, `npm run typecheck` and `npm run build` pass. Please don't commit API keys.
