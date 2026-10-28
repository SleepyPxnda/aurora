# aurora

aurora guides a team of 3 to 12 people through a LASR architecture review (mission statement, quality goals, base review, goal-oriented analysis) in the browser, together in real time, and produces a report at the end. It replaces the Miro board, the Excel rating and typing up the report afterwards. A cloudypanda tool, hosted at `aurora.cloudypanda.de`.

## Hard rules

- **Language:** code, identifiers, file names, routes, URLs and commit messages in English. Only UI text is German: short, no emojis.
- **LASR-faithful:** flow and calculation follow lasr-reviews.org. Where the method leaves gaps (points matrix, gap formula, target value steps), the assumption lives in one place in the code and is marked as an assumption.
- **License:** use only the names of the 14 quality attributes and 8 risk categories, with our own descriptions. No official card texts, card design or illustrations. Authors, link and CC BY-SA 4.0 appear in the footer and in every export, adaptations marked.
- **No login:** whoever has the room link can collaborate. Room IDs are random with at least 128 bits. The admin link is secret and checked on the server, never only in the client.
- **Data minimal:** store only freely chosen display names. No tracking, no third-party analytics.
- **Compute, don't store:** results 1.0 and 2.0 are derived from the data. Only the manual correction in step 4 is stored.
- **Small documents:** structured data (votes, cards, steps) are single documents; one vote is one document.
- **One report model:** every export format is rendered from the same report model.
- **Design system:** cloudypanda design system, tokens from its `tokens.json` as CSS variables (never copied values). Dark first, one accent (`accent-aurora`), status never by color alone, numbers in Geist Mono.
- **UI components:** use shadcn-vue. Find, inspect and add components through the `shadcnVue` MCP server (`.mcp.json`) instead of writing them by hand; then theme them with the design-system tokens.
- **Moderation guides, never forces:** when moderation sets a step, others get a hint with a jump button, not a forced switch.
- **Commits and PRs:** no `Co-Authored-By` lines and no mention of co-authors or of the tools the code was written with.

## Architecture

- `app/` – Nuxt 4 app (pages, components, composables)
- `app/components/ui/` – shadcn-vue components, added via the MCP server or `pnpm dlx shadcn-vue add`
- `app/lib/utils.ts` – `cn` class-name helper for shadcn-vue
- `app/assets/css/main.css` – Tailwind v4 entry and theme variables
- `server/` – Nitro server: `api/` (room endpoints), `utils/` (room IDs, room store, admin check), `plugins/` (storage mount)
- `public/` – static assets
- `tests/` – vitest tests (`tests/**/*.test.ts`)

## Commands

- install: `pnpm install`
- dev: `pnpm dev`
- test: `pnpm test`
- typecheck: `pnpm typecheck`
- build: `pnpm build`

## Conventions

- Nuxt 4, TypeScript strict, Vue SFCs with `<script setup lang="ts">`.
- Tailwind v4 utilities; theme values only through CSS variables.
- One test per acceptance criterion, pure logic (scoring, report model) tested without the DOM.
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`).
