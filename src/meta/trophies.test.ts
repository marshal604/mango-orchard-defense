import { describe, expect, it } from 'vitest'
import { Game } from '../game/logic/game'
import { emptyMap } from '../game/logic/testMap'
import { TrophyTracker } from './trophies'

const memoryStore = () => {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
}
const newGame = (difficulty: 'normal' | 'hell' = 'normal') => new Game({ difficulty, seed: 4, map: emptyMap() })

describe('trophies', () => {
  it('awards a trophy once when its condition is first met', () => {
    const tracker = new TrophyTracker(memoryStore())
    const game = newGame()
    expect(tracker.check(game)).toEqual([])
    game.run.stats.trees = 1
    expect(tracker.check(game).map((t) => t.id)).toEqual(['first_tree'])
    expect(tracker.check(game)).toEqual([])
  })

  it('remembers owned trophies across runs on this device', () => {
    const store = memoryStore()
    const game = newGame()
    game.run.stats.trees = 1
    new TrophyTracker(store).check(game)
    expect(new TrophyTracker(store).check(game)).toEqual([])
  })

  it('awards the speedrun only for a normal win within 5 minutes', () => {
    const tracker = new TrophyTracker(memoryStore())
    const game = newGame()
    game.elapsed = 280
    game.finished = true
    const ids = tracker.check(game).map((t) => t.id)
    expect(ids).toContain('speedrun')
    expect(ids).toContain('king_normal')
    expect(ids).toContain('no_death')
  })

  it('awards visiting all four zones', () => {
    const tracker = new TrophyTracker(memoryStore())
    const game = newGame()
    for (const p of [{ x: 100, y: 100 }, { x: 100, y: 3000 }, { x: 4700, y: 3000 }]) {
      game.teleport(p)
      game.step(0.01, { move: { x: 0, y: 0 } })
    }
    expect(tracker.check(game).map((t) => t.id)).toContain('all_zones')
  })
})
