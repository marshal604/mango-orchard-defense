import Phaser from 'phaser'
import type { Input } from './logic/game'

const JOYSTICK = { radius: 48, knob: 22, deadZone: 0.15 }

type KeyName = 'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd'

// Keyboard (WASD / arrows) plus a drag-anywhere virtual joystick.
export class PlayerInput {
  private keys: Record<KeyName, Phaser.Input.Keyboard.Key> | null = null
  private origin: Phaser.Math.Vector2 | null = null
  private vec = { x: 0, y: 0 }
  private base: Phaser.GameObjects.Arc
  private knob: Phaser.GameObjects.Arc

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard
    if (kb) {
      this.keys = {
        up: kb.addKey('UP'), down: kb.addKey('DOWN'), left: kb.addKey('LEFT'), right: kb.addKey('RIGHT'),
        w: kb.addKey('W'), a: kb.addKey('A'), s: kb.addKey('S'), d: kb.addKey('D'),
      }
    }
    this.base = scene.add.circle(0, 0, JOYSTICK.radius, 0x000000, 0.25).setScrollFactor(0).setVisible(false).setDepth(1e7)
    this.knob = scene.add.circle(0, 0, JOYSTICK.knob, 0xffffff, 0.6).setScrollFactor(0).setVisible(false).setDepth(1e7)
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.press(p))
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.drag(p))
    scene.input.on('pointerup', () => this.release())
    scene.input.on('pointerupoutside', () => this.release())
  }

  read(): Input {
    const k = this.keys
    const kx = k ? Number(k.right.isDown || k.d.isDown) - Number(k.left.isDown || k.a.isDown) : 0
    const ky = k ? Number(k.down.isDown || k.s.isDown) - Number(k.up.isDown || k.w.isDown) : 0
    if (kx !== 0 || ky !== 0) return { move: { x: kx, y: ky } }
    return { move: this.vec }
  }

  private press(p: Phaser.Input.Pointer) {
    this.origin = new Phaser.Math.Vector2(p.x, p.y)
    this.base.setPosition(p.x, p.y).setVisible(true)
    this.knob.setPosition(p.x, p.y).setVisible(true)
  }

  private drag(p: Phaser.Input.Pointer) {
    if (!this.origin || !p.isDown) return
    const dx = p.x - this.origin.x
    const dy = p.y - this.origin.y
    const len = Math.hypot(dx, dy)
    const clamped = Math.min(len, JOYSTICK.radius)
    const nx = len ? dx / len : 0
    const ny = len ? dy / len : 0
    this.knob.setPosition(this.origin.x + nx * clamped, this.origin.y + ny * clamped)
    const mag = clamped / JOYSTICK.radius
    this.vec = mag < JOYSTICK.deadZone ? { x: 0, y: 0 } : { x: nx * mag, y: ny * mag }
  }

  private release() {
    this.origin = null
    this.vec = { x: 0, y: 0 }
    this.base.setVisible(false)
    this.knob.setVisible(false)
  }
}
