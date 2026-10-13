import Phaser from 'phaser'
import type { Game, GameEvent, Input } from './logic/game'
import type { ZoneId } from './logic/map'

const ZONE_COLORS: Record<ZoneId, number> = {
  lakeside: 0x2c6c3c,
  wetland: 0x6b5a3a,
  park: 0x4ca83c,
  arena: 0x8c8c9c,
}

const JOYSTICK = { radius: 48, knob: 22, deadZone: 0.15 }

export interface SceneHooks {
  game: Game
  onEvents: (events: GameEvent[]) => void
  isPaused: () => boolean
}

export class WorldScene extends Phaser.Scene {
  private hooks!: SceneHooks
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>
  private playerSprite!: Phaser.GameObjects.Arc
  private stickBase!: Phaser.GameObjects.Arc
  private stickKnob!: Phaser.GameObjects.Arc
  private touchOrigin: Phaser.Math.Vector2 | null = null
  private touchVec = { x: 0, y: 0 }

  constructor() {
    super('world')
  }

  init(hooks: SceneHooks) {
    this.hooks = hooks
  }

  create() {
    const { game } = this.hooks
    for (const z of game.map.zones) {
      this.add.rectangle(z.rect.x, z.rect.y, z.rect.w, z.rect.h, ZONE_COLORS[z.id]).setOrigin(0, 0)
    }
    this.playerSprite = this.add.circle(game.player.x, game.player.y, 16, 0xffffff).setStrokeStyle(3, 0x1c1c1c)

    const cam = this.cameras.main
    cam.setBounds(0, 0, game.map.width, game.map.height)
    cam.setZoom(0.7)
    cam.startFollow(this.playerSprite, true, 0.15, 0.15)

    const kb = this.input.keyboard
    if (kb) {
      this.keys = {
        up: kb.addKey('UP'), down: kb.addKey('DOWN'), left: kb.addKey('LEFT'), right: kb.addKey('RIGHT'),
        w: kb.addKey('W'), a: kb.addKey('A'), s: kb.addKey('S'), d: kb.addKey('D'),
      }
    }
    this.createJoystick()
  }

  update(_time: number, deltaMs: number) {
    if (this.hooks.isPaused()) return
    const { game } = this.hooks
    game.step(Math.min(deltaMs / 1000, 0.1), this.readInput())
    this.playerSprite.setPosition(game.player.x, game.player.y)
    const events = game.drainEvents()
    if (events.length) this.hooks.onEvents(events)
  }

  private readInput(): Input {
    const k = this.keys
    const kx = k ? Number(k.right.isDown || k.d.isDown) - Number(k.left.isDown || k.a.isDown) : 0
    const ky = k ? Number(k.down.isDown || k.s.isDown) - Number(k.up.isDown || k.w.isDown) : 0
    if (kx !== 0 || ky !== 0) return { move: { x: kx, y: ky } }
    return { move: this.touchVec }
  }

  private createJoystick() {
    this.stickBase = this.add.circle(0, 0, JOYSTICK.radius, 0x000000, 0.25).setScrollFactor(0).setVisible(false).setDepth(1e6)
    this.stickKnob = this.add.circle(0, 0, JOYSTICK.knob, 0xffffff, 0.6).setScrollFactor(0).setVisible(false).setDepth(1e6)
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.touchOrigin = new Phaser.Math.Vector2(p.x, p.y)
      this.stickBase.setPosition(p.x, p.y).setVisible(true)
      this.stickKnob.setPosition(p.x, p.y).setVisible(true)
    })
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.touchOrigin || !p.isDown) return
      const dx = p.x - this.touchOrigin.x
      const dy = p.y - this.touchOrigin.y
      const len = Math.hypot(dx, dy)
      const clamped = Math.min(len, JOYSTICK.radius)
      const nx = len ? dx / len : 0
      const ny = len ? dy / len : 0
      this.stickKnob.setPosition(this.touchOrigin.x + nx * clamped, this.touchOrigin.y + ny * clamped)
      const mag = clamped / JOYSTICK.radius
      this.touchVec = mag < JOYSTICK.deadZone ? { x: 0, y: 0 } : { x: nx * mag, y: ny * mag }
    })
    const release = () => {
      this.touchOrigin = null
      this.touchVec = { x: 0, y: 0 }
      this.stickBase.setVisible(false)
      this.stickKnob.setVisible(false)
    }
    this.input.on('pointerup', release)
    this.input.on('pointerupoutside', release)
  }
}
