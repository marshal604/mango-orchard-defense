import { DEFAULT_MAP, type GameMap } from './map'

// Default layout with no procedural trees / geese / nests, so tests place exactly what they need.
export const emptyMap = (): GameMap => ({
  ...DEFAULT_MAP,
  zones: DEFAULT_MAP.zones.map((z) => ({
    ...z,
    counts: { smallTree: 0, bigTree: 0, goose: 0, bigGoose: 0, nest: 0 },
  })),
  shades: [],
  lockers: [],
  roasts: [],
  marathonPath: [],
})
