import Phaser from 'phaser'

// Texture key -> display height in world px. Keys match files in public/assets/<key>.png.
export const DISPLAY: Record<string, number> = {
  player: 56,
  ballboy: 52,
  wrangler: 52,
  customer_a: 52,
  customer_b: 52,
  customer_c: 52,
  goose: 24,
  big_goose: 40,
  goose_king: 88,
  goose_nest: 56,
  cork_tree: 64,
  cork_oak: 104,
  stump: 36,
  stall: 110,
  clubhouse: 110,
  proshop: 110,
  supply: 110,
  shade_tent: 60,
  locker_room: 70,
  drink_stand: 70,
  icon_cork: 20,
  icon_feather: 20,
  shuttle: 16,
}

const FALLBACK_COLOR: Record<string, number> = {
  player: 0xffffff, ballboy: 0x3c8cf0, wrangler: 0x3cc86c, goose: 0xf8f8f8, big_goose: 0xa8a8b8,
  goose_king: 0xf8b800, goose_nest: 0x8c6c3c, cork_tree: 0x2c8c3c, cork_oak: 0x1c6c2c, stump: 0x8c5c2c,
  icon_cork: 0xc89c5c, icon_feather: 0xffffff,
}

export const TILE_KEYS = ['tile_park', 'tile_lake', 'tile_wetland', 'tile_arena'] as const

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
  if (key.startsWith('icon') || key.includes('goose')) {
    return scene.add.circle(x, y, h / 2, color).setOrigin(0.5, 1).setStrokeStyle(2, 0x1c1c1c)
  }
  return scene.add.rectangle(x, y, h * 0.8, h, color).setOrigin(0.5, 1).setStrokeStyle(2, 0x1c1c1c)
}

export function setTexture(scene: Phaser.Scene, s: Sprite, key: string) {
  if (!(s instanceof Phaser.GameObjects.Image) || !scene.textures.exists(key)) return
  s.setTexture(key)
  s.setScale((DISPLAY[key] ?? 40) / s.height)
}
