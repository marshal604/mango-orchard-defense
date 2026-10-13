# 芒果園保衛戰 (shuttle-tycoon)

Orchard-vs-macaques remake (芒果園保衛戰) of a top-down gather/sell/upgrade/boss game. Mechanics reference:
`docs/reverse-engineering.md`. Domain language: `CONTEXT.md`.

Stack: Vite + React (menus/HUD) + Phaser (world) + TypeScript. Vitest for logic, Playwright for e2e.

- `npm run dev` / `npm run build` / `npm test` / `npm run e2e`
- Game rules live in plain TS modules under `src/game/logic/` with no Phaser imports so they are unit-testable.
- Art is generated (Codex image gen) into `public/assets/`; missing art must fall back to placeholder shapes.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for this repo (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
