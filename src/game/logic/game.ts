import type { Difficulty } from './config'
import { PLAYER } from './config'
import type { GameMap, Point, ZoneId } from './map'
import { DEFAULT_MAP, spawnPoint, zoneAt } from './map'

export interface Input { move: Point }

export type GameEvent =
  | { type: 'zone'; zone: ZoneId }

export interface GameOptions {
  difficulty: Difficulty
  seed: number
  map?: GameMap
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export class Game {
  readonly difficulty: Difficulty
  readonly map: GameMap
  readonly player: Point
  elapsed = 0
  zone: ZoneId
  private events: GameEvent[] = []

  constructor(opts: GameOptions) {
    this.difficulty = opts.difficulty
    this.map = opts.map ?? DEFAULT_MAP
    this.player = spawnPoint(this.map)
    this.zone = zoneAt(this.map, this.player).id
  }

  step(dt: number, input: Input): void {
    this.elapsed += dt
    this.movePlayer(dt, input.move)
    this.trackZone()
  }

  drainEvents(): GameEvent[] {
    const out = this.events
    this.events = []
    return out
  }

  protected emit(e: GameEvent): void {
    this.events.push(e)
  }

  private movePlayer(dt: number, move: Point): void {
    const len = Math.hypot(move.x, move.y)
    if (len === 0) return
    const scale = (Math.min(1, len) * PLAYER.speed * dt) / len
    this.player.x = clamp(this.player.x + move.x * scale, 10, this.map.width - 10)
    this.player.y = clamp(this.player.y + move.y * scale, 30, this.map.height)
  }

  private trackZone(): void {
    const id = zoneAt(this.map, this.player).id
    if (id === this.zone) return
    this.zone = id
    this.emit({ type: 'zone', zone: id })
  }
}
