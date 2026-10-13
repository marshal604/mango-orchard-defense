import type { BuildingId, Difficulty, Resource, Track } from './config'
import { BUILDING, COMBAT, GOOSE, KING, NEST, PLAYER, SHADE, TRAPS, TREE } from './config'
import { pickTarget } from './combat'
import { reachMilestones, sellAtStall, tickDelivery, type EconomyClock } from './economy'
import type { Attacker, Goose, GooseSize, Nest, Pile, Target, Tree, Worker } from './entities'
import { GOLD, type GameEvent, type Input } from './events'
import { aggro, forget, updateGoose, type GooseWorld } from './geese'
import { burnTick, makeHazards, moveMarathon, pushOutOfMarathon, stepShade, stepTrap, type HazardState } from './hazards'
import { newPile, nonEmpty, takeFromPile, workerStash } from './loot'
import type { GameMap, Point, ZoneId } from './map'
import { DEFAULT_MAP, dist, inSafeArea, padOf, spawnPoint, zoneAt } from './map'
import { MSG, shadeNotice } from './messages'
import { makeRng } from './rng'
import { attackRange, playerSpeed, racketOf, RunState } from './run'
import { applyPeck, clearAilments, facingOf, freshStatus, tickBuffs, walk, type PeckEffects, type PlayerStatus } from './status'
import { cashOut, damageWorker, makeWorker, updateWorker, type WorkerWorld } from './workers'
import { makeGoose, makeNest, makeTree, populate, tickNests } from './world'

export type { GameEvent, Input } from './events'
export type { PlayerStatus } from './status'

const pushed = <T>(list: T[], item: T): T => {
  list.push(item)
  return item
}

export interface GameOptions {
  difficulty: Difficulty
  seed: number
  map?: GameMap
}

