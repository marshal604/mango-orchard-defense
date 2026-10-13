import Phaser from 'phaser'
import { TOOLS } from './logic/config'

// Art is authored at 2x (docs/ui-reference.md 1.5): every sprite is scaled so its height matches DISPLAY.
export const DISPLAY: Record<string, number> = {
  player: 56, picker: 52, ranger: 52, customer: 52, procession: 52,
  monkey: 28, big_monkey: 40, monkey_king: 88,
  monkey_den: 56, fruit_tree: 64, old_tree: 104, picked_tree: 64,
  stall: 110, coop: 110, toolshop: 110, grocery: 110,
  pavilion: 70, ice_shop: 70, chili_field: 70,
  icon_mango: 22, icon_banana: 22, icon_coin: 18,
}

const FRAMES = [0, 1, 2, 3]

// Frame sequences per animation key, matching docs/assets.md sheet/row names.
const ANIMS: Record<string, { frames: string[]; fps: number; loop: boolean }> = {}
const seq = (base: string, n = 4) => FRAMES.slice(0, n).map((i) => `${base}_${i}`)
const def = (key: string, frames: string[], fps: number, loop = true) => { ANIMS[key] = { frames, fps, loop } }

for (const dir of ['down', 'up', 'side']) def(`player_walk_${dir}`, seq(`player_walk_${dir}`), 8)
def('player_attack_pole', seq('player_attack_pole'), 12, false)
def('player_attack_shears', seq('player_tools_attack_shears'), 12, false)
def('player_attack_picker', seq('player_tools_attack_picker'), 12, false)
for (const w of ['picker', 'ranger']) {
  def(`${w}_walk`, seq(`${w}_walk_side`), 8)
  def(`${w}_work`, seq(`${w}_work`), 12, false)
}
for (const m of ['monkey', 'big_monkey', 'monkey_king']) {
  def(`${m}_walk`, seq(`${m}_walk_side`), 8)
  def(`${m}_attack`, seq(`${m}_attack`), 8)
}
for (const c of ['a', 'b', 'c']) def(`customer_${c}_idle`, seq(`customer_${c}`, 2), 2)

const STILLS = [
  'monkey_den', 'fruit_tree', 'old_tree', 'picked_tree', 'stall', 'coop', 'toolshop', 'grocery',
  'pavilion', 'ice_shop', 'chili_field', 'procession_a', 'procession_b',
  'icon_mango', 'icon_banana', 'icon_coin', 'tile_village', 'tile_hills', 'tile_deep', 'tile_town',
]

// Tool tiers share art in pairs: pole (0-1), shears (2-3), picker (4-5).
export const toolArt = (level: number) => (['pole', 'pole', 'shears', 'shears', 'picker', 'picker'] as const)[Math.min(level, TOOLS.length - 1)]

export function preloadSprites(scene: Phaser.Scene) {
  const files = new Set([...STILLS, ...Object.values(ANIMS).flatMap((a) => a.frames)])
  for (const key of files) scene.load.image(key, `assets/${key}.png`)
  // Missing frames are tolerated: animations fall back to the frames that exist, sprites to shapes.
  scene.load.on('loaderror', () => undefined)
}

export function createAnims(scene: Phaser.Scene) {
  for (const [key, a] of Object.entries(ANIMS)) {
    const frames = a.frames.filter((f) => scene.textures.exists(f)).map((f) => ({ key: f }))
    if (frames.length === 0 || scene.anims.exists(key)) continue
    scene.anims.create({ key, frames, frameRate: a.fps, repeat: a.loop ? -1 : 0 })
  }
}

export const firstFrame = (key: string) => ANIMS[key]?.frames[0] ?? key

export type Sprite = Phaser.GameObjects.Sprite

const FALLBACK_COLOR: Record<string, number> = {
  player: 0xffffff, picker: 0x3c8cf0, ranger: 0x3cc86c, monkey: 0x8c6c4c, big_monkey: 0x6c4c3c,
  monkey_king: 0xf8b800, monkey_den: 0x8c6c3c, fruit_tree: 0x2c8c3c, old_tree: 0x1c6c2c, picked_tree: 0x4c7c3c,
}

function placeholder(scene: Phaser.Scene) {
  if (scene.textures.exists('__box')) return
  const g = scene.make.graphics({ x: 0, y: 0 }, false)
  g.fillStyle(0xffffff).fillRect(0, 0, 32, 48).lineStyle(4, 0x000000).strokeRect(0, 0, 32, 48)
  g.generateTexture('__box', 32, 48)
  g.destroy()
}

// Bottom-centred sprite scaled to `displayKey`'s height; a tinted box when the texture is missing.
export function addSprite(scene: Phaser.Scene, texture: string, x: number, y: number, displayKey = texture): Sprite {
  const h = DISPLAY[displayKey] ?? 48
  const exists = scene.textures.exists(texture)
  if (!exists) placeholder(scene)
  const s = scene.add.sprite(x, y, exists ? texture : '__box').setOrigin(0.5, 1)
  s.setScale(h / s.height)
  if (!exists) s.setTint(FALLBACK_COLOR[displayKey] ?? 0xff00ff)
  return s
}

// One scale per character, measured on its first walk frame, so attack frames from another sheet
// (with a wider bounding box) do not shrink or grow the body.
export function characterScale(scene: Phaser.Scene, displayKey: string, refTexture: string): number {
  const ref = scene.textures.exists(refTexture) ? scene.textures.getFrame(refTexture) : null
  return (DISPLAY[displayKey] ?? 48) / (ref?.height ?? 48)
}

export function setTextureKeepHeight(s: Sprite, texture: string, displayKey: string) {
  if (!s.scene.textures.exists(texture)) return
  s.setTexture(texture)
  s.setScale((DISPLAY[displayKey] ?? 48) / s.height)
}
