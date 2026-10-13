import { describe, expect, it } from 'vitest'
import { KING } from './config'
import { Game } from './game'
import { emptyMap } from './testMap'

const idle = { move: { x: 0, y: 0 } }
const newGame = (difficulty: 'normal' | 'hell' = 'normal') => new Game({ difficulty, seed: 21, map: emptyMap() })
const run = (game: Game, seconds: number, input = idle) => {
  for (let t = 0; t < seconds; t += 0.05) game.step(0.05, input)
}
const FAR = { x: 4500, y: 300 }

describe('monkey dens', () => {
  it('spawn a monkey every 8 s on normal, at most 6 alive', () => {
    const game = newGame()
    game.teleport(FAR)
    const den = game.spawnDen({ x: 3000, y: 600 })
    const before = game.monkeys.length
    run(game, 8.1)
    expect(game.monkeys.length).toBe(before + 1)
    run(game, 80)
    expect(den.children).toBe(6)
  })

  it('pay $200 and double attack speed for 10 s when destroyed, then regrow after 60 s', () => {
    const game = newGame()
    game.teleport(FAR)
    const den = game.spawnDen({ x: FAR.x + 30, y: FAR.y })
    run(game, 6)
    expect(den.alive).toBe(false)
    expect(game.run.money).toBe(200)
    expect(game.status.hasteLeft).toBeGreaterThan(0)
    run(game, 60)
    expect(den.alive).toBe(true)
  })
})

describe('the Monkey King', () => {
  it('waits at its home in the south-west deep', () => {
    const game = new Game({ difficulty: 'normal', seed: 1 })
    expect(game.king).toMatchObject({ x: KING.home.x, y: KING.home.y, hp: 120, size: 'king' })
    expect(new Game({ difficulty: 'hell', seed: 1 }).king.hp).toBe(160)
  })

  it('scratches the player and sprains their ankle', () => {
    const game = newGame()
    game.setTool(-1)
    game.teleport({ x: game.king.x + 20, y: game.king.y })
    run(game, 0.1)
    expect(game.run.hp).toBeCloseTo(170 - 12.48 - 3 * 0.05, 0)
    expect(game.status.scratchLeft).toBeGreaterThan(0)
    expect(game.status.sprainLeft).toBeGreaterThan(0)
  })

  it('does not leave the player bleeding after a fatal scratch', () => {
    const game = newGame()
    game.setTool(-1)
    game.run.hp = 1
    game.teleport({ x: game.king.x + 20, y: game.king.y })
    game.step(0.05, idle)
    expect(game.run.dead).toBe(true)
    game.revive('keep')
    expect(game.status.scratchLeft).toBe(0)
    expect(game.status.sprainLeft).toBe(0)
  })

  it('returns home and regenerates once dragged past its leash', () => {
    const game = newGame()
    const king = game.king
    king.hp = 50
    game.setTool(-1)
    game.teleport({ x: king.x + 150, y: king.y - 100 })
    run(game, 0.05)
    run(game, 8, { move: { x: 1, y: 0 } })
    expect(king.state).not.toBe('chase')
    run(game, 10)
    expect(king.hp).toBeGreaterThan(50)
  })

  it('ends the run with a win when defeated', () => {
    const game = newGame()
    game.king.hp = 1
    game.teleport({ x: game.king.x + 30, y: game.king.y })
    game.drainEvents()
    run(game, 1)
    expect(game.finished).toBe(true)
    expect(game.drainEvents().some((e) => e.type === 'win')).toBe(true)
    const t = game.elapsed
    run(game, 1)
    expect(game.elapsed).toBe(t)
  })
})
