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
  it('fells a small mango tree in range and puts mango x zone drop in the bag', () => {
    const game = newGame()
    game.teleport(LAKE)
    const tree = game.spawnTree({ x: LAKE.x + 30, y: LAKE.y }, false)
    run(game, 3)
    expect(tree.alive).toBe(false)
    expect(game.run.mango).toBe(2)
  })

  it('ignores targets outside attack range', () => {
    const game = newGame()
    game.teleport(LAKE)
    const tree = game.spawnTree({ x: LAKE.x + 200, y: LAKE.y }, false)
    run(game, 3)
    expect(tree.alive).toBe(true)
  })

  it('cannot damage an old mango oak with a wooden tool and hints to upgrade', () => {
    const game = newGame()
    game.teleport(LAKE)
    const oak = game.spawnTree({ x: LAKE.x + 30, y: LAKE.y }, true)
    game.drainEvents()
    run(game, 3)
    expect(oak.hp).toBe(10)
    expect(game.drainEvents().some((e) => e.type === 'toast')).toBe(true)
  })

  it('attacks a monkey chasing the player before a tree', () => {
    const game = newGame()
    game.teleport(LAKE)
    const tree = game.spawnTree({ x: LAKE.x - 20, y: LAKE.y }, false)
    const monkey = game.spawnMonkey({ x: LAKE.x + 40, y: LAKE.y }, 'small')
    run(game, 0.3)
    expect(monkey.hp).toBeLessThan(4)
    expect(tree.hp).toBe(3)
  })

  it('gives feathers x zone drop when a monkey is defeated', () => {
    const game = newGame()
    game.teleport(LAKE)
    game.spawnMonkey({ x: LAKE.x + 20, y: LAKE.y }, 'small')
    run(game, 4)
    expect(game.run.banana).toBe(2)
    expect(game.run.stats.monkeys).toBe(1)
  })

  it('drops a pile when the bag is full and picks it up after selling space frees up', () => {
    const game = newGame()
    game.teleport(LAKE)
    game.run.mango = 30
    game.spawnTree({ x: LAKE.x + 30, y: LAKE.y }, false)
    run(game, 3)
    expect(game.piles).toHaveLength(1)
    expect(game.piles[0].mango).toBe(2)
    game.run.mango = 0
    game.teleport({ x: game.piles[0].x, y: game.piles[0].y })
    game.step(0.05, idle)
    expect(game.piles).toHaveLength(0)
    expect(game.run.mango).toBe(2)
  })
})

describe('monkeys', () => {
  it('chase the player within sight and bite for base bite x zone damage', () => {
    const game = newGame()
    game.teleport(LAKE)
    game.spawnMonkey({ x: LAKE.x + 150, y: LAKE.y }, 'small')
    game.setTool(-1) // no attacking, isolate the monkey
    run(game, 2)
    expect(game.run.hp).toBeLessThan(170)
    const bites = (170 - game.run.hp) / ((4 / 3) * 2)
    expect(bites).toBeCloseTo(Math.round(bites))
  })

  it('cannot hurt the player inside a building safe area', () => {
    const game = newGame()
    const stall = game.map.buildings.find((b) => b.id === 'stall')!
    game.teleport({ x: stall.x, y: stall.y + 100 })
    game.setTool(-1)
    game.spawnMonkey({ x: stall.x + 20, y: stall.y + 100 }, 'big')
    run(game, 3)
    expect(game.run.hp).toBe(170)
  })

  it('give up the chase when the player runs past the leash', () => {
    const game = newGame()
    game.teleport(LAKE)
    game.setTool(-1)
    const monkey = game.spawnMonkey({ x: LAKE.x + 100, y: LAKE.y }, 'small')
    game.step(0.05, idle)
    expect(monkey.state).toBe('chase')
    run(game, 2.5, { move: { x: 1, y: 0 } })
    expect(monkey.state).not.toBe('chase')
  })

  it('big monkeys scratch the player so they keep bleeding', () => {
    const game = newGame()
    game.teleport(LAKE)
    game.setTool(-1)
    game.spawnMonkey({ x: LAKE.x + 10, y: LAKE.y }, 'big')
    game.step(0.05, idle)
    expect(game.status.scratchLeft).toBeGreaterThan(0)
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
    game.setTool(-1)
    game.spawnMonkey({ x: LAKE.x + 10, y: LAKE.y }, 'small')
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
    game.run.mango = 10
    game.setTool(-1)
    game.spawnMonkey({ x: LAKE.x + 10, y: LAKE.y }, 'small')
    run(game, 1)
    game.revive('restart')
    expect(game.player).toMatchObject({ x: 2510, y: 2400 })
    expect(game.run.money).toBe(0)
    expect(game.run.mango).toBe(0)
  })
})

describe('swing timing', () => {
  it('lands the hit halfway through the swing, not when it starts', () => {
    const game = newGame()
    game.teleport(LAKE)
    const tree = game.spawnTree({ x: LAKE.x + 30, y: LAKE.y }, false)
    game.step(0.01, idle)
    expect(tree.hp).toBe(3)
    expect(game.status.swingUntil).toBeGreaterThan(game.elapsed)
    run(game, 0.25)
    expect(tree.hp).toBe(1.5)
  })

  it('merges loot that falls within 24 px of an existing pile', () => {
    const game = newGame()
    game.teleport(LAKE)
    game.run.mango = 30
    game.spawnTree({ x: LAKE.x + 30, y: LAKE.y }, false)
    game.spawnTree({ x: LAKE.x + 40, y: LAKE.y + 5 }, false)
    run(game, 4)
    expect(game.piles).toHaveLength(1)
    expect(game.piles[0].mango).toBe(4)
  })
})
