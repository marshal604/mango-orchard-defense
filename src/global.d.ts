import type { Game } from './game/logic/game'

declare global {
  interface Window { __game?: Game }
}
