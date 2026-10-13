import Phaser from 'phaser'
import type { Game } from './logic/game'
import type { Den, Monkey, Pile, Tree, Worker } from './logic/entities'
import { workerInterval } from './logic/workers'
import { addSprite, characterScale, dprOf, firstFrame, setTextureKeepHeight, toolArt, type Sprite } from './sprites'

// Keeps Phaser sprites in sync with the headless Game and adds the original's hit feedback
// (docs/feel-reference.md 1: 60 ms white flash, tree wiggle, 200 ms fade, den squash, no hit-stop).

const MONKEY_KEY: Record<Monkey['size'], string> = { small: 'monkey', big: 'big_monkey', king: 'monkey_king' }

export function flash(s: Sprite) {
  s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL)
  s.scene.time.delayedCall(60, () => s.active && s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY))
}

// Plays `key` so exactly one cycle lasts `seconds` (attack anims stretch to the attack interval).
function playOnce(s: Sprite, key: string, seconds: number) {
  const anim = s.scene.anims.get(key)
  if (!anim) return
  s.anims.play({ key, frameRate: anim.frames.length / Math.max(seconds, 0.05), repeat: 0 })
}

function playLoop(s: Sprite, key: string) {
  if (s.anims.currentAnim?.key === key && s.anims.isPlaying) return
  if (s.scene.anims.exists(key)) s.anims.play(key, true)
}

function idle(s: Sprite, texture: string) {
  s.anims.stop()
  if (s.scene.textures.exists(texture)) s.setTexture(texture)
}

export class PlayerView {
  readonly sprite: Sprite
  private scale: number
  private lastSwing = 0
  private hurtUntil = 0

  constructor(scene: Phaser.Scene, game: Game) {
    this.sprite = addSprite(scene, 'player_walk_down_0', game.player.x, game.player.y, 'player')
    this.scale = characterScale(scene, 'player', 'player_walk_down_0')
  }

  hurt(now: number) {
    this.hurtUntil = now + 0.12
  }

  sync(game: Game) {
    const s = this.sprite
    const st = game.status
    s.setPosition(game.player.x, game.player.y).setDepth(game.player.y)
    s.setAlpha(game.run.dead ? 0.4 : 1).setVisible(!game.trapped)
    s.setScale(this.scale)
    const swinging = game.elapsed < st.swingUntil
    if (swinging && st.swingUntil !== this.lastSwing) {
      this.lastSwing = st.swingUntil
      playOnce(s, `player_attack_${toolArt(game.run.levels.tool)}`, st.swingDuration)
    }
    if (swinging) s.setFlipX(st.swingFacesLeft)
    else this.walk(st.moving, st.facing)
    this.tint(game)
  }

  private walk(moving: boolean, facing: Game['status']['facing']) {
    const s = this.sprite
    const dir = facing === 'left' || facing === 'right' ? 'side' : facing
    s.setFlipX(facing === 'left')
    if (moving) playLoop(s, `player_walk_${dir}`)
    else idle(s, firstFrame(`player_walk_${dir}`))
  }

  private tint(game: Game) {
    const s = this.sprite
    const st = game.status
    if (s.tintMode === Phaser.TintModes.FILL) return
    const color = game.elapsed < this.hurtUntil ? 0xff5040
      : st.scratchLeft > 0 ? 0xff9a8a
      : st.sprainLeft > 0 ? 0x8fb8ff
      : st.bellyacheLeft > 0 ? 0xc8ff9a
      : st.chiliLeft > 0 ? 0xffb060
      : null
    if (color === null) s.clearTint()
    else s.setTint(color)
  }
}

export class WorldViews {
  private scene: Phaser.Scene
  private sprites = new Map<number, Sprite>()
  private workers = new Map<Worker, { sprite: Sprite; lastX: number; scale: number; pending: boolean }>()
  private pileLabels = new Map<number, Phaser.GameObjects.Text>()
  private picked = new Set<number>()
  private denDown = new Set<number>()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  sprite(id: number) {
    return this.sprites.get(id)
  }

  sync(game: Game) {
    for (const t of game.trees) this.syncTree(t)
    for (const d of game.dens) this.syncDen(d)
    for (const m of game.monkeys) this.syncMonkey(m)
    for (const w of game.workers) this.syncWorker(w, game)
    this.syncPiles(game.piles)
  }

  wiggleTree(t: Tree) {
    const s = this.sprites.get(t.id)
    if (!s) return
    // Restart rather than stack, so rapid hits never drift the tree off its spot.
    this.scene.tweens.killTweensOf(s)
    s.setX(t.x)
    this.scene.tweens.add({ targets: s, x: t.x + 2, duration: 40, yoyo: true, repeat: 1 })
  }

  private track(id: number, make: () => Sprite) {
    let s = this.sprites.get(id)
    if (!s) {
      s = make()
      this.sprites.set(id, s)
    }
    return s
  }

