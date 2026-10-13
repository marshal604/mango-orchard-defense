import { describe, expect, it } from 'vitest'
import { Game } from '../game/logic/game'
import { emptyMap } from '../game/logic/testMap'
import { addRecord, topRecords } from './leaderboard'
import { nextGoal } from './quest'

const memoryStorage = (): Pick<Storage, 'getItem' | 'setItem'> => {
  const data = new Map<string, string>()
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}

describe('local leaderboard', () => {
  it('sorts by fastest time and reports the new rank', () => {
    const store = memoryStorage()
    expect(addRecord(store, 'normal', { nickname: 'A', time: 300 })).toBe(1)
    expect(addRecord(store, 'normal', { nickname: 'B', time: 200 })).toBe(1)
    expect(addRecord(store, 'normal', { nickname: 'C', time: 250 })).toBe(2)
    expect(topRecords(store, 'normal').map((r) => r.nickname)).toEqual(['B', 'C', 'A'])
  })

  it('keeps separate boards per difficulty', () => {
    const store = memoryStorage()
    addRecord(store, 'hell', { nickname: 'H', time: 500 })
    expect(topRecords(store, 'normal')).toEqual([])
    expect(topRecords(store, 'hell')).toHaveLength(1)
  })

  it('survives corrupted storage', () => {
    const store = memoryStorage()
    store.setItem('st_board_normal', '{not json')
    expect(topRecords(store, 'normal')).toEqual([])
  })
})

describe('quest guide', () => {
  const newGame = () => new Game({ difficulty: 'normal', seed: 9, map: emptyMap() })

  it('sends the player to sell when the bag is nearly full', () => {
    const game = newGame()
    game.run.mango = 26
    expect(nextGoal(game)).toMatchObject({ kind: 'sell', target: { x: 2400 } })
  })

  it('points to the next suggested upgrade when it is affordable', () => {
    const game = newGame()
    game.run.money = 150
    expect(nextGoal(game)).toMatchObject({ kind: 'buy', track: 'tool' })
  })

  it('suggests gathering when nothing is affordable', () => {
    const game = newGame()
    expect(nextGoal(game).kind).toBe('gather')
  })

  it('sends a geared-up player after the Monkey King', () => {
    const game = newGame()
    game.run.levels = { ...game.run.levels, tool: 3, armor: 2 }
    expect(nextGoal(game)).toMatchObject({ kind: 'king', target: { x: game.king.x, y: game.king.y } })
  })
})
