import Phaser from 'phaser'
import { CustomerQueue } from './customers'
import { PlayerInput } from './input'
import type { Game, GameEvent } from './logic/game'
import type { Goose, Worker } from './logic/entities'
import { padOf, type ZoneId } from './logic/map'
import { addSprite, preloadSprites, setTexture, type Sprite } from './sprites'

const ZONE_STYLE: Record<ZoneId, { color: number; tile: string }> = {
  lakeside: { color: 0x2c6c3c, tile: 'tile_lake' },
  wetland: { color: 0x6b5a3a, tile: 'tile_wetland' },
  park: { color: 0x4ca83c, tile: 'tile_park' },
  arena: { color: 0x8c8c9c, tile: 'tile_arena' },
}

const GOOSE_KEY: Record<Goose['size'], string> = { small: 'goose', big: 'big_goose', king: 'goose_king' }

export interface SceneHooks {
  game: Game
  onEvents: (events: GameEvent[]) => void
  isPaused: () => boolean
}

export class WorldScene extends Phaser.Scene {
  private hooks!: SceneHooks
  private input2!: PlayerInput
  private player!: Sprite
  private bars!: Phaser.GameObjects.Graphics
  private sprites = new Map<number, Sprite>()
  private stumped = new Set<number>()
  private customers: CustomerQueue | null = null
  private workerSprites = new Map<Worker, Sprite>()
  private runners: Sprite[] = []
  private trapLabel!: Phaser.GameObjects.Text

  constructor() {
    super('world')
  }

  init(hooks: SceneHooks) {
    this.hooks = hooks
  }

  preload() {
    preloadSprites(this)
  }

  create() {
    const { game } = this.hooks
    this.drawGround()
    for (const b of game.map.buildings) {
      const s = addSprite(this, b.id, b.x, b.y + b.h / 2).setDepth(b.y + b.h / 2)
      if (s instanceof Phaser.GameObjects.Image) s.setScale(Math.min(b.w / s.width, (b.h * 1.2) / s.height))
      const pad = padOf(b)
      this.add.ellipse(pad.x, pad.y, 60, 30, 0xf8b800, 0.35).setStrokeStyle(2, 0xf8b800).setDepth(1)
      this.add.text(b.x, b.y - b.h / 2 - 10, b.name, { fontSize: '20px', color: '#f8f8f8', stroke: '#000', strokeThickness: 4 })
        .setOrigin(0.5, 1).setDepth(1e6)
    }
    for (const p of game.map.shades) addSprite(this, 'shade_tent', p.x, p.y + 20).setDepth(p.y + 20)
    for (const p of game.map.lockers) addSprite(this, 'locker_room', p.x, p.y + 35).setDepth(p.y + 35)
    for (const p of game.map.roasts) addSprite(this, 'roast_stand', p.x, p.y + 20).setDepth(p.y + 20)
    if (game.marathon) {
      const kinds = ['customer_a', 'customer_b', 'customer_c']
      this.runners = Array.from({ length: 18 }, (_, i) => addSprite(this, kinds[i % 3], 0, 0))
    }
    this.trapLabel = this.add.text(0, 0, '', { fontSize: '22px', color: '#f8b800', stroke: '#000', strokeThickness: 4 })
      .setOrigin(0.5, 1).setDepth(1e6)
    const stall = game.map.buildings.find((b) => b.id === 'stall')
    if (stall) this.customers = new CustomerQueue(this, padOf(stall))
    this.player = addSprite(this, 'player', game.player.x, game.player.y)
    this.bars = this.add.graphics().setDepth(1e6)

    const cam = this.cameras.main
    cam.setBounds(0, 0, game.map.width, game.map.height)
    cam.setZoom(0.7)
    cam.startFollow(this.player, true, 0.15, 0.15)
    this.input2 = new PlayerInput(this)
  }

  update(_time: number, deltaMs: number) {
    if (this.hooks.isPaused()) return
    const { game } = this.hooks
    game.step(Math.min(deltaMs / 1000, 0.1), this.input2.read())
    this.syncPlayer()
    this.syncWorld()
    this.drawBars()
    const events = game.drainEvents()
    for (const e of events) this.renderEvent(e)
    if (events.length) this.hooks.onEvents(events)
  }

  private drawGround() {
    for (const z of this.hooks.game.map.zones) {
      const { color, tile } = ZONE_STYLE[z.id]
      if (this.textures.exists(tile)) {
        this.add.tileSprite(z.rect.x, z.rect.y, z.rect.w, z.rect.h, tile).setOrigin(0, 0).setTileScale(0.5)
      } else {
        this.add.rectangle(z.rect.x, z.rect.y, z.rect.w, z.rect.h, color).setOrigin(0, 0)
      }
    }
  }

  private syncPlayer() {
    const { game } = this.hooks
    const p = this.player
    const s = game.status
    const bob = s.moving ? Math.abs(Math.sin(game.elapsed * 14)) * 4 : 0
    p.setPosition(game.player.x, game.player.y - bob).setDepth(game.player.y)
    p.setAlpha(game.run.dead ? 0.4 : 1).setVisible(!game.trapped)
    const trap = game.trapped
    this.trapLabel.setVisible(!!trap)
    if (trap) this.trapLabel.setText(`${trap.kind === 'locker' ? '換衣中' : '吃烤鵝'} ${Math.ceil(trap.left)}`).setPosition(trap.at.x, trap.at.y - 80)
    if (p instanceof Phaser.GameObjects.Image) {
      if (s.facing === 'left' || s.facing === 'right') p.setFlipX(s.facing === 'left')
      const swinging = game.elapsed < s.swingUntil
      const base = 56 / p.height
      p.setScale(swinging ? base * 1.08 : base, swinging ? base * 0.94 : base)
      if (s.poisonLeft > 0) p.setTint(0x9cff6a)
      else if (s.slowLeft > 0) p.setTint(0x8fb8ff)
      else if (s.lockerLeft > 0) p.setTint(0xffa060)
      else if (s.burnAbilityLeft > 0) p.setTint(0xffd060)
      else p.clearTint()
    }
  }

