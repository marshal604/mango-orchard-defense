import type { BuildingId, Difficulty, Resource, Track } from './config'
import { BUILDING, COMBAT, ECONOMY, GOOSE, KING, MILESTONES, NEST, PLAYER, SHADE, TRAPS, TREE } from './config'
import type { Attacker, Goose, GooseSize, Nest, Pile, Target, Tree, Worker } from './entities'
import { aggro, gooseStats, updateGoose, type GooseWorld } from './geese'
import { burnTick, makeHazards, moveMarathon, pushOutOfMarathon, trapAt, underShade, type HazardState } from './hazards'
import type { GameMap, Point, ZoneId } from './map'
import { DEFAULT_MAP, dist, inSafeArea, padOf, spawnPoint, zoneAt } from './map'
import { makeRng } from './rng'
import { attackRange, playerSpeed, racketOf, RunState, sellInterval, sellPrice } from './run'
import { knockDown, makeWorker, updateWorker, workerBagFree, type WorkerWorld } from './workers'
import { makeGoose, makeNest, makeTree, newId, populate } from './world'

export interface Input { move: Point }

export type GameEvent =
  | { type: 'zone'; zone: ZoneId }
  | { type: 'toast'; text: string }
  | { type: 'float'; x: number; y: number; text: string; color: string }
  | { type: 'hit'; target: Target | 'player' }
  | { type: 'dead' }
  | { type: 'revive' }
  | { type: 'sale'; kind: Resource }
  | { type: 'bought'; track: Track; level: number }
  | { type: 'buyFail'; track: Track }
  | { type: 'notice'; title: string; lines: string[]; tone: 'info' | 'warn' }
  | { type: 'delivery'; amount: number }
  | { type: 'win'; time: number }

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
  burnAbilityLeft: number
  lockerLeft: number
  invulnerableUntil: number
  lastHurt: number
  attackCd: number
  swingUntil: number
  facing: 'down' | 'up' | 'left' | 'right'
  moving: boolean
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

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
  piles: Pile[] = []
  status: PlayerStatus = {
    poisonLeft: 0, poisonDps: 0, slowLeft: 0, slowMult: 1, hasteLeft: 0, burnAbilityLeft: 0, lockerLeft: 0,
    invulnerableUntil: 0, lastHurt: 0, attackCd: 0, swingUntil: 0, facing: 'down', moving: false,
  }
  elapsed = 0
  finished = false
  zone: ZoneId
  readonly hazards: HazardState
  private sellCd = 0
  private deliveryCd = 0
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
    if (g.size === 'king') {
      this.poison(cfg.king.poison.dps, cfg.king.poison.sec)
      this.slow(cfg.king.slow.mult, cfg.king.slow.sec)
    } else if (g.size === 'big') {
      this.poison(cfg.bigGoosePoison.dps, cfg.bigGoosePoison.sec)
    }
  }

  // --- public API ---
  step(dt: number, input: Input): void {
    if (this.finished) return
    this.elapsed += dt
    this.updatePlayer(dt, input.move)
    for (const g of this.geese) updateGoose(this, g, dt)
    for (const w of this.workers) updateWorker(this, w, dt)
    this.updateNests(dt)
    this.updateBurns(dt)
    if (this.hazards.marathon) moveMarathon(this.hazards.marathon, dt)
    this.updateStall(dt)
    this.updateDelivery(dt)
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
    const t = makeTree(this.map, p, big)
    this.trees.push(t)
    return t
  }

  spawnGoose(p: Point, size: GooseSize, nest: Nest | null = null): Goose {
    const g = makeGoose(this.map, p, size, this.difficulty, nest)
    this.geese.push(g)
    return g
  }

  spawnNest(p: Point): Nest {
    const n = makeNest(this.map, p)
    this.nests.push(n)
    return n
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
    if (s.burnAbilityLeft > 0) s.burnAbilityLeft -= dt
    if (this.updateTrap(dt)) return
    if (s.lockerLeft > 0) {
      s.lockerLeft -= dt
      run.hp -= TRAPS.locker.drainPerSec * dt
      s.lastHurt = this.elapsed
      if (run.hp <= 0) return this.die()
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

  private movePlayer(dt: number, move: Point): void {
    const len = Math.hypot(move.x, move.y)
    this.status.moving = len > 0
    if (len === 0) return
    const s = this.status
    s.facing = Math.abs(move.x) > Math.abs(move.y) ? (move.x < 0 ? 'left' : 'right') : (move.y < 0 ? 'up' : 'down')
    const speed = playerSpeed(this.run.levels) * (s.slowLeft > 0 ? s.slowMult : 1) * (s.lockerLeft > 0 ? TRAPS.locker.speedMult : 1)
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
    const perSec = (ok ? r.perSec : 0) + (this.hazards.shaded ? SHADE.regenPerSec : 0)
    if (perSec > 0 && run.hp < run.hpMax) run.hp = Math.min(run.hpMax, run.hp + perSec * dt)
  }

  // --- hazards ---
  // Returns true while the player is locked inside a trap.
  private updateTrap(dt: number): boolean {
    const h = this.hazards
    const trap = h.trapped
    if (trap) {
      trap.left -= dt
      if (trap.left > 0) return true
      h.trapped = null
      this.teleport(trap.exit)
      if (trap.kind === 'locker') {
        this.status.lockerLeft = TRAPS.locker.effectSec
        this.emit({ type: 'toast', text: `換好球衣了！${TRAPS.locker.effectSec} 秒內跑更快，但每秒掉 ${TRAPS.locker.drainPerSec} 滴血` })
      } else {
        this.status.burnAbilityLeft = TRAPS.roast.abilitySec
        this.emit({ type: 'toast', text: `吃飽了！${TRAPS.roast.abilitySec} 秒內打到的鵝會著火` })
      }
      return false
    }
    const found = trapAt(this.map, this.player)
    if (!found) {
      h.armed = true
      return false
    }
    if (!h.armed) return false
    h.armed = false
    h.trapped = found
    this.dropAggro()
    this.emit({ type: 'toast', text: found.kind === 'locker' ? '誤闖更衣室，被關 5 秒換衣服…' : '被烤鵝攤老闆拉去吃烤鵝，5 秒…' })
    return true
  }

  private updateShade(): void {
    const h = this.hazards
    const now = underShade(this.map, this.player)
    if (now && !h.shaded) {
      this.dropAggro()
      if (h.donated < SHADE.freeAfter) {
        const fee = this.run.money
        this.run.money = 0
        h.donated += fee
        this.emit({
          type: 'notice', tone: 'info', title: '遮陽棚',
          lines: ['遮陽棚是球友會募款搭的，進來要捐出身上所有現金', `（捐了 $${fee}，累積 $${h.donated}／$${SHADE.freeAfter}，滿額後免費）`, `在棚下每秒回 ${SHADE.regenPerSec} 滴血、鵝不會追你`],
        })
      }
    }
    h.shaded = now
  }

  private dropAggro(): void {
    for (const g of this.geese) {
      if (g.target !== 'player') continue
      g.target = null
      g.state = g.size === 'king' ? 'return' : 'wander'
    }
  }

  private updateBurns(dt: number): void {
    for (const g of this.geese) {
      const dmg = burnTick(g, dt)
      if (dmg > 0) this.hit(g, dmg, 'player')
    }
  }

  private hurtPlayer(dmg: number): boolean {
    if (this.run.dead || this.hazards.trapped || this.elapsed < this.status.invulnerableUntil) return false
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
    Object.assign(this.status, { poisonLeft: 0, slowLeft: 0, swingUntil: 0, lockerLeft: 0 })
    this.hazards.trapped = null
    this.dropAggro()
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

  protected fellTree(t: Tree, by: Attacker): void {
    t.lockedBy = null
    this.run.stats.trees++
    this.checkMilestones()
    this.giveLoot(by, 'cork', Math.round((t.big ? TREE.big.cork : TREE.small.cork) * t.zone.dropMult), t)
  }

  protected defeatGoose(g: Goose, by: Attacker): void {
    g.lockedBy = null
    g.target = null
    if (g.nest) g.nest.children--
    this.run.stats.geese++
    this.checkMilestones()
    const base = g.size === 'king' ? KING.feathers : GOOSE[g.size].feathers
    this.giveLoot(by, 'feather', Math.round(base * g.zone.dropMult), g)
    if (g.size !== 'king') return
    this.finished = true
    this.emit({ type: 'float', x: g.x, y: g.y - 100, text: '打倒鵝王！', color: '#f8b800' })
    this.emit({ type: 'win', time: this.elapsed })
  }

  protected destroyNest(n: Nest): void {
    this.run.stats.nests++
    n.respawnLeft = NEST.respawnSec
    this.run.earn(NEST.reward)
    this.status.hasteLeft = NEST.haste.sec
    this.emit({ type: 'float', x: n.x, y: n.y - 60, text: `拆鵝窩 +$${NEST.reward}　攻速 x${NEST.haste.mult}`, color: '#f8b800' })
  }

  private updateNests(dt: number): void {
    const every = this.run.cfg.nestSpawnEvery
    for (const n of this.nests) {
      if (!n.alive) {
        n.respawnLeft -= dt
        if (n.respawnLeft <= 0) Object.assign(n, { alive: true, hp: NEST.hp, spawnCd: 0 })
        continue
      }
      n.spawnCd += dt
      if (n.spawnCd < every) continue
      n.spawnCd = 0
      if (n.children >= NEST.maxAlive) continue
      const angle = this.rng() * Math.PI * 2
      const p = {
        x: clamp(n.x + Math.cos(angle) * NEST.spawnRadius, 10, this.map.width - 10),
        y: clamp(n.y + Math.sin(angle) * NEST.spawnRadius, 30, this.map.height - 10),
      }
      this.spawnGoose(p, 'small', n)
      n.children++
    }
  }

  // --- WorkerWorld ---
  get levels() { return this.run.levels }
  get perks() { return this.run.perks }
  get clubPad() { return this.padFor('clubhouse') }
  get stallPad() { return this.padFor('stall') }

  private padFor(id: BuildingId): Point {
    const b = this.map.buildings.find((x) => x.id === id) ?? this.map.buildings[0]
    return padOf(b)
  }

  takePile = (pile: Pile, w: Worker) => {
    for (const kind of ['feather', 'cork'] as const) {
      const n = Math.min(pile[kind], workerBagFree(w, this.run.levels))
      pile[kind] -= n
      w[kind] += n
    }
    this.piles = this.piles.filter((p) => p.cork + p.feather > 0)
  }

  sellWorkerBag = (w: Worker) => {
    const total = w.cork * sellPrice('cork', this.run.levels) + w.feather * sellPrice('feather', this.run.levels)
    w.cork = 0
    w.feather = 0
    if (total <= 0) return
    this.run.earn(total)
    this.emit({ type: 'float', x: w.x, y: w.y - 60, text: `+$${total}`, color: '#f8b800' })
  }

  private hurtWorker(w: Worker, dmg: number): void {
    if (!this.run.cfg.workersCanDie || w.state === 'down') return
    w.hp -= dmg
    if (w.hp > 0) return
    knockDown(w)
    for (const g of this.geese) {
      if (g.target === w) { g.target = null; g.state = 'wander' }
    }
    this.emit({ type: 'toast', text: `${w.kind === 'ballboy' ? '撿球小弟' : '趕鵝員'}被鵝打倒了，10 秒後在球友會館復活` })
  }

  // --- economy ---
  private updateDelivery(dt: number): void {
    if (this.run.levels.delivery <= 0 || this.run.dead) return
    this.deliveryCd += dt
    const every = ECONOMY.deliveryEvery * (this.run.perks.complaints ? MILESTONES.complaintsDeliveryMult : 1)
    if (this.deliveryCd < every) return
    this.deliveryCd = 0
    if (this.run.bagUsed <= 0) return
    const amount = this.run.sellAll()
    this.emit({ type: 'delivery', amount })
    this.floatAtPlayer(`外送 +$${amount}`, '#f8b800')
  }

  private checkMilestones(): void {
    const { stats, perks } = this.run
    if (!perks.discount && stats.geese >= MILESTONES.geeseForDiscount) {
      this.run.perks = { ...perks, discount: true }
      this.emit({
        type: 'notice', tone: 'info', title: '趕鵝有功',
        lines: [`已經趕走 ${MILESTONES.geeseForDiscount} 隻鵝`, '公園管理處感謝你，之後所有升級打八折'],
      })
    }
    if (!this.run.perks.complaints && stats.trees >= MILESTONES.treesForComplaints) {
      this.run.perks = { ...this.run.perks, complaints: true }
      this.emit({
        type: 'notice', tone: 'warn', title: '公園客訴',
        lines: [`已經砍了 ${MILESTONES.treesForComplaints} 棵樹`, '民眾抗議砍太多樹', '所有工人工作速度變成一半', `外送時間延長 ${MILESTONES.complaintsDeliveryMult} 倍`],
      })
    }
  }

  private updateStall(dt: number): void {
    if (this.currentPad() !== 'stall') {
      this.sellCd = 0
      return
    }
    this.sellCd -= dt
    while (this.sellCd <= 0 && this.run.bagUsed > 0) {
      const kind = this.run.sellOne()
      if (!kind) break
      this.sellCd += sellInterval(this.run.levels)
      this.emit({ type: 'sale', kind })
    }
    if (this.sellCd < 0) this.sellCd = 0
  }

  // --- loot ---
  protected giveLoot(by: Attacker, kind: Resource, amount: number, at: Point): void {
    if (by !== 'player') return this.giveWorkerLoot(by, kind, amount, at)
    const left = this.run.add(kind, amount)
    if (amount - left > 0) this.emit({ type: 'float', x: at.x, y: at.y - 40, text: `+${amount - left}`, color: '#f8f8f8' })
    if (left > 0) this.dropPile(kind, left, at)
  }

  protected giveWorkerLoot(w: Worker, kind: Resource, amount: number, at: Point): void {
    const n = Math.min(amount, workerBagFree(w, this.run.levels))
    w[kind] += n
    if (amount - n > 0) this.dropPile(kind, amount - n, at)
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
