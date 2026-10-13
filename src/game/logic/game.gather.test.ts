import { describe, expect, it } from 'vitest'
import { Game } from './game'
import { emptyMap } from './testMap'

const idle = { move: { x: 0, y: 0 } }
const newGame = (difficulty: 'normal' | 'hell' = 'normal') =>
  new Game({ difficulty, seed: 7, map: emptyMap() })

const run = (game: Game, seconds: number, input = idle) => {
  for (let t = 0; t < seconds; t += 0.05) game.step(0.05, input)
}

// Lakeside (★★, drop x2) spot far from buildings.
const LAKE = { x: 1000, y: 600 }

describe('gathering', () => {
  it('fells a small cork tree in range and puts cork x zone drop in the bag', () => {
    const game = newGame()
    game.teleport(LAKE)
    const tree = game.spawnTree({ x: LAKE.x + 30, y: LAKE.y }, false)
    run(game, 3)
    expect(tree.alive).toBe(false)
    expect(game.run.cork).toBe(2)
  })

  it('ignores targets outside attack range', () => {
    const game = newGame()
    game.teleport(LAKE)
    const tree = game.spawnTree({ x: LAKE.x + 200, y: LAKE.y }, false)
    run(game, 3)
    expect(tree.alive).toBe(true)
  })

  it('cannot damage an old cork oak with a wooden racket and hints to upgrade', () => {
    const game = newGame()
    game.teleport(LAKE)
    const oak = game.spawnTree({ x: LAKE.x + 30, y: LAKE.y }, true)
    game.drainEvents()
    run(game, 3)
    expect(oak.hp).toBe(10)
    expect(game.drainEvents().some((e) => e.type === 'toast')).toBe(true)
  })

  it('attacks a goose chasing the player before a tree', () => {
    const game = newGame()
    game.teleport(LAKE)
    const tree = game.spawnTree({ x: LAKE.x - 20, y: LAKE.y }, false)
    const goose = game.spawnGoose({ x: LAKE.x + 40, y: LAKE.y }, 'small')
    game.step(0.05, idle)
    expect(goose.hp).toBeLessThan(4)
    expect(tree.hp).toBe(3)
  })

  it('gives feathers x zone drop when a goose is defeated', () => {
    const game = newGame()
    game.teleport(LAKE)
    game.spawnGoose({ x: LAKE.x + 20, y: LAKE.y }, 'small')
    run(game, 4)
    expect(game.run.feather).toBe(2)
    expect(game.run.stats.geese).toBe(1)
  })

  it('drops a pile when the bag is full and picks it up after selling space frees up', () => {
    const game = newGame()
    game.teleport(LAKE)
    game.run.cork = 30
    game.spawnTree({ x: LAKE.x + 30, y: LAKE.y }, false)
    run(game, 3)
    expect(game.piles).toHaveLength(1)
    expect(game.piles[0].cork).toBe(2)
    game.run.cork = 0
    game.teleport({ x: game.piles[0].x, y: game.piles[0].y })
    game.step(0.05, idle)
    expect(game.piles).toHaveLength(0)
    expect(game.run.cork).toBe(2)
  })
})

describe('geese', () => {
  it('chase the player within sight and bite for base bite x zone damage', () => {
    const game = newGame()
    game.teleport(LAKE)
    game.spawnGoose({ x: LAKE.x + 150, y: LAKE.y }, 'small')
    game.setRacket(-1) // no attacking, isolate the goose
    run(game, 2)
    expect(game.run.hp).toBeLessThan(170)
    const bites = (170 - game.run.hp) / ((4 / 3) * 2)
    expect(bites).toBeCloseTo(Math.round(bites))
  })

  it('cannot hurt the player inside a building safe area', () => {
    const game = newGame()
    const stall = game.map.buildings.find((b) => b.id === 'stall')!
    game.teleport({ x: stall.x, y: stall.y + 100 })
    game.setRacket(-1)
    game.spawnGoose({ x: stall.x + 20, y: stall.y + 100 }, 'big')
    run(game, 3)
    expect(game.run.hp).toBe(170)
  })

  it('give up the chase when the player runs past the leash', () => {
    const game = newGame()
    game.teleport(LAKE)
    game.setRacket(-1)
    const goose = game.spawnGoose({ x: LAKE.x + 100, y: LAKE.y }, 'small')
    game.step(0.05, idle)
    expect(goose.state).toBe('chase')
    run(game, 2.5, { move: { x: 1, y: 0 } })
    expect(goose.state).not.toBe('chase')
  })

  it('big geese poison the player', () => {
    const game = newGame()
    game.teleport(LAKE)
    game.setRacket(-1)
    game.spawnGoose({ x: LAKE.x + 10, y: LAKE.y }, 'big')
    game.step(0.05, idle)
    expect(game.status.poisonLeft).toBeGreaterThan(0)
  })
})

describe('health', () => {
  it('regenerates 2/s after 5 s out of combat on normal', () => {
    const game = newGame()
    game.teleport(LAKE)
    game.run.hp = 100
    run(game, 4.9)
    expect(game.run.hp).toBe(100)
    run(game, 1)
    expect(game.run.hp).toBeGreaterThan(100)
  })

  it('only regenerates in a safe area on hell', () => {
    const game = newGame('hell')
    game.teleport(LAKE)
    game.run.hp = 20
    run(game, 8)
    expect(game.run.hp).toBe(20)
  })

  it('knocks the player down at 0 hp and revives in place with full hp', () => {
    const game = newGame()
    game.teleport(LAKE)
    game.run.hp = 1
    game.setRacket(-1)
    game.spawnGoose({ x: LAKE.x + 10, y: LAKE.y }, 'small')
    run(game, 1)
    expect(game.run.dead).toBe(true)
    game.revive('keep')
    expect(game.run.dead).toBe(false)
    expect(game.run.hp).toBe(170)
    expect(game.player.x).toBeCloseTo(LAKE.x)
  })

  it('restart revive returns to spawn and loses bag and money', () => {
    const game = newGame()
    game.teleport(LAKE)
    game.run.hp = 1
    game.run.money = 500
    game.run.cork = 10
    game.setRacket(-1)
    game.spawnGoose({ x: LAKE.x + 10, y: LAKE.y }, 'small')
    run(game, 1)
    game.revive('restart')
    expect(game.player).toMatchObject({ x: 2510, y: 2400 })
    expect(game.run.money).toBe(0)
    expect(game.run.cork).toBe(0)
  })
})
