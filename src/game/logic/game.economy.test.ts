import { describe, expect, it } from 'vitest'
import { Game } from './game'
import { padOf } from './map'
import { upgradePrice } from './run'
import { emptyMap } from './testMap'

const idle = { move: { x: 0, y: 0 } }
const newGame = (difficulty: 'normal' | 'hell' = 'normal') => new Game({ difficulty, seed: 3, map: emptyMap() })
const standOn = (game: Game, id: string) => game.teleport(padOf(game.map.buildings.find((b) => b.id === id)!))

describe('selling at the workshop stall', () => {
  it('sells one item every 0.15 s while standing on the pad, feathers first', () => {
    const game = newGame()
    game.run.cork = 2
    game.run.feather = 2
    standOn(game, 'stall')
    game.step(0.01, idle)
    expect(game.run.feather).toBe(1)
    expect(game.run.money).toBe(8)
    game.step(0.15, idle)
    expect(game.run.feather).toBe(0)
    game.step(0.15, idle)
    expect(game.run.cork).toBe(1)
    expect(game.run.money).toBe(21)
  })

  it('does not sell away from the pad', () => {
    const game = newGame()
    game.run.cork = 5
    game.step(1, idle)
    expect(game.run.cork).toBe(5)
  })

  it('price upgrades raise sale prices by 40% per level', () => {
    const game = newGame()
    game.run.levels.price = 1
    game.run.cork = 1
    standOn(game, 'stall')
    game.step(0.01, idle)
    expect(game.run.money).toBe(7)
  })

  it('reports which pad the player stands on', () => {
    const game = newGame()
    standOn(game, 'proshop')
    expect(game.currentPad()).toBe('proshop')
    game.teleport({ x: 100, y: 100 })
    expect(game.currentPad()).toBeNull()
  })
})

describe('buying upgrades', () => {
  it('charges the listed price and raises the level', () => {
    const game = newGame()
    game.run.money = 200
    expect(game.buy('racket')).toBe(true)
    expect(game.run.levels.racket).toBe(1)
    expect(game.run.money).toBe(50)
  })

  it('refuses when money is short', () => {
    const game = newGame()
    game.run.money = 50
    expect(game.buy('racket')).toBe(false)
    expect(game.run.levels.racket).toBe(0)
  })

  it('refuses past the max level', () => {
    const game = newGame()
    game.run.money = 10_000
    expect(game.buy('delivery')).toBe(true)
    expect(game.buy('delivery')).toBe(false)
  })

  it('applies the hell price multiplier and the rally discount', () => {
    expect(upgradePrice('bag', 0, 'hell', { discount: false, complaints: false })).toBe(120)
    expect(upgradePrice('bag', 0, 'normal', { discount: true, complaints: false })).toBe(64)
    expect(upgradePrice('bag', 3, 'normal', { discount: false, complaints: false })).toBeNull()
  })

  it('armor raises max hp and heals by the difference', () => {
    const game = newGame()
    game.run.money = 180
    game.run.hp = 100
    game.buy('armor')
    expect(game.run.hpMax).toBe(213)
    expect(game.run.hp).toBe(143)
  })

  it('bag upgrades add 15 capacity', () => {
    const game = newGame()
    game.run.money = 80
    game.buy('bag')
    expect(game.run.bagCap).toBe(45)
  })

  it('shoes make the player 20% faster', () => {
    const game = newGame()
    game.run.money = 100
    game.buy('shoes')
    const x = game.player.x
    game.step(1, { move: { x: -1, y: 0 } })
    expect(x - game.player.x).toBeCloseTo(324)
  })
})