// Headless rules for one Run. Phaser and React only read its state and call its public methods.
export class Game implements GooseWorld, WorkerWorld {
  readonly difficulty: Difficulty
  readonly map: GameMap
  readonly run: RunState
  readonly rng: () => number
  readonly player: Point
  readonly trees: Tree[]
  readonly geese: Goose[]
  readonly nests: Nest[]
  readonly workers: Worker[] = []
  readonly king: Goose
  readonly hazards: HazardState
  piles: Pile[] = []
  status: PlayerStatus = freshStatus()
  elapsed = 0
  finished = false
  zone: ZoneId
  private clock: EconomyClock = { sellCd: 0, deliveryCd: 0 }
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
    this.king = this.spawnGoose(KING.home, 'king')
    this.hazards = makeHazards(this.map)
  }

  get trapped() { return this.hazards.trapped }
  get marathon() { return this.hazards.marathon }

  // --- GooseWorld ---
  get width() { return this.map.width }
  get height() { return this.map.height }
  get playerPos() { return this.player }
  get playerAlive() { return !this.run.dead }
  get sightRadius() { return this.run.cfg.sightRadius }
  isGone = (a: Attacker) => (a === 'player' ? this.run.dead : a.state === 'down')
  sheltered = (a: Attacker) => a === 'player' && (inSafeArea(this.map, this.player) || this.hazards.shaded)
  bite = (g: Goose, a: Attacker) => {
    const cfg = this.run.cfg
    const dmg = g.size === 'king' ? cfg.king.bite : (g.size === 'big' ? cfg.bigGooseBite : cfg.gooseBite) * g.zone.damageMult
    if (a !== 'player') return this.hurtWorker(a, dmg)
    if (!this.hurtPlayer(dmg) || this.run.dead) return
    const fx: PeckEffects = g.size === 'king' ? cfg.king : g.size === 'big' ? { poison: cfg.bigGoosePoison } : {}
    const started = applyPeck(this.status, fx)
    if (started.poisoned) this.floatAtPlayer(MSG.poisoned, '#9cff6a')
    if (started.slowed) this.floatAtPlayer(MSG.slowed, '#8fb8ff')
  }

  // --- WorkerWorld ---
  get levels() { return this.run.levels }
  get perks() { return this.run.perks }
  get clubPad() { return this.padFor('clubhouse') }
  get stallPad() { return this.padFor('stall') }
  takePile = (pile: Pile, w: Worker) => {
    takeFromPile(pile, workerStash(w, this.run.levels))
    this.piles = nonEmpty(this.piles)
  }
  sellWorkerBag = (w: Worker) => {
    const total = cashOut(w, this.run.levels)
    if (total <= 0) return
    this.run.earn(total)
    this.emit({ type: 'float', x: w.x, y: w.y - 60, text: `+$${total}`, color: GOLD })
  }

  // --- public API ---
  step(dt: number, input: Input): void {
    if (this.finished) return
    this.elapsed += dt
    this.updatePlayer(dt, input.move)
    for (const g of this.geese) updateGoose(this, g, dt)
    for (const w of this.workers) updateWorker(this, w, dt)
    for (const { nest, at } of tickNests(this.nests, dt, this.run.cfg.nestSpawnEvery, this.rng, this.map)) {
      this.spawnGoose(at, 'small', nest)
      nest.children++
    }
    for (const g of this.geese) if (g.burnLeft > 0) this.hit(g, burnTick(g, dt), 'player')
    if (this.hazards.marathon) moveMarathon(this.hazards.marathon, dt)
    this.updateEconomy(dt)
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
      this.teleport(spawnPoint(this.map))
      run.cork = 0
      run.feather = 0
      run.money = 0
    }
    this.status.invulnerableUntil = this.elapsed + PLAYER.reviveInvulnerable
    this.emit({ type: 'revive' })
  }

  currentPad(): BuildingId | null {
    if (this.run.dead) return null
    return this.map.buildings.find((b) => dist(this.player, padOf(b)) <= BUILDING.padRadius)?.id ?? null
  }

  buy(track: Track): boolean {
    if (!this.run.buy(track)) {
      this.emit({ type: 'buyFail', track })
      return false
    }
    this.emit({ type: 'bought', track, level: this.run.levels[track] })
    if (track === 'ballboy' || track === 'wrangler') this.workers.push(makeWorker(track, this.clubPad))
    return true
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
    return pushed(this.trees, makeTree(this.map, p, big))
  }

  spawnGoose(p: Point, size: GooseSize, nest: Nest | null = null): Goose {
    return pushed(this.geese, makeGoose(this.map, p, size, this.difficulty, nest))
  }

  spawnNest(p: Point): Nest {
    return pushed(this.nests, makeNest(this.map, p))
  }

  hit(target: Target, damage: number, by: Attacker): void {
    if (!target.alive) return
    target.hp -= damage
    this.emit({ type: 'hit', target })
    if (target.hp > 0) {
      if (target.kind !== 'goose') return
      aggro(target, by)
      if (by === 'player' && this.status.burnAbilityLeft > 0 && target.burnLeft <= 0) target.burnLeft = TRAPS.roast.burn.sec
      return
    }
    target.alive = false
    if (target.kind === 'tree') this.fellTree(target, by)
    else if (target.kind === 'goose') this.defeatGoose(target, by)
    else this.destroyNest(target)
  }

  private emit(e: GameEvent): void {
    this.events.push(e)
  }

  // --- player ---
  private updatePlayer(dt: number, move: Point): void {
    const s = this.status
    if (this.run.dead) return
    if (s.poisonLeft > 0) {
      s.poisonLeft -= dt
      if (this.drain(s.poisonDps * dt)) return
    }
    tickBuffs(s, dt)
    if (this.updateTrap(dt)) return
    if (s.lockerLeft > 0) {
      s.lockerLeft -= dt
      if (this.drain(TRAPS.locker.drainPerSec * dt)) return
    }
    this.updateShade()
    this.movePlayer(dt, move)
    const m = this.hazards.marathon
    const pushed = m && pushOutOfMarathon(m, this.player)
    if (pushed) this.teleport(pushed)
    this.attack(dt)
    this.collectPiles()
    this.regen(dt)
  }

  // Damage over time that ignores invulnerability; returns true if it knocked the player down.
  private drain(amount: number): boolean {
    this.run.hp -= amount
    this.status.lastHurt = this.elapsed
    if (this.run.hp > 0) return false
    this.die()
    return true
  }

  private movePlayer(dt: number, move: Point): void {
    const s = this.status
    const speed = playerSpeed(this.run.levels) * (s.slowLeft > 0 ? s.slowMult : 1) * (s.lockerLeft > 0 ? TRAPS.locker.speedMult : 1)
    s.moving = walk(this.player, move, speed, dt, this.map)
    if (s.moving) s.facing = facingOf(move.x, move.y)
  }

  private regen(dt: number): void {
    const run = this.run
    const r = run.cfg.regen
    const ok = r.mode === 'outOfCombat'
      ? this.elapsed - this.status.lastHurt >= r.delay
      : inSafeArea(this.map, this.player)
    const perSec = (ok ? r.perSec : 0) + (this.hazards.shaded ? SHADE.regenPerSec : 0)
    if (perSec > 0 && run.hp < run.hpMax) run.hp = Math.min(run.hpMax, run.hp + perSec * dt)
  }

  private hurtPlayer(dmg: number): boolean {
    if (this.run.dead || this.hazards.trapped || this.elapsed < this.status.invulnerableUntil) return false
    this.run.hp -= dmg
    this.status.lastHurt = this.elapsed
    this.emit({ type: 'hit', target: 'player' })
    if (this.run.hp <= 0) this.die()
    return true
  }

  private die(): void {
    const run = this.run
    run.hp = 0
    run.dead = true
    run.stats.deaths++
    clearAilments(this.status)
    this.hazards.trapped = null
    forget(this.geese, 'player')
    this.emit({ type: 'dead' })
  }

  // --- hazards ---
  // Returns true while the player is locked inside a trap.
  private updateTrap(dt: number): boolean {
    const step = stepTrap(this.hazards, this.map, this.player, dt)
    if (step.kind === 'locked') return true
    if (step.kind === 'entered') {
      forget(this.geese, 'player')
      this.emit({ type: 'toast', text: MSG.trapEnter(step.trap.kind) })
      return true
    }
    if (step.kind === 'released') {
      this.teleport(step.trap.exit)
      Object.assign(this.status, step.trap.kind === 'locker' ? { lockerLeft: TRAPS.locker.effectSec } : { burnAbilityLeft: TRAPS.roast.abilitySec })
      this.emit({ type: 'toast', text: MSG.trapLeave(step.trap.kind) })
    }
    return false
  }

  private updateShade(): void {
    const fee = stepShade(this.hazards, this.map, this.player, this.run.money)
    if (fee === null) return
    forget(this.geese, 'player')
    if (fee === 0 && this.hazards.donated >= SHADE.freeAfter) return
    this.run.money -= fee
    this.emit(shadeNotice(fee, this.hazards.donated))
  }

  // --- combat ---
  private attack(dt: number): void {
    const s = this.status
    s.attackCd -= dt
    const racket = racketOf(this.run.levels)
    if (this.noRacket || !racket || s.attackCd > 0) return
    const { target, blockedOak } = pickTarget(this.player, attackRange(this.run.levels), racket.canBigTree, this)
    if (blockedOak && this.elapsed - this.needRacketAt > COMBAT.needRacketHintEvery) {
      this.needRacketAt = this.elapsed
      this.emit({ type: 'float', x: blockedOak.x, y: blockedOak.y - 60, text: MSG.needCarbon, color: GOLD })
      this.emit({ type: 'toast', text: MSG.needCarbonToast })
    }
    if (!target) return
    s.attackCd = racket.interval / (s.hasteLeft > 0 ? NEST.haste.mult : 1)
    s.swingUntil = this.elapsed + s.attackCd
    this.hit(target, racket.damage, 'player')
  }

  private fellTree(t: Tree, by: Attacker): void {
    t.lockedBy = null
    this.run.stats.trees++
    this.reachMilestones()
    this.giveLoot(by, 'cork', Math.round((t.big ? TREE.big.cork : TREE.small.cork) * t.zone.dropMult), t)
  }

  private defeatGoose(g: Goose, by: Attacker): void {
    g.lockedBy = null
    g.target = null
    if (g.nest) g.nest.children--
    this.run.stats.geese++
    this.reachMilestones()
    const base = g.size === 'king' ? KING.feathers : GOOSE[g.size].feathers
    this.giveLoot(by, 'feather', Math.round(base * g.zone.dropMult), g)
    if (g.size !== 'king') return
    this.finished = true
    this.emit({ type: 'float', x: g.x, y: g.y - 100, text: MSG.kingDown, color: GOLD })
    this.emit({ type: 'win', time: this.elapsed })
  }

  private destroyNest(n: Nest): void {
    this.run.stats.nests++
    n.respawnLeft = NEST.respawnSec
    this.run.earn(NEST.reward)
    this.status.hasteLeft = NEST.haste.sec
    this.emit({ type: 'float', x: n.x, y: n.y - 60, text: MSG.nestDown, color: GOLD })
  }

  private updateEconomy(dt: number): void {
    for (const kind of sellAtStall(this.run, this.clock, dt, this.currentPad() === 'stall')) this.emit({ type: 'sale', kind })
    const delivered = tickDelivery(this.run, this.clock, dt)
    if (delivered === null) return
    this.emit({ type: 'delivery', amount: delivered })
    this.floatAtPlayer(MSG.delivery(delivered), GOLD)
  }

  private reachMilestones(): void {
    for (const notice of reachMilestones(this.run)) this.emit(notice)
  }

  // --- workers ---
  private padFor(id: BuildingId): Point {
    const b = this.map.buildings.find((x) => x.id === id) ?? this.map.buildings[0]
    return padOf(b)
  }

  private hurtWorker(w: Worker, dmg: number): void {
    if (!this.run.cfg.workersCanDie || !damageWorker(w, dmg)) return
    forget(this.geese, w)
    this.emit({ type: 'toast', text: MSG.workerDown(w) })
  }

  // --- loot ---
  private giveLoot(by: Attacker, kind: Resource, amount: number, at: Point): void {
    const left = by === 'player' ? this.run.add(kind, amount) : workerStash(by, this.run.levels)(kind, amount)
    if (by === 'player' && amount - left > 0) {
      this.emit({ type: 'float', x: at.x, y: at.y - 40, text: `+${amount - left}`, color: '#f8f8f8' })
    }
    if (left > 0) this.piles = [...this.piles, newPile(kind, left, at)]
  }

  private collectPiles(): void {
    const run = this.run
    for (const pile of this.piles) {
      if (run.bagFree <= 0) break
      if (dist(this.player, pile) <= PLAYER.pickupRadius) takeFromPile(pile, (k, n) => run.add(k, n))
    }
    this.piles = nonEmpty(this.piles)
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