  private track(id: number, make: () => Sprite): Sprite {
    let s = this.sprites.get(id)
    if (!s) {
      s = make()
      this.sprites.set(id, s)
    }
    return s
  }

  private syncWorld() {
    const { game } = this.hooks
    for (const t of game.trees) {
      const s = this.track(t.id, () => addSprite(this, t.big ? 'cork_oak' : 'cork_tree', t.x, t.y).setDepth(t.y))
      if (!t.alive && !this.stumped.has(t.id)) {
        this.stumped.add(t.id)
        setTexture(this, s, 'stump')
        s.setDepth(t.y - 1000)
      }
    }
    for (const n of game.nests) {
      this.track(n.id, () => addSprite(this, 'goose_nest', n.x, n.y).setDepth(n.y)).setVisible(n.alive)
    }
    for (const g of game.geese) this.syncGoose(g)
    for (const w of game.workers) this.syncWorker(w)
    this.syncMarathon()
    const live = new Set(game.piles.map((p) => p.id))
    for (const p of game.piles) {
      this.track(p.id, () => addSprite(this, p.feather > 0 ? 'icon_feather' : 'icon_cork', p.x, p.y).setDepth(p.y - 1).setData('pile', true))
    }
    for (const [id, s] of this.sprites) {
      if (s.getData('pile') && !live.has(id)) {
        s.destroy()
        this.sprites.delete(id)
      }
    }
  }

  private syncGoose(g: Goose) {
    const s = this.sprites.get(g.id)
    if (!g.alive) {
      if (s && !s.getData('dying')) {
        s.setData('dying', true)
        this.tweens.add({ targets: s, alpha: 0, duration: 200, onComplete: () => { s.destroy(); this.sprites.delete(g.id) } })
      }
      return
    }
    const sprite = this.track(g.id, () => addSprite(this, GOOSE_KEY[g.size], g.x, g.y))
    const hop = g.biting ? Math.abs(Math.sin(this.hooks.game.elapsed * 20)) * 4 : 0
    sprite.setPosition(g.x, g.y - hop).setDepth(g.y)
    if (sprite instanceof Phaser.GameObjects.Image) sprite.setFlipX(g.facingRight)
  }

  private syncMarathon() {
    const m = this.hooks.game.marathon
    if (!m) return
    const [a, b] = [m.path[0], m.path[m.path.length - 1]]
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const dir = { x: ((b.x - a.x) / len) * m.dir, y: ((b.y - a.y) / len) * m.dir }
    const t = this.hooks.game.elapsed
    this.runners.forEach((r, i) => {
      const back = Math.floor(i / 2) * 85 + 20
      const side = i % 2 === 0 ? -14 : 14
      const x = m.head.x - dir.x * back - dir.y * side
      const y = m.head.y - dir.y * back + dir.x * side - Math.abs(Math.sin(t * 12 + i)) * 4
      r.setPosition(x, y).setDepth(y)
      if (r instanceof Phaser.GameObjects.Image) r.setFlipX(dir.x < 0)
    })
  }

  private syncWorker(w: Worker) {
    let s = this.workerSprites.get(w)
    if (!s) {
      s = addSprite(this, w.kind, w.x, w.y)
      this.workerSprites.set(w, s)
    }
    const prev = s.x
    const busy = w.target !== null && Math.hypot(w.target.x - w.x, w.target.y - w.y) < 80
    const hop = busy ? Math.abs(Math.sin(this.hooks.game.elapsed * 12)) * 3 : 0
    s.setPosition(w.x, w.y - hop).setDepth(w.y).setVisible(w.state !== 'down')
    if (s instanceof Phaser.GameObjects.Image && w.x !== prev) s.setFlipX(w.x < prev)
  }

  private drawBars() {
    const { game } = this.hooks
    const g = this.bars.clear()
    const bar = (x: number, y: number, w: number, ratio: number, color: number) => {
      g.fillStyle(0x000000, 0.7).fillRect(x - w / 2 - 2, y - 2, w + 4, 10)
      g.fillStyle(color, 1).fillRect(x - w / 2, y, w * Math.max(0, ratio), 6)
    }
    if (!game.trapped) bar(game.player.x, game.player.y - 72, 48, game.run.hp / game.run.hpMax, 0x5cd85c)
    for (const n of game.nests) if (n.alive && n.hp < 13) bar(n.x, n.y - 70, 48, n.hp / 13, 0xd84c4c)
  }

  private renderEvent(e: GameEvent) {
    if (e.type === 'float') {
      const t = this.add.text(e.x, e.y, e.text, { fontSize: '22px', color: e.color, stroke: '#000', strokeThickness: 4 })
        .setOrigin(0.5).setDepth(1e6)
      this.tweens.add({ targets: t, y: e.y - 40, alpha: 0, duration: 800, onComplete: () => t.destroy() })
    } else if (e.type === 'hit' && e.target !== 'player') {
      const s = this.sprites.get(e.target.id)
      if (s instanceof Phaser.GameObjects.Image) {
        s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL)
        this.time.delayedCall(60, () => s.active && s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY))
      }
    } else if (e.type === 'sale') {
      this.customers?.sale(e.kind, this.hooks.game.player)
    } else if (e.type === 'hit') {
      this.cameras.main.shake(80, 0.004)
    }
  }
}
