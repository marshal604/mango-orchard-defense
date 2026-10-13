import type { BuildingId, Difficulty, Resource, Track } from './config'
import { BUILDING, COMBAT, MONKEY, KING, DEN, PLAYER, PAVILION, TRAPS, TREE } from './config'
import { pickTarget } from './combat'
import { reachMilestones, sellAtStall, tickDelivery, type EconomyClock } from './economy'
import type { Attacker, Monkey, MonkeySize, Den, Pile, Target, Tree, Worker } from './entities'
import { GOLD, type GameEvent, type Input } from './events'
import { aggro, forget, updateMonkey, type MonkeyWorld } from './monkeys'
import { spicyTick, makeHazards, moveProcession, pushOutOfProcession, stepPavilion, stepTrap, type HazardState } from './hazards'
import { newPile, nonEmpty, takeFromPile, workerStash } from './loot'
import type { GameMap, Point, ZoneId } from './map'
import { DEFAULT_MAP, dist, inSafeArea, padOf, spawnPoint, zoneAt } from './map'
import { MSG, pavilionNotice, TRAP_TEXT } from './messages'
import { makeRng } from './rng'
import { attackRange, playerSpeed, toolOf, RunState } from './run'
import { applyPeck, clearAilments, facingOf, freshStatus, tickBuffs, walk, type PeckEffects, type PlayerStatus } from './status'
import { cashOut, damageWorker, makeWorker, updateWorker, type WorkerWorld } from './workers'
import { makeMonkey, makeDen, makeTree, populate, tickDens } from './world'

export type { GameEvent, Input } from './events'
export type { PlayerStatus } from './status'

const append = <T>(list: T[], item: T): T => {
  list.push(item)
  return item
}

export interface GameOptions {
  difficulty: Difficulty
  seed: number
  map?: GameMap
}