  private syncTree(t: Tree) {
    const key = t.big ? 'old_tree' : 'fruit_tree'
    const s = this.track(t.id, () => addSprite(this.scene, key, t.x, t.y).setDepth(t.y))
    if (t.alive || this.picked.has(t.id)) return
    this.picked.add(t.id)
    setTextureKeepHeight(s, 'picked_tree', t.big ? 'old_tree' : 'picked_tree')
    s.setAlpha(0.85).setDepth(t.y - 1000)
  }

  private syncDen(d: Den) {
    const s = this.track(d.id, () => addSprite(this.scene, 'monkey_den', d.x, d.y).setDepth(d.y))
    const base = s.getData('base') ?? s.scaleY
    s.setData('base', base)
    if (!d.alive && !this.denDown.has(d.id)) {
      this.denDown.add(d.id)
      this.scene.tweens.add({ targets: s, alpha: 0.25, scaleY: base * 0.4, duration: 250 })
      s.setDepth(d.y - 1000)
    } else if (d.alive && this.denDown.has(d.id)) {
      this.denDown.delete(d.id)
      this.scene.tweens.add({ targets: s, alpha: 1, scaleY: base, duration: 400 })
      s.setDepth(d.y)
    }
  }

  private syncMonkey(m: Monkey) {
    const s = this.sprites.get(m.id)
    if (!m.alive) {
      if (s && !s.getData('dying')) {
        s.setData('dying', true)
        this.scene.tweens.add({ targets: s, alpha: 0, duration: 200, onComplete: () => { s.destroy(); this.sprites.delete(m.id) } })
      }
      return
    }
    const key = MONKEY_KEY[m.size]
    const sprite = this.track(m.id, () => {
      const made = addSprite(this.scene, `${key}_walk_side_0`, m.x, m.y, key)
      made.setData('scale', characterScale(this.scene, key, `${key}_walk_side_0`))
      return made
    })
    const moved = Math.abs(sprite.x - m.x) + Math.abs(sprite.y - m.y) > 0.01
    sprite.setPosition(m.x, m.y).setDepth(m.y).setScale(sprite.getData('scale')).setFlipX(!m.facingRight)
    if (m.biting) playLoop(sprite, `${key}_attack`)
    else if (moved) playLoop(sprite, `${key}_walk`)
    else sprite.anims.stop()
  }

  private syncWorker(w: Worker, game: Game) {
    let view = this.workers.get(w)
    if (!view) {
      const sprite = addSprite(this.scene, `${w.kind}_walk_side_0`, w.x, w.y, w.kind)
      view = { sprite, lastX: w.x, scale: characterScale(this.scene, w.kind, `${w.kind}_walk_side_0`), pending: false }
      this.workers.set(w, view)
    }
    const s = view.sprite
    const dx = w.x - view.lastX
    view.lastX = w.x
    s.setPosition(w.x, w.y).setDepth(w.y).setVisible(w.state !== 'down').setScale(view.scale)
    const t = w.target
    const working = !!t && w.state === 'work' && Math.hypot(t.x - w.x, t.y - w.y) < 90
    const swingStarted = w.hitPending && !view.pending
    view.pending = w.hitPending
    if (working && t) {
      s.setFlipX(t.x < w.x)
      if (swingStarted) playOnce(s, `${w.kind}_work`, workerInterval(game.levels, game.perks))
      return
    }
    if (Math.abs(dx) > 0.01) s.setFlipX(dx < 0)
    if (Math.abs(dx) > 0.01 || w.state === 'return') playLoop(s, `${w.kind}_walk`)
    else idle(s, `${w.kind}_walk_side_0`)
  }

  private syncPiles(piles: readonly Pile[]) {
    const live = new Set(piles.map((p) => p.id))
    for (const p of piles) {
      const icon = p.banana > 0 ? 'icon_banana' : 'icon_mango'
      this.track(p.id, () => addSprite(this.scene, icon, p.x, p.y).setDepth(p.y).setData('pile', true))
      let label = this.pileLabels.get(p.id)
      if (!label) {
        label = this.scene.add.text(p.x + 12, p.y - 4, '', textStyle(13, '#fcfcfc')).setOrigin(0, 1).setDepth(p.y + 1)
        this.pileLabels.set(p.id, label)
      }
      label.setText(`×${p.mango + p.banana}`)
    }
    for (const [id, s] of this.sprites) {
      if (!s.getData('pile') || live.has(id)) continue
      s.destroy()
      this.sprites.delete(id)
      this.pileLabels.get(id)?.destroy()
      this.pileLabels.delete(id)
    }
  }
}

export const FONT = '"Cubic 11", "PingFang TC", "Noto Sans TC", sans-serif'

export const textStyle = (size: number, color: string, stroke = 4): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#000', strokeThickness: stroke,
  resolution: dprOf(),
})
