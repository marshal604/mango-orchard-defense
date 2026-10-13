import Phaser from 'phaser'
import type { Resource } from './logic/config'
import type { Point } from './logic/map'
import { addSprite, type Sprite } from './sprites'

const KINDS = ['a', 'b', 'c']
const QUEUE = { length: 4, buysEach: 3, dx: -64, spacing: 34, tossMs: 150, tossEveryMs: 60, stepMs: 160, leaveMs: 450, enterFrom: -160 }

// Visual-only queue next to the fruit stand pad (docs/feel-reference.md "Loot and selling").
export class CustomerQueue {
  private scene: Phaser.Scene
  private pad: Point
  private queue: { sprite: Sprite; bought: number }[] = []
  private lastToss = 0
  private made = 0

  constructor(scene: Phaser.Scene, pad: Point) {
    this.scene = scene
    this.pad = pad
    for (let i = 0; i < QUEUE.length; i++) this.queue.push(this.make(i, false))
  }

  sale(kind: Resource, from: Point) {
    const front = this.queue[0]
    if (!front) return
    const now = this.scene.time.now
    if (now - this.lastToss >= QUEUE.tossEveryMs) {
      this.lastToss = now
      const icon = addSprite(this.scene, kind === 'banana' ? 'icon_banana' : 'icon_mango', from.x, from.y - 40).setDepth(1e6)
      this.scene.tweens.add({ targets: icon, x: front.sprite.x, y: front.sprite.y - 40, duration: QUEUE.tossMs, onComplete: () => icon.destroy() })
    }
    front.bought++
    if (front.bought < QUEUE.buysEach) return
    this.queue.shift()
    const s = front.sprite
    this.scene.tweens.add({ targets: s, x: s.x - 20, y: s.y + 70, alpha: 0, duration: QUEUE.leaveMs, onComplete: () => s.destroy() })
    this.queue.forEach((c, i) => this.scene.tweens.add({ targets: c.sprite, x: this.slotX(i), duration: QUEUE.stepMs }))
    this.queue.push(this.make(this.queue.length, true))
  }

  private slotX(i: number) {
    return this.pad.x + QUEUE.dx - i * QUEUE.spacing
  }

  private make(i: number, slideIn: boolean) {
    const kind = KINDS[Math.floor(Math.random() * KINDS.length)]
    const x = this.slotX(i)
    const sprite = addSprite(this.scene, `customer_${kind}_0`, slideIn ? x + QUEUE.enterFrom : x, this.pad.y, 'customer').setDepth(this.pad.y)
    // Stagger the 2-frame idle so the queue does not bob in sync.
    if (this.scene.anims.exists(`customer_${kind}_idle`)) sprite.anims.play({ key: `customer_${kind}_idle`, startFrame: this.made++ % 2 })
    if (slideIn) {
      sprite.setAlpha(0)
      this.scene.tweens.add({ targets: sprite, x, alpha: 1, duration: 300 })
    }
    return { sprite, bought: 0 }
  }
}
