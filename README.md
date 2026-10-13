# Mango Orchard Defense (芒果園保衛戰)

**English** | [繁體中文](README.zh-TW.md)

A top-down pixel-art web game: harvest mangoes, chase off thieving Formosan macaques, sell your haul to the
queue at a roadside fruit stand, buy upgrades and hire workers, then defeat the Monkey King deep in the
mountains. Your clear time is your score.

![Mango Orchard Defense gameplay](docs/media/gameplay.gif)

Full-quality video:

https://github.com/user-attachments/assets/47b8540a-3551-456f-8d9d-c7f92a52bd5c

## Play

```
npm install
npm run dev
```

- Desktop: WASD or arrow keys
- Mobile: press and drag anywhere on the screen
- Walk up to a tree or a monkey and you swing automatically; stand on a building's circle to open its menu

## Gameplay

- **Harvest and fight**: knock mangoes off trees with a bamboo pole and win back bananas from monkeys. Tall
  old trees need pruning shears.
- **Sell**: customers at the fruit stand buy one item at a time while you stand on its circle.
- **Upgrade**: the farmers' association hires pickers and rangers, the tool shop sells tools and gear, and the
  grocery sells a bigger bag, better prices and home delivery.
- **Danger is reward**: four zones with star ratings; more stars mean harder monkeys and bigger drops.
- **Goals**: a 6-step tutorial with a gold arrow, milestones (a discount for chasing off 60 monkeys,
  overworked workers after 100 trees) and 17 trophies.
- **Hazards**: a temple pavilion (donate your cash, then heal safely), a shaved-ice stall, a chilli field and a
  temple procession that blocks the road.

## Development

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Unit tests (Vitest) |
| `npm run e2e` | End-to-end run through the real UI (Playwright) |
| `npm run build` | Typecheck and production build |

Stack: Vite + React (menus and HUD) + Phaser (the world) + TypeScript. All game rules live in a headless
`Game` class under `src/game/logic/` with no Phaser imports, so they are unit-tested directly.
See [`CLAUDE.md`](CLAUDE.md) and the domain glossary in [`CONTEXT.md`](CONTEXT.md).

## Docs

- [`docs/ai-prompt.md`](docs/ai-prompt.md): how to describe this game in a prompt for an AI to build it
- [`docs/reverse-engineering.md`](docs/reverse-engineering.md), [`docs/feel-reference.md`](docs/feel-reference.md),
  [`docs/ui-reference.md`](docs/ui-reference.md): what was learned from the original game
- [`docs/assets.md`](docs/assets.md): art manifest for Codex

## References

- Gameplay and numbers: stage 1 "除鼠王" of [蔣出來](https://whoismygrandpa.win/game). Its public web page was
  analysed with REA; only the mechanics and numbers are reused, and all art, text and audio are original.
  Findings are in the docs above.
- Font: [Cubic 11 / 俐方體11號](https://github.com/ACh-K/Cubic-11), SIL Open Font License 1.1
  (licence in `public/fonts/OFL.txt`)
- Engine: [Phaser](https://phaser.io/); UI: [React](https://react.dev/) + [Vite](https://vite.dev/)
- Art: generated with [Codex](https://github.com/openai/codex) image generation from `docs/assets.md`
