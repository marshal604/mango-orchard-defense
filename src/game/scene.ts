import Phaser from 'phaser'
import { CustomerQueue } from './customers'
import { PlayerInput } from './input'
import { DEN, viewZoom } from './logic/config'
import type { Game, GameEvent } from './logic/game'
import { padOf, type Point, type ZoneId } from './logic/map'
import { TRAP_TEXT } from './logic/messages'
import { sellPrice } from './logic/run'
import { sfx } from './sfx'
import { addSprite, createAnims, dprOf, preloadSprites, type Sprite } from './sprites'
import { flash, PlayerView, textStyle, WorldViews } from './views'

const ZONE_STYLE: Record<ZoneId, { color: number; tile: string }> = {
  hills: { color: 0x2c6c3c, tile: 'tile_hills' },
  deep: { color: 0x3c4a2a, tile: 'tile_deep' },
  village: { color: 0x4ca83c, tile: 'tile_village' },
  town: { color: 0x8c8c7c, tile: 'tile_town' },
}

// How far past the map edge the surrounding ground is drawn (covers the largest menu sheet at min zoom).
const OUTSIDE_MARGIN = 1024

export interface GuideTarget { at: Point; label: string; hideWithin: number }

export interface SceneHooks {
  game: Game
  onEvents: (events: GameEvent[]) => void
  isPaused: () => boolean
  guide: () => GuideTarget | null
  // CSS pixels covered at the top by the HUD; the player is centred in the area below it.
  cover: () => number
}

export class WorldScene extends Phaser.Scene {
  private hooks!: SceneHooks
  private input2!: PlayerInput
  private player!: PlayerView
  private views!: WorldViews
  private bars!: Phaser.GameObjects.Graphics
  private arrow!: Phaser.GameObjects.Triangle
  private arrowLabel!: Phaser.GameObjects.Text
  private trapLabel!: Phaser.GameObjects.Text
  private customers: CustomerQueue | null = null
  private runners: Sprite[] = []
  private pavilions: Sprite[] = []
  private guide: GuideTarget | null = null
  private guideCd = 0
  private saleSum = 0
  private saleCd = 0

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
    createAnims(this)
    this.drawGround()
    this.drawBuildings()
    this.pavilions = game.map.pavilions.map((p) => addSprite(this, 'pavilion', p.x, p.y + 30).setDepth(p.y + 30))
    for (const p of game.map.iceShops) addSprite(this, 'ice_shop', p.x, p.y + 35).setDepth(p.y + 35)
    for (const p of game.map.chiliFields) addSprite(this, 'chili_field', p.x, p.y + 30).setDepth(p.y + 30)
    if (game.procession) {
      this.runners = Array.from({ length: 18 }, (_, i) => addSprite(this, i % 2 ? 'procession_b' : 'procession_a', 0, 0, 'procession'))
    }
    const stall = game.map.buildings.find((b) => b.id === 'stall')
    if (stall) this.customers = new CustomerQueue(this, padOf(stall))

