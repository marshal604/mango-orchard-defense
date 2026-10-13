import Phaser from 'phaser'

// Texture key -> display height in world px. Keys match files in public/assets/<key>.png.
export const DISPLAY: Record<string, number> = {
  player: 56,
  picker: 52,
  ranger: 52,
  customer_a: 52,
  customer_b: 52,
  customer_c: 52,
  monkey: 24,
  big_monkey: 40,
  monkey_king: 88,
  monkey_den: 56,
  fruit_tree: 64,
  old_tree: 104,
  picked_tree: 64,
  stall: 110,
  coop: 110,
  toolshop: 110,
  grocery: 110,
  pavilion: 60,
  ice_shop: 70,
  chili_field: 70,
  icon_mango: 20,
  icon_banana: 20,
}

const FALLBACK_COLOR: Record<string, number> = {
  player: 0xffffff, picker: 0x3c8cf0, ranger: 0x3cc86c, monkey: 0xf8f8f8, big_monkey: 0xa8a8b8,
  monkey_king: 0xf8b800, monkey_den: 0x8c6c3c, fruit_tree: 0x2c8c3c, old_tree: 0x1c6c2c, picked_tree: 0x2c8c3c,
  icon_mango: 0xc89c5c, icon_banana: 0xffffff,
}

export const TILE_KEYS = ['tile_village', 'tile_hills', 'tile_deep', 'tile_town'] as const

export function preloadSprites(scene: Phaser.Scene) {
  const base = import.meta.env.BASE_URL
  for (const key of [...Object.keys(DISPLAY), ...TILE_KEYS]) scene.load.image(key, `${base}assets/${key}.png`)
  // Missing art is expected while assets are being generated; fall back to shapes.
  scene.load.on('loaderror', () => undefined)
}

export type Sprite = Phaser.GameObjects.Image | Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle

// Bottom-centred sprite scaled to its display height, or a coloured shape when the texture is missing.
export function addSprite(scene: Phaser.Scene, key: string, x: number, y: number): Sprite {
  const h = DISPLAY[key] ?? 40
  if (scene.textures.exists(key)) {
    const img = scene.add.image(x, y, key).setOrigin(0.5, 1)
    img.setScale(h / img.height)
    return img
  }
  const color = FALLBACK_COLOR[key] ?? 0xff00ff
  if (key.startsWith('icon') || key.includes('monkey')) {
    return scene.add.circle(x, y, h / 2, color).setOrigin(0.5, 1).setStrokeStyle(2, 0x1c1c1c)
  }
  return scene.add.rectangle(x, y, h * 0.8, h, color).setOrigin(0.5, 1).setStrokeStyle(2, 0x1c1c1c)
}

export function setTexture(scene: Phaser.Scene, s: Sprite, key: string) {
  if (!(s instanceof Phaser.GameObjects.Image) || !scene.textures.exists(key)) return
  s.setTexture(key)
  s.setScale((DISPLAY[key] ?? 40) / s.height)
}
