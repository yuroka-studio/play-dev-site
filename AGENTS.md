<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## About this repository

A static Next.js (`output: "export"`) site generated from one file, `site.config.ts`. Rules that must keep holding:

- No paid services, no tracking, no cookies, no third-party embeds, and no network calls at build or run time (`scripts/lib/hygiene.mjs` and `e2e/privacy-by-design.spec.ts` enforce this).
- All policy wording lives in `messages/<locale>.json`; `lib/policy.tsx`, `lib/website-policy.tsx` and `lib/delete-page.tsx` only choose which sentences apply. A new language is a new messages file plus the entries in `site.config.ts` and `netlify.toml`.
- `site.config.ts` and `lib/color.ts` are also imported by plain Node (`scripts/postbuild.mjs`), so they may use type imports and erasable TypeScript only (no enums, no path aliases).
- Tests derive their expectations from `site.config.ts` and `messages/`; never hardcode the example values in a spec.
- Checks before committing: `npm run lint && npm run typecheck && ALLOW_EXAMPLE=1 npm run build && npm run test:e2e`.