// Headless rules for one Run. Phaser and React only read its state and call its public methods.
export class Game implements MonkeyWorld, WorkerWorld {
  readonly difficulty: Difficulty
  readonly map: GameMap
  readonly run: RunState
  readonly rng: () => number
  readonly player: Point
  readonly trees: Tree[]
  readonly monkeys: Monkey[]
  readonly dens: Den[]
  readonly workers: Worker[] = []
  readonly king: Monkey
  readonly hazards: HazardState
  piles: Pile[] = []
  status: PlayerStatus = freshStatus()
  elapsed = 0
  finished = false
  zone: ZoneId
  private clock: EconomyClock = { sellCd: 0, deliveryCd: 0 }
  private noTool = false
  private needToolAt = -Infinity
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
    this.monkeys = world.monkeys
    this.dens = world.dens
    this.king = this.spawnMonkey(KING.home, 'king')
    this.hazards = makeHazards(this.map)
  }

  get trapped() { return this.hazards.trapped }
  get procession() { return this.hazards.procession }

  // --- MonkeyWorld ---
  get width() { return this.map.width }
  get height() { return this.map.height }
  get playerPos() { return this.player }
  get playerAlive() { return !this.run.dead }
  get sightRadius() { return this.run.cfg.sightRadius }
  isGone = (a: Attacker) => (a === 'player' ? this.run.dead : a.state === 'down')
  sheltered = (a: Attacker) => a === 'player' && (inSafeArea(this.map, this.player) || this.hazards.inPavilion)
  bite = (g: Monkey, a: Attacker) => {
    const cfg = this.run.cfg
    const dmg = g.size === 'king' ? cfg.king.bite : (g.size === 'big' ? cfg.bigMonkeyBite : cfg.monkeyBite) * g.zone.damageMult
    if (a !== 'player') return this.hurtWorker(a, dmg)
    if (!this.hurtPlayer(dmg) || this.run.dead) return
    const fx: PeckEffects = g.size === 'king' ? cfg.king : g.size === 'big' ? { scratch: cfg.bigMonkeyScratch } : {}
    const started = applyPeck(this.status, fx)
    if (started.scratched) this.floatAtPlayer(MSG.scratched, '#ff7060')
    if (started.sprained) this.floatAtPlayer(MSG.sprained, '#8fb8ff')
  }

  // --- WorkerWorld ---
  get levels() { return this.run.levels }
  get perks() { return this.run.perks }
  get coopPad() { return this.padFor('coop') }
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
    for (const g of this.monkeys) updateMonkey(this, g, dt)
    for (const w of this.workers) updateWorker(this, w, dt)
    for (const { den, at } of tickDens(this.dens, dt, this.run.cfg.denSpawnEvery, this.rng, this.map)) {
      this.spawnMonkey(at, 'small', den)
      den.children++
    }
    for (const g of this.monkeys) if (g.spicyLeft > 0) this.hit(g, spicyTick(g, dt), 'player')
    if (this.hazards.procession) moveProcession(this.hazards.procession, dt)
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
      run.mango = 0
      run.banana = 0
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
    if (track === 'picker' || track === 'ranger') this.workers.push(makeWorker(track, this.coopPad))
    return true
  }

  teleport(p: Point): void {
    this.player.x = p.x
    this.player.y = p.y
  }

  // Dev / test hook: -1 disarms the player.
  setTool(level: number): void {
    this.noTool = level < 0
    if (level >= 0) this.run.levels.tool = level
  }

  spawnTree(p: Point, big: boolean): Tree {
    return append(this.trees, makeTree(this.map, p, big))
  }

  spawnMonkey(p: Point, size: MonkeySize, den: Den | null = null): Monkey {
    return append(this.monkeys, makeMonkey(this.map, p, size, this.difficulty, den))
  }

  spawnDen(p: Point): Den {
    return append(this.dens, makeDen(this.map, p))
  }

  hit(target: Target, damage: number, by: Attacker): void {
    if (!target.alive) return
    target.hp -= damage
    this.emit({ type: 'hit', target })
    if (target.hp > 0) {
      if (target.kind !== 'monkey') return
      aggro(target, by)
      if (by === 'player' && this.status.chiliLeft > 0 && target.spicyLeft <= 0) target.spicyLeft = TRAPS.chili.spicy.sec
      return
    }
    target.alive = false
    if (target.kind === 'tree') this.fellTree(target, by)
    else if (target.kind === 'monkey') this.defeatGoose(target, by)
    else this.destroyDen(target)
  }

  private emit(e: GameEvent): void {
    this.events.push(e)
  }

  // --- player ---
  private updatePlayer(dt: number, move: Point): void {
    const s = this.status
    if (this.run.dead) return
    if (s.scratchLeft > 0) {
      s.scratchLeft -= dt
      if (this.drain(s.scratchDps * dt)) return
    }
    tickBuffs(s, dt)
    if (this.updateTrap(dt)) return
    if (s.bellyacheLeft > 0) {
      s.bellyacheLeft -= dt
      if (this.drain(TRAPS.ice.drainPerSec * dt)) return
    }
    this.updatePavilion()
    this.movePlayer(dt, move)
    const m = this.hazards.procession
    const pushed = m && pushOutOfProcession(m, this.player)
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
    const speed = playerSpeed(this.run.levels) * (s.sprainLeft > 0 ? s.sprainMult : 1) * (s.bellyacheLeft > 0 ? TRAPS.ice.speedMult : 1)
    s.moving = walk(this.player, move, speed, dt, this.map)
    if (s.moving) s.facing = facingOf(move.x, move.y)
  }

  private regen(dt: number): void {
    const run = this.run
    const r = run.cfg.regen
    const ok = r.mode === 'outOfCombat'
      ? this.elapsed - this.status.lastHurt >= r.delay
      : inSafeArea(this.map, this.player)
    const perSec = (ok ? r.perSec : 0) + (this.hazards.inPavilion ? PAVILION.regenPerSec : 0)
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
    forget(this.monkeys, 'player')
    this.emit({ type: 'dead' })
  }

  // --- hazards ---
  // Returns true while the player is locked inside a trap.
  private updateTrap(dt: number): boolean {
    const step = stepTrap(this.hazards, this.map, this.player, dt)
    if (step.kind === 'locked') return true
    if (step.kind === 'entered') {
      forget(this.monkeys, 'player')
      this.emit({ type: 'toast', text: TRAP_TEXT[step.trap.kind].enter })
      return true
    }
    if (step.kind === 'released') {
      this.teleport(step.trap.exit)
      if (step.trap.kind === 'ice') this.status.bellyacheLeft = TRAPS.ice.effectSec
      else this.status.chiliLeft = TRAPS.chili.abilitySec
      this.emit({ type: 'toast', text: TRAP_TEXT[step.trap.kind].leave })
    }
    return false
  }

  private updatePavilion(): void {
    const fee = stepPavilion(this.hazards, this.map, this.player, this.run.money)
    if (fee === null) return
    forget(this.monkeys, 'player')
    if (fee === 0 && this.hazards.donated >= PAVILION.freeAfter) return
    this.run.money -= fee
    this.emit(pavilionNotice(fee, this.hazards.donated))
  }

  // --- combat ---
  private attack(dt: number): void {
    const s = this.status
    s.attackCd -= dt
    const tool = toolOf(this.run.levels)
    if (this.noTool || !tool || s.attackCd > 0) return
    const { target, blockedOak } = pickTarget(this.player, attackRange(this.run.levels), tool.canBigTree, this)
    if (blockedOak && this.elapsed - this.needToolAt > COMBAT.needToolHintEvery) {
      this.needToolAt = this.elapsed
      this.emit({ type: 'float', x: blockedOak.x, y: blockedOak.y - 60, text: MSG.needShears, color: GOLD })
      this.emit({ type: 'toast', text: MSG.needShearsToast })
    }
    if (!target) return
    s.attackCd = tool.interval / (s.hasteLeft > 0 ? DEN.haste.mult : 1)
    s.swingUntil = this.elapsed + s.attackCd
    this.hit(target, tool.damage, 'player')
  }

  private fellTree(t: Tree, by: Attacker): void {
    t.lockedBy = null
    this.run.stats.trees++
    this.reachMilestones()
    this.giveLoot(by, 'mango', Math.round((t.big ? TREE.big.mango : TREE.small.mango) * t.zone.dropMult), t)
  }

  private defeatGoose(g: Monkey, by: Attacker): void {
    g.lockedBy = null
    g.target = null
    if (g.den) g.den.children--
    this.run.stats.monkeys++
    this.reachMilestones()
    const base = g.size === 'king' ? KING.bananas : MONKEY[g.size].bananas
    this.giveLoot(by, 'banana', Math.round(base * g.zone.dropMult), g)
    if (g.size !== 'king') return
    this.finished = true
    this.emit({ type: 'float', x: g.x, y: g.y - 100, text: MSG.kingDown, color: GOLD })
    this.emit({ type: 'win', time: this.elapsed })
  }

  private destroyDen(n: Den): void {
    this.run.stats.dens++
    n.respawnLeft = DEN.respawnSec
    this.run.earn(DEN.reward)
    this.status.hasteLeft = DEN.haste.sec
    this.emit({ type: 'float', x: n.x, y: n.y - 60, text: MSG.denDown, color: GOLD })
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
    forget(this.monkeys, w)
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
