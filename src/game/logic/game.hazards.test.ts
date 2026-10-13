import { describe, expect, it } from 'vitest'
import { Game } from './game'
import type { GameMap } from './map'
import { emptyMap } from './testMap'

const idle = { move: { x: 0, y: 0 } }
const run = (game: Game, seconds: number, input = idle) => {
  for (let t = 0; t < seconds; t += 0.05) game.step(0.05, input)
}
const withMap = (patch: Partial<GameMap>) => new Game({ difficulty: 'normal', seed: 5, map: { ...emptyMap(), ...patch } })

const SPOT = { x: 1000, y: 600 }

describe('temple pavilions', () => {
  it('make monkeys give up, regenerate 10 hp/s and take all cash until $2000 is donated', () => {
    const game = withMap({ pavilions: [SPOT] })
    game.setTool(-1)
    game.run.money = 300
    game.run.hp = 50
    const monkey = game.spawnMonkey({ x: SPOT.x + 120, y: SPOT.y }, 'small')
    game.teleport(SPOT)
    run(game, 1)
    expect(monkey.state).not.toBe('chase')
    expect(game.run.money).toBe(0)
    expect(game.run.hp).toBeGreaterThanOrEqual(59)
  })

  it('are free after $2000 has been donated', () => {
    const game = withMap({ pavilions: [SPOT] })
    game.run.money = 2500
    game.teleport(SPOT)
    game.step(0.05, idle)
    game.teleport({ x: SPOT.x + 300, y: SPOT.y })
    game.step(0.05, idle)
    game.run.money = 400
    game.teleport(SPOT)
    game.step(0.05, idle)
    expect(game.run.money).toBe(400)
  })
})

describe('ice rooms', () => {
  it('lock the player for 5 s, then rush mode: faster but draining 2 hp/s for 10 s', () => {
    const game = withMap({ iceShops: [SPOT] })
    game.teleport(SPOT)
    game.step(0.05, idle)
    expect(game.trapped?.kind).toBe('ice')
    const x = game.player.x
    run(game, 4.8, { move: { x: 1, y: 0 } })
    expect(game.player.x).toBe(x)
    run(game, 0.3)
    expect(game.trapped).toBeNull()
    const hp = game.run.hp
    const x0 = game.player.x
    game.step(1, { move: { x: 1, y: 0 } })
    expect(game.player.x - x0).toBeCloseTo(405)
    expect(game.run.hp).toBeCloseTo(hp - 2)
  })

  it('cannot be hurt while locked inside', () => {
    const game = withMap({ iceShops: [SPOT] })
    game.teleport(SPOT)
    game.step(0.05, idle)
    game.spawnMonkey({ x: SPOT.x + 10, y: SPOT.y }, 'big')
    run(game, 2)
    expect(game.run.hp).toBe(170)
  })
})

describe('sports chili stands', () => {
  it('hold the player 5 s then make monkeys they hit keep molting', () => {
    const game = withMap({ chiliFields: [SPOT] })
    game.teleport(SPOT)
    game.step(0.05, idle)
    expect(game.trapped?.kind).toBe('chili')
    run(game, 5.1)
    expect(game.trapped).toBeNull()
    expect(game.status.chiliLeft).toBeGreaterThan(20)
    const monkey = game.spawnMonkey({ x: game.player.x + 30, y: game.player.y }, 'big')
    run(game, 0.5)
    expect(monkey.spicyLeft).toBeGreaterThan(0)
  })
})

describe('the procession', () => {
  it('pushes the player out of the runners instead of letting them walk through', () => {
    const game = withMap({ processionPath: [{ x: 300, y: 1600 }, { x: 4500, y: 1600 }] })
    const runners = game.procession!
    game.teleport({ x: runners.head.x - 100, y: 1600 })
    game.step(0.05, idle)
    expect(Math.abs(game.player.y - 1600)).toBeGreaterThanOrEqual(30)
  })
})

describe('procession passage', () => {
  it('lets the player slip through after 5 s of being blocked', () => {
    const game = withMap({ processionPath: [{ x: 300, y: 1600 }, { x: 4500, y: 1600 }] })
    const p = game.procession!
    let freed = false
    for (let t = 0; t < 7 && !freed; t += 0.05) {
      game.teleport({ x: p.head.x - 100, y: 1600 })
      game.step(0.05, idle)
      freed = Math.abs(game.player.y - 1600) < 1
    }
    expect(freed).toBe(true)
  })
})

describe('fighting from a temple pavilion', () => {
  it('keeps attacking monkeys in range while regenerating', () => {
    const game = withMap({ pavilions: [SPOT] })
    game.teleport(SPOT)
    game.step(0.05, idle)
    const monkey = game.spawnMonkey({ x: SPOT.x + 40, y: SPOT.y }, 'small')
    run(game, 2)
    expect(monkey.alive).toBe(false)
  })

  it('explains the donation with a toast instead of a card that pauses the run', () => {
    const game = withMap({ pavilions: [SPOT] })
    game.run.money = 300
    game.teleport(SPOT)
    game.step(0.05, idle)
    const events = game.drainEvents()
    expect(events.some((e) => e.type === 'notice')).toBe(false)
    expect(events.some((e) => e.type === 'toast' && e.text.includes('$300'))).toBe(true)
  })

  it('keeps chopping trees in range while regenerating', () => {
    const game = withMap({ pavilions: [SPOT] })
    game.teleport(SPOT)
    game.step(0.05, idle)
    const tree = game.spawnTree({ x: SPOT.x + 30, y: SPOT.y }, false)
    run(game, 2)
    expect(tree.alive).toBe(false)
  })
})
