import { describe, expect, it } from 'vitest'
import { Game } from './game'
import { DEFAULT_MAP, inSafeArea, padOf, spawnPoint, zoneAt } from './map'
import { emptyMap } from './testMap'

const idle = { move: { x: 0, y: 0 } }

describe('walking the map', () => {
  it('starts the player at the spawn point next to the fruit stand', () => {
    const game = new Game({ difficulty: 'normal', seed: 1 })
    expect(game.player.x).toBe(2510)
    expect(game.player.y).toBe(2480)
  })

  it('moves the player at 270 px/s', () => {
    const game = new Game({ difficulty: 'normal', seed: 1 })
    game.step(1, { move: { x: 1, y: 0 } })
    expect(game.player.x).toBeCloseTo(2780)
  })

  it('normalises diagonal input so diagonals are not faster', () => {
    const game = new Game({ difficulty: 'normal', seed: 1 })
    game.step(1, { move: { x: 1, y: 1 } })
    const moved = Math.hypot(game.player.x - 2510, game.player.y - 2480)
    expect(moved).toBeCloseTo(270)
  })

  it('keeps the player inside the world', () => {
    const game = new Game({ difficulty: 'normal', seed: 1 })
    for (let i = 0; i < 40; i++) game.step(0.1, { move: { x: 0, y: 1 } })
    expect(game.player.y).toBeLessThanOrEqual(3200)
  })

  it('maps each quadrant to its zone and falls back to the village', () => {
    expect(zoneAt(DEFAULT_MAP, { x: 100, y: 100 }).id).toBe('hills')
    expect(zoneAt(DEFAULT_MAP, { x: 100, y: 3000 }).id).toBe('deep')
    expect(zoneAt(DEFAULT_MAP, { x: 2400, y: 3000 }).id).toBe('village')
    expect(zoneAt(DEFAULT_MAP, { x: 4700, y: 3000 }).id).toBe('town')
    expect(zoneAt(DEFAULT_MAP, { x: -50, y: -50 }).id).toBe('village')
  })

  it('emits a zone event when the player crosses into another zone', () => {
    const game = new Game({ difficulty: 'normal', seed: 1 })
    game.drainEvents()
    for (let i = 0; i < 40; i++) game.step(0.1, { move: { x: 0, y: -1 } })
    expect(game.drainEvents()).toContainEqual({ type: 'zone', zone: 'hills' })
  })

  it('counts elapsed time only while running', () => {
    const game = new Game({ difficulty: 'normal', seed: 1 })
    game.step(0.5, idle)
    expect(game.elapsed).toBeCloseTo(0.5)
  })
})

describe('safe areas', () => {
  it('cover every building pad and the spawn point', () => {
    for (const b of DEFAULT_MAP.buildings) expect(inSafeArea(DEFAULT_MAP, padOf(b))).toBe(true)
    expect(inSafeArea(DEFAULT_MAP, spawnPoint(DEFAULT_MAP))).toBe(true)
  })
})

describe('solid trunks and buildings', () => {
  it('stops the player at a tree trunk instead of walking through it', () => {
    const game = new Game({ difficulty: 'normal', seed: 1, map: emptyMap() })
    game.setTool(-1)
    game.teleport({ x: 1000, y: 600 })
    game.spawnTree({ x: 1060, y: 600 }, false)
    for (let i = 0; i < 20; i++) game.step(0.05, { move: { x: 1, y: 0 } })
    expect(game.player.x).toBeLessThan(1060)
  })

  it('lets the player walk through once the tree has been harvested', () => {
    const game = new Game({ difficulty: 'normal', seed: 1, map: emptyMap() })
    game.setTool(-1)
    game.teleport({ x: 1000, y: 600 })
    const tree = game.spawnTree({ x: 1060, y: 600 }, false)
    tree.alive = false
    for (let i = 0; i < 20; i++) game.step(0.05, { move: { x: 1, y: 0 } })
    expect(game.player.x).toBeGreaterThan(1100)
  })

  it('does not let the player walk into a building', () => {
    const game = new Game({ difficulty: 'normal', seed: 1, map: emptyMap() })
    const stall = game.map.buildings.find((b) => b.id === 'stall')!
    game.teleport({ x: stall.x, y: stall.y + stall.h / 2 + 30 })
    for (let i = 0; i < 20; i++) game.step(0.05, { move: { x: 0, y: -1 } })
    expect(game.player.y).toBeGreaterThan(stall.y + stall.h / 2 - stall.h * 0.5)
  })
})
