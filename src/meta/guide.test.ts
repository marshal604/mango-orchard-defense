import { describe, expect, it } from 'vitest'
import { Game } from '../game/logic/game'
import { padOf } from '../game/logic/map'
import { emptyMap } from '../game/logic/testMap'
import { Guide } from './guide'

const newGame = () => new Game({ difficulty: 'normal', seed: 9, map: emptyMap() })
const pad = (game: Game, id: string) => padOf(game.map.buildings.find((b) => b.id === id)!)

describe('tutorial guide', () => {
  it('starts by asking the player to fill the bag, with no arrow', () => {
    const view = new Guide(true).update(newGame())
    expect(view.panel).toMatchObject({ step: 1, total: 6, title: '採芒果、趕猴子，裝滿背包' })
    expect(view.target).toBeNull()
  })

  it('moves to selling once the bag is 85% full, pointing at the fruit stand', () => {
    const game = newGame()
    const guide = new Guide(true)
    guide.update(game)
    game.run.mango = 26
    const view = guide.update(game)
    expect(view.completed).toBe(true)
    expect(view.panel?.step).toBe(2)
    expect(view.target).toEqual(pad(game, 'stall'))
  })

  it('only points at the coop once the player can afford a picker', () => {
    const game = newGame()
    const guide = new Guide(true)
    game.run.stats.sold = 1
    guide.update(game)
    const poor = guide.update(game)
    expect(poor.panel?.step).toBe(3)
    expect(poor.target).toBeNull()
    expect(poor.panel?.detail).toContain('先存到 $120')
    game.run.money = 120
    expect(guide.update(game).target).toEqual(pad(game, 'coop'))
  })

  it('overrides the step with a red reminder when the bag is nearly full away from the stand', () => {
    const game = newGame()
    const guide = new Guide(true)
    game.run.stats.sold = 1
    guide.update(game)
    game.run.mango = 26
    const view = guide.update(game)
    expect(view.panel?.reminder).toBe(true)
    expect(view.target).toEqual(pad(game, 'stall'))
  })

  it('ends on the Monkey King with a tip for the next affordable upgrade', () => {
    const game = newGame()
    const guide = new Guide(true)
    game.run.stats.sold = 1
    game.run.levels = { ...game.run.levels, picker: 1, tool: 1, bag: 1 }
    game.run.money = 300
    const view = guide.update(game)
    expect(view.panel?.step).toBe(6)
    expect(view.target).toEqual({ x: game.king.x, y: game.king.y })
    expect(view.panel?.tip).toBe('可升級：農具行・採果工具 $300')
  })

  it('shows no panel after the tutorial is done but still points at the King', () => {
    const game = newGame()
    const view = new Guide(false).update(game)
    expect(view.panel).toBeNull()
    expect(view.target).toEqual({ x: game.king.x, y: game.king.y })
  })
})
