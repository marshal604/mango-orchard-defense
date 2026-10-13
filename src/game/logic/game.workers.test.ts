import { describe, expect, it } from 'vitest'
import { Game } from './game'
import { padOf } from './map'
import { emptyMap } from './testMap'

const idle = { move: { x: 0, y: 0 } }
const newGame = (difficulty: 'normal' | 'hell' = 'normal') => new Game({ difficulty, seed: 11, map: emptyMap() })
const run = (game: Game, seconds: number) => {
  for (let t = 0; t < seconds; t += 0.05) game.step(0.05, idle)
}
const club = (game: Game) => padOf(game.map.buildings.find((b) => b.id === 'coop')!)
const FAR = { x: 4500, y: 300 }

describe('fruit pickers', () => {
  it('are hired at the coop, harvest the nearest small tree and sell the mango at the stall', () => {
    const game = newGame()
    game.teleport(FAR)
    const c = club(game)
    const tree = game.spawnTree({ x: c.x + 200, y: c.y }, false)
    const oak = game.spawnTree({ x: c.x + 100, y: c.y }, true)
    game.run.money = 120
    game.buy('picker')
    expect(game.workers).toHaveLength(1)
    run(game, 30)
    expect(tree.alive).toBe(false)
    expect(oak.alive).toBe(true)
    expect(game.run.money).toBe(5)
  })

  it('never lock the same tree as another worker', () => {
    const game = newGame()
    game.teleport(FAR)
    const c = club(game)
    game.spawnTree({ x: c.x + 150, y: c.y }, false)
    game.spawnTree({ x: c.x - 150, y: c.y }, false)
    game.run.money = 1000
    game.buy('picker')
    game.buy('picker')
    run(game, 0.1)
    const [a, b] = game.workers
    expect(a.target).not.toBeNull()
    expect(b.target).not.toBeNull()
    expect(a.target).not.toBe(b.target)
  })

  it('work faster with better gear', () => {
    const timeToFell = (tool: number) => {
      const game = newGame()
      game.teleport(FAR)
      const c = club(game)
      game.run.money = 10_000
      game.buy('picker')
      for (let i = 0; i < tool; i++) game.buy('workerTool')
      game.spawnTree({ x: c.x + 40, y: c.y }, false)
      let t = 0
      while (game.run.stats.trees === 0 && t < 10) {
        game.step(0.05, idle)
        t += 0.05
      }
      return t
    }
    expect(timeToFell(2)).toBeLessThan(timeToFell(0))
  })
})

describe('monkey rangers', () => {
  it('hunt monkeys but not the Monkey King', () => {
    const game = newGame()
    game.teleport(FAR)
    const c = club(game)
    const monkey = game.spawnMonkey({ x: c.x + 120, y: c.y }, 'small')
    const king = game.spawnMonkey({ x: c.x - 80, y: c.y }, 'king')
    game.run.money = 150
    game.buy('ranger')
    run(game, 15)
    expect(monkey.alive).toBe(false)
    expect(king.hp).toBe(king.hpMax)
  })

  it('can be knocked down by monkeys on hell and come back after 10 s', () => {
    const game = newGame('hell')
    game.teleport(FAR)
    const c = club(game)
    game.spawnMonkey({ x: c.x + 300, y: c.y + 300 }, 'big')
    game.run.money = 1000
    game.buy('ranger')
    const w = game.workers[0]
    let wentDown = false
    for (let t = 0; t < 40 && !wentDown; t += 0.05) {
      game.step(0.05, idle)
      wentDown = w.state === 'down'
    }
    expect(wentDown).toBe(true)
    run(game, 10.1)
    expect(w.state).not.toBe('down')
  })
})

describe('delivery', () => {
  it('sells the whole bag every 20 s once bought', () => {
    const game = newGame()
    game.teleport(FAR)
    game.run.money = 250
    game.buy('delivery')
    game.run.mango = 4
    game.run.banana = 1
    run(game, 19.9)
    expect(game.run.mango).toBe(4)
    run(game, 0.2)
    expect(game.run.mango).toBe(0)
    expect(game.run.money).toBe(28)
  })
})

describe('milestones', () => {
  it('give a 20% ranger award discount after 60 monkeys', () => {
    const game = newGame()
    game.teleport(FAR)
    game.run.stats.monkeys = 59
    game.spawnMonkey({ x: FAR.x + 10, y: FAR.y }, 'small')
    game.drainEvents()
    run(game, 3)
    expect(game.run.perks.discount).toBe(true)
    expect(game.run.price('tool')).toBe(120)
    expect(game.drainEvents().some((e) => e.type === 'notice')).toBe(true)
  })

  it('trigger overwork after 100 trees, halving worker speed', () => {
    const game = newGame()
    game.teleport(FAR)
    game.run.stats.trees = 99
    game.spawnTree({ x: FAR.x + 20, y: FAR.y }, false)
    run(game, 2)
    expect(game.run.perks.overwork).toBe(true)
  })
})