    this.views = new WorldViews(this)
    this.player = new PlayerView(this, game)
    this.bars = this.add.graphics().setDepth(1e6 - 1)
    this.arrow = this.add.triangle(0, 0, 0, -10, 24, 0, 0, 10, 0xf8b800).setStrokeStyle(3, 0x000000).setDepth(1e6)
    this.arrowLabel = this.add.text(0, 0, '', textStyle(13, '#f8b800')).setOrigin(0.5).setDepth(1e6)
    this.trapLabel = this.add.text(0, 0, '', textStyle(18, '#f8b800')).setOrigin(0.5, 1).setDepth(1e6)
    const cam = this.cameras.main
    // Hard lock (lerp 1); bounds are kept to the map in fitCamera so no background shows past the edge.
    cam.startFollow(this.player.sprite, true)
    this.fitCamera()
    this.input2 = new PlayerInput(this)
  }

  update(_time: number, deltaMs: number) {
    const { game } = this.hooks
    // Paused (intro, countdown, cards): the world stops but is still drawn in place.
    if (!this.hooks.isPaused()) game.step(Math.min(deltaMs / 1000, 0.1), this.input2.read())
    this.player.sync(game)
    this.views.sync(game)
    this.syncProcession()
    this.syncPavilions()
    this.syncTrapLabel()
    this.drawBars()
    this.drawArrow(deltaMs)
    this.flushSales(deltaMs)
    this.fitCamera()
    if (this.hooks.isPaused()) return
    const events = game.drainEvents()
    for (const e of events) this.renderEvent(e)
    if (events.length) this.hooks.onEvents(events)
  }

  // Zoom 0.7 in CSS pixels; follow offset keeps the player centred between the HUD and an open sheet.
  private fitCamera() {
    const cam = this.cameras.main
    const dpr = dprOf()
    const zoom = dpr * viewZoom(this.scale.width / dpr, this.scale.height / dpr)
    const top = this.hooks.cover()
    cam.setZoom(zoom)
    cam.setFollowOffset(0, (top / 2) * dpr / zoom)
    // Stop at the map edge; extend upward by the HUD so the top row is still visible below it.
    const { width, height } = this.hooks.game.map
    const topWorld = (top * dpr) / zoom
    cam.setBounds(0, -topWorld, width, height + topWorld)
  }

  private drawGround() {
    // Wild mountain ground around the map, so camera moves past the edge (menu sheet, HUD offset)
    // never reveal the background colour.
    const { width, height } = this.hooks.game.map
    const m = OUTSIDE_MARGIN
    if (this.textures.exists('tile_deep')) {
      this.add.tileSprite(-m, -m, width + m * 2, height + m * 2, 'tile_deep').setOrigin(0, 0).setTileScale(0.5).setDepth(-11).setTint(0xb0b0a0)
    } else {
      this.add.rectangle(-m, -m, width + m * 2, height + m * 2, 0x2c3a24).setOrigin(0, 0).setDepth(-11)
    }
    for (const z of this.hooks.game.map.zones) {
      const { color, tile } = ZONE_STYLE[z.id]
      if (this.textures.exists(tile)) {
        this.add.tileSprite(z.rect.x, z.rect.y, z.rect.w, z.rect.h, tile).setOrigin(0, 0).setTileScale(0.5).setDepth(-10)
      } else {
        this.add.rectangle(z.rect.x, z.rect.y, z.rect.w, z.rect.h, color).setOrigin(0, 0).setDepth(-10)
      }
    }
  }

  private drawBuildings() {
    for (const b of this.hooks.game.map.buildings) {
      const base = b.y + b.h / 2
      addSprite(this, b.id, b.x, base).setDepth(base)
      const pad = padOf(b)
      this.add.ellipse(pad.x, pad.y, 96, 33, 0x000000, 0.25).setStrokeStyle(3, 0xffffff, 0.9).setDepth(-5)
      const style = { ...textStyle(18, '#f8b800', 0), backgroundColor: '#000000', padding: { x: 8, y: 3 } }
      this.add.text(b.x, b.y - b.h / 2 - 8, b.name, style).setOrigin(0.5, 1).setDepth(1e6 - 4)
    }
  }

  private syncProcession() {
    const m = this.hooks.game.procession
    if (!m) return
    const [a, b] = [m.path[0], m.path[m.path.length - 1]]
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const dir = { x: ((b.x - a.x) / len) * m.dir, y: ((b.y - a.y) / len) * m.dir }
    const t = this.hooks.game.elapsed
    this.runners.forEach((r, i) => {
      const back = Math.floor(i / 2) * 85 + 20
      const side = i % 2 === 0 ? -14 : 14
      const x = m.head.x - dir.x * back - dir.y * side
      const y = m.head.y - dir.y * back + dir.x * side - Math.abs(Math.sin(t * 10 + i)) * 3
      r.setPosition(x, y).setDepth(y).setFlipX(dir.x < 0)
    })
  }

  // The farmer stands under the roof: fade the pavilion so they stay visible while fighting from it.
  private syncPavilions() {
    const { game } = this.hooks
    game.map.pavilions.forEach((p, i) => {
      const near = Math.hypot(game.player.x - p.x, game.player.y - p.y) < 60
      this.pavilions[i]?.setAlpha(near ? 0.45 : 1)
    })
  }

  private syncTrapLabel() {
    const trap = this.hooks.game.trapped
    this.trapLabel.setVisible(!!trap)
    if (trap) this.trapLabel.setText(`${TRAP_TEXT[trap.kind].locked} ${Math.ceil(trap.left)}`).setPosition(trap.at.x, trap.at.y - 70)
  }

  private drawBars() {
    const { game } = this.hooks
    const g = this.bars.clear()
    const bar = (x: number, y: number, w: number, ratio: number, color: number) => {
      g.fillStyle(0x000000, 0.85).fillRect(x - w / 2 - 2, y - 2, w + 4, 9)
      g.fillStyle(color, 1).fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, ratio)), 5)
    }
    if (!game.run.dead && !game.trapped) {
      const r = game.run.hp / game.run.hpMax
      bar(game.player.x, game.player.y - 68, 54, r, r > 0.5 ? 0x5ce65c : r > 0.25 ? 0xf8d800 : 0xff4040)
    }
    const k = game.king
    if (k.alive) bar(k.x, k.y - 100, 64, k.hp / k.hpMax, 0xd82800)
    for (const d of game.dens) if (d.alive && d.hp < DEN.hp) bar(d.x, d.y - 66, 48, d.hp / DEN.hp, 0xf8b800)
  }

  // Gold arrow orbiting the player's chest toward the guide target, with the target name.
  private drawArrow(deltaMs: number) {
    this.guideCd -= deltaMs
    if (this.guideCd <= 0) {
      this.guideCd = 200
      this.guide = this.hooks.guide()
    }
    const { game } = this.hooks
    const p = game.player
    const t = this.guide
    const d = t ? Math.hypot(t.at.x - p.x, t.at.y - p.y) : 0
    const show = !!t && d > t.hideWithin && !game.trapped && !game.run.dead
    this.arrow.setVisible(show)
    this.arrowLabel.setVisible(show)
    if (!show || !t) return
    const a = Math.atan2(t.at.y - (p.y - 28), t.at.x - p.x)
    this.arrow.setPosition(p.x + Math.cos(a) * 56, p.y - 28 + Math.sin(a) * 56).setRotation(a)
    this.arrowLabel.setText(t.label).setPosition(p.x + Math.cos(a) * 88, p.y - 28 + Math.sin(a) * 82)
  }

  // "+$N" above the stand is aggregated every 0.3 s instead of one float per item.
  private flushSales(deltaMs: number) {
    this.saleCd -= deltaMs
    if (this.saleSum <= 0 || this.saleCd > 0) return
    const stall = this.hooks.game.map.buildings.find((b) => b.id === 'stall')
    if (stall) this.float(stall.x, stall.y - stall.h / 2 - 40, `+$${this.saleSum}`, '#f8b800')
    this.saleSum = 0
    this.saleCd = 300
  }

  private float(x: number, y: number, text: string, color: string, ms = 800) {
    const t = this.add.text(x, y, text, textStyle(15, color)).setOrigin(0.5, 1).setDepth(1e6)
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => t.destroy() })
  }

  private renderEvent(e: GameEvent) {
    const { game } = this.hooks
    if (e.type === 'float') {
      this.float(e.x, e.y, e.text, e.color, e.text.length > 6 ? 1200 : 800)
    } else if (e.type === 'hit') {
      const s = this.views.sprite(e.target.id)
      if (s) flash(s)
      if (e.target.kind === 'tree' && !e.lethal) this.views.wiggleTree(e.target)
      if (e.byPlayer && e.target.kind === 'monkey') sfx.hitMonkey(e.lethal)
      else if (e.byPlayer) sfx.chop(e.lethal)
    } else if (e.type === 'hurt') {
      this.player.hurt(game.elapsed)
      this.cameras.main.shake(80, 0.004)
      sfx.hurt()
    } else if (e.type === 'sale') {
      this.customers?.sale(e.kind, game.player)
      this.saleSum += sellPrice(e.kind, game.run.levels)
      sfx.sale()
    }
  }
}
