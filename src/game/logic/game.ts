import type { Difficulty, Resource } from './config'
import { COMBAT, GOOSE, KING, NEST, PLAYER, TREE } from './config'
import type { Attacker, Goose, GooseSize, Nest, Pile, Target, Tree, Worker } from './entities'
import { aggro, gooseStats, updateGoose, type GooseWorld } from './geese'
import type { GameMap, Point, ZoneId } from './map'
import { DEFAULT_MAP, dist, inSafeArea, spawnPoint, zoneAt } from './map'
import { makeRng } from './rng'
import { attackRange, playerSpeed, racketOf, RunState } from './run'
import { makeGoose, makeTree, newId, populate } from './world'

export interface Input { move: Point }

export type GameEvent =
  | { type: 'zone'; zone: ZoneId }
  | { type: 'toast'; text: string }
  | { type: 'float'; x: number; y: number; text: string; color: string }
  | { type: 'hit'; target: Target | 'player' }
  | { type: 'dead' }
  | { type: 'revive' }

export interface GameOptions {
  difficulty: Difficulty
  seed: number
  map?: GameMap
}

export interface PlayerStatus {
  poisonLeft: number
  poisonDps: number
  slowLeft: number
  slowMult: number
  hasteLeft: number
  invulnerableUntil: number
  lastHurt: number
  attackCd: number
  swingUntil: number
  facing: 'down' | 'up' | 'left' | 'right'
  moving: boolean
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export class Game implements GooseWorld {
  readonly difficulty: Difficulty
  readonly map: GameMap
  readonly run: RunState
  readonly rng: () => number
  readonly player: Point
  readonly trees: Tree[]
  readonly geese: Goose[]
  readonly nests: Nest[]
  readonly workers: Worker[] = []
  piles: Pile[] = []
  status: PlayerStatus = {
    poisonLeft: 0, poisonDps: 0, slowLeft: 0, slowMult: 1, hasteLeft: 0,
    invulnerableUntil: 0, lastHurt: 0, attackCd: 0, swingUntil: 0, facing: 'down', moving: false,
  }
  elapsed = 0
  zone: ZoneId
  private noRacket = false
  private needRacketAt = -Infinity
  private events: GameEvent[] = []

  constructor(opts: GameOptions) {
    this.difficulty = opts.difficulty
    this.map = opts.map ?? DEFAULT_MAP
    this.rng = makeRng(opts.seed)
    this.run = new RunState(opts.difficulty)
    this.player = spawnPoint(this.map)
    this.zone = zoneAt(this.map, this.player).id
    const world = populate(this.map, this.rng, opts.difficulty)
    this.trees = world.trees
    this.geese = world.geese
    this.nests = world.nests
  }

  // --- GooseWorld ---
  get width() { return this.map.width }
  get height() { return this.map.height }
  get playerPos() { return this.player }
  get playerAlive() { return !this.run.dead }
  get sightRadius() { return this.run.cfg.sightRadius }
  isGone = (a: Attacker) => (a === 'player' ? this.run.dead : a.state === 'down')
  sheltered = (a: Attacker) => a === 'player' && inSafeArea(this.map, this.player)
  bite = (g: Goose, a: Attacker) => {
    const cfg = this.run.cfg
    const dmg = g.size === 'king' ? cfg.king.bite : (g.size === 'big' ? cfg.bigGooseBite : cfg.gooseBite) * g.zone.damageMult
    if (a !== 'player') return
    if (!this.hurtPlayer(dmg)) return
    if (g.size === 'king') {
      this.poison(cfg.king.poison.dps, cfg.king.poison.sec)
      this.slow(cfg.king.slow.mult, cfg.king.slow.sec)
    } else if (g.size === 'big') {
      this.poison(cfg.bigGoosePoison.dps, cfg.bigGoosePoison.sec)
    }
  }

  // --- public API ---
  step(dt: number, input: Input): void {
    this.elapsed += dt
    this.updatePlayer(dt, input.move)
    for (const g of this.geese) updateGoose(this, g, dt)
    this.trackZone()
  }

  drainEvents(): GameEvent[] {
    const out = this.events
    this.events = []
    return out
  }

  revive(mode: 'keep' | 'restart'): void {
    const run = this.run
    if (!run.dead) return
    run.dead = false
    run.hp = run.hpMax
    if (mode === 'restart') {
      Object.assign(this.player, spawnPoint(this.map))
      run.cork = 0
      run.feather = 0
      run.money = 0
    }
    this.status.invulnerableUntil = this.elapsed + PLAYER.reviveInvulnerable
    this.emit({ type: 'revive' })
  }

  teleport(p: Point): void {
    this.player.x = p.x
    this.player.y = p.y
  }

  // Dev / test hook: -1 disarms the player.
  setRacket(level: number): void {
    this.noRacket = level < 0
    if (level >= 0) this.run.levels.racket = level
  }

  spawnTree(p: Point, big: boolean): Tree {
    const t = makeTree(this.map, p, big)
    this.trees.push(t)
    return t
  }

  spawnGoose(p: Point, size: GooseSize, nest: Nest | null = null): Goose {
    const g = makeGoose(this.map, p, size, this.difficulty, nest)
    this.geese.push(g)
    return g
  }

  protected emit(e: GameEvent): void {
    this.events.push(e)
  }

  // --- player ---
  private updatePlayer(dt: number, move: Point): void {
    const run = this.run
    const s = this.status
    if (run.dead) return
    if (s.poisonLeft > 0) {
      s.poisonLeft -= dt
      run.hp -= s.poisonDps * dt
      s.lastHurt = this.elapsed
      if (run.hp <= 0) return this.die()
    }
    if (s.hasteLeft > 0) s.hasteLeft -= dt
    if (s.slowLeft > 0) s.slowLeft -= dt
    this.movePlayer(dt, move)
    this.attack(dt)
    this.collectPiles()
    this.regen(dt)
  }

  private movePlayer(dt: number, move: Point): void {
    const len = Math.hypot(move.x, move.y)
    this.status.moving = len > 0
    if (len === 0) return
    const s = this.status
    s.facing = Math.abs(move.x) > Math.abs(move.y) ? (move.x < 0 ? 'left' : 'right') : (move.y < 0 ? 'up' : 'down')
    const speed = playerSpeed(this.run.levels) * (s.slowLeft > 0 ? s.slowMult : 1)
    const scale = (Math.min(1, len) * speed * dt) / len
    this.player.x = clamp(this.player.x + move.x * scale, 10, this.map.width - 10)
    this.player.y = clamp(this.player.y + move.y * scale, 30, this.map.height)
  }

  private regen(dt: number): void {
    const run = this.run
    const r = run.cfg.regen
    const ok = r.mode === 'outOfCombat'
      ? this.elapsed - this.status.lastHurt >= r.delay
      : inSafeArea(this.map, this.player)
    if (ok && run.hp < run.hpMax) run.hp = Math.min(run.hpMax, run.hp + r.perSec * dt)
  }

  private hurtPlayer(dmg: number): boolean {
    if (this.run.dead || this.elapsed < this.status.invulnerableUntil) return false
    this.run.hp -= dmg
    this.status.lastHurt = this.elapsed
    this.emit({ type: 'hit', target: 'player' })
    if (this.run.hp <= 0) this.die()
    return true
  }

  private poison(dps: number, sec: number): void {
    const s = this.status
    if (s.poisonLeft <= 0) this.floatAtPlayer('中毒！', '#9cff6a')
    s.poisonDps = s.poisonLeft > 0 ? Math.max(s.poisonDps, dps) : dps
    s.poisonLeft = Math.max(s.poisonLeft, sec)
  }

  private slow(mult: number, sec: number): void {
    const s = this.status
    if (s.slowLeft <= 0) this.floatAtPlayer('變慢！', '#8fb8ff')
    s.slowLeft = Math.max(s.slowLeft, sec)
    s.slowMult = mult
  }

  private die(): void {
    const run = this.run
    run.hp = 0
    run.dead = true
    run.stats.deaths++
    Object.assign(this.status, { poisonLeft: 0, slowLeft: 0, swingUntil: 0 })
    for (const g of this.geese) {
      if (g.target === 'player') {
        g.target = null
        g.state = g.size === 'king' ? 'return' : 'wander'
      }
    }
    this.emit({ type: 'dead' })
  }

  // --- combat ---
  private attackInterval(): number {
    const racket = racketOf(this.run.levels)
    if (!racket) return Infinity
    return racket.interval / (this.status.hasteLeft > 0 ? NEST.haste.mult : 1)
  }

  private attack(dt: number): void {
    const s = this.status
    s.attackCd -= dt
    const racket = racketOf(this.run.levels)
    if (this.noRacket || !racket || s.attackCd > 0) return
    const target = this.pickTarget(racket.canBigTree)
    if (!target) return
    s.attackCd = this.attackInterval()
    s.swingUntil = this.elapsed + s.attackCd
    this.hit(target, racket.damage, 'player')
  }

  private pickTarget(canBigTree: boolean): Target | null {
    const range = attackRange(this.run.levels)
    const p = this.player
    const inRange = (x: number, y: number, r: number) => dist(p, { x, y }) <= range + r
    const nearest = <T extends Target>(list: readonly T[], ok: (t: T) => boolean): T | null => {
      let best: T | null = null
      let bestD = Infinity
      for (const t of list) {
        if (!t.alive || !ok(t)) continue
        const d = dist(p, t)
        if (d < bestD) { bestD = d; best = t }
      }
      return best
    }
    const gooseIn = (g: Goose) => inRange(g.x, g.y, gooseStats(g).hitRadius)
    const found = nearest(this.geese, (g) => g.target === 'player' && gooseIn(g))
      ?? nearest(this.geese, gooseIn)
      ?? nearest(this.nests, (n) => inRange(n.x, n.y, NEST.hitRadius))
      ?? nearest(this.trees, (t) => (canBigTree || !t.big) && inRange(t.x, t.y, t.hitRadius))
    if (found || canBigTree) return found
    const oak = nearest(this.trees, (t) => t.big && inRange(t.x, t.y, t.hitRadius))
    if (oak && this.elapsed - this.needRacketAt > COMBAT.needRacketHintEvery) {
      this.needRacketAt = this.elapsed
      this.emit({ type: 'float', x: oak.x, y: oak.y - 60, text: '需要碳纖拍', color: '#f8b800' })
      this.emit({ type: 'toast', text: '老軟木橡樹要碳纖拍才砍得動：到球拍專賣店升級球拍' })
    }
    return null
  }

  hit(target: Target, damage: number, by: Attacker): void {
    if (!target.alive) return
    target.hp -= damage
    this.emit({ type: 'hit', target })
    if (target.hp > 0) {
      if (target.kind === 'goose') aggro(target, by)
      return
    }
    target.alive = false
    if (target.kind === 'tree') this.fellTree(target, by)
    else if (target.kind === 'goose') this.defeatGoose(target, by)
    else this.destroyNest(target)
  }

  protected fellTree(t: Tree, by: Attacker): void {
    t.lockedBy = null
    this.run.stats.trees++
    this.giveLoot(by, 'cork', Math.round((t.big ? TREE.big.cork : TREE.small.cork) * t.zone.dropMult), t)
  }

  protected defeatGoose(g: Goose, by: Attacker): void {
    g.lockedBy = null
    g.target = null
    if (g.nest) g.nest.children--
    this.run.stats.geese++
    const base = g.size === 'king' ? KING.feathers : GOOSE[g.size].feathers
    this.giveLoot(by, 'feather', Math.round(base * g.zone.dropMult), g)
  }

  protected destroyNest(n: Nest): void {
    this.run.stats.nests++
    n.respawnLeft = NEST.respawnSec
  }

  // --- loot ---
  protected giveLoot(by: Attacker, kind: Resource, amount: number, at: Point): void {
    if (by !== 'player') return this.giveWorkerLoot(by, kind, amount, at)
    const left = this.run.add(kind, amount)
    if (amount - left > 0) this.emit({ type: 'float', x: at.x, y: at.y - 40, text: `+${amount - left}`, color: '#f8f8f8' })
    if (left > 0) this.dropPile(kind, left, at)
  }

  protected giveWorkerLoot(_w: Worker, kind: Resource, amount: number, at: Point): void {
    this.dropPile(kind, amount, at)
  }

  protected dropPile(kind: Resource, amount: number, at: Point): void {
    const pile: Pile = { id: newId(), x: at.x, y: at.y, cork: 0, feather: 0 }
    pile[kind] = amount
    this.piles = [...this.piles, pile]
  }

  private collectPiles(): void {
    const run = this.run
    for (const pile of this.piles) {
      if (run.bagFree <= 0) break
      if (dist(this.player, pile) > PLAYER.pickupRadius) continue
      pile.feather = run.add('feather', pile.feather)
      pile.cork = run.add('cork', pile.cork)
    }
    this.piles = this.piles.filter((p) => p.cork + p.feather > 0)
  }

  private floatAtPlayer(text: string, color: string): void {
    this.emit({ type: 'float', x: this.player.x, y: this.player.y - 60, text, color })
  }

  private trackZone(): void {
    const id = zoneAt(this.map, this.player).id
    if (id === this.zone) return
    this.zone = id
    this.emit({ type: 'zone', zone: id })
  }
}
