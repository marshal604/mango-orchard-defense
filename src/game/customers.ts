import Phaser from 'phaser'
import type { Resource } from './logic/config'
import type { Point } from './logic/map'
import { addSprite, type Sprite } from './sprites'

const KINDS = ['customer_a', 'customer_b', 'customer_c']
const QUEUE = { length: 4, buysEach: 3, dx: -64, spacing: 34 }

// Visual-only queue of customers next to the workshop stall pad.
export class CustomerQueue {
  private scene: Phaser.Scene
  private pad: Point
  private queue: { sprite: Sprite; bought: number }[] = []

  constructor(scene: Phaser.Scene, pad: Point) {
    this.scene = scene
    this.pad = pad
    for (let i = 0; i < QUEUE.length; i++) this.queue.push(this.make(i))
  }

  sale(kind: Resource, from: Point) {
    const front = this.queue[0]
    if (!front) return
    const icon = addSprite(this.scene, kind === 'banana' ? 'icon_banana' : 'icon_mango', from.x, from.y - 30).setDepth(1e6)
    this.scene.tweens.add({ targets: icon, x: front.sprite.x, y: front.sprite.y - 30, duration: 140, onComplete: () => icon.destroy() })
    front.bought++
    if (front.bought < QUEUE.buysEach) return
    this.queue.shift()
    this.scene.tweens.add({ targets: front.sprite, x: front.sprite.x - 160, alpha: 0, duration: 450, onComplete: () => front.sprite.destroy() })
    this.queue.forEach((c, i) => this.scene.tweens.add({ targets: c.sprite, x: this.slotX(i), duration: 160 }))
    this.queue.push(this.make(this.queue.length))
  }

  private slotX(i: number) {
    return this.pad.x + QUEUE.dx - i * QUEUE.spacing
  }

  private make(i: number) {
    const key = KINDS[Math.floor(Math.random() * KINDS.length)]
    const sprite = addSprite(this.scene, key, this.slotX(i) - 120, this.pad.y).setDepth(this.pad.y).setAlpha(0)
    this.scene.tweens.add({ targets: sprite, x: this.slotX(i), alpha: 1, duration: 300 })
    return { sprite, bought: 0 }
  }
}
