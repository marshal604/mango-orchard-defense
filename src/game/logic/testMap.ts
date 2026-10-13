import { DEFAULT_MAP, type GameMap } from './map'

// Default layout with no procedural trees / monkeys / dens, so tests place exactly what they need.
export const emptyMap = (): GameMap => ({
  ...DEFAULT_MAP,
  zones: DEFAULT_MAP.zones.map((z) => ({
    ...z,
    counts: { smallTree: 0, bigTree: 0, monkey: 0, bigMonkey: 0, den: 0 },
  })),
  pavilions: [],
  iceShops: [],
  chiliFields: [],
  processionPath: [],
})
