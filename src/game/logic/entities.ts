import type { Point, Zone } from './map'

export type GooseSize = 'small' | 'big' | 'king'

export interface Worker {
  kind: 'ballboy' | 'wrangler'
  x: number
  y: number
  hp: number
  state: 'idle' | 'work' | 'return' | 'down'
  target: Tree | Goose | null
  cork: number
  feather: number
  cd: number
  downLeft: number
  idleTo: Point | null
}

export type Attacker = 'player' | Worker

export interface Tree {
  kind: 'tree'
  id: number
  x: number
  y: number
  big: boolean
  hp: number
  hitRadius: number
  alive: boolean
  zone: Zone
  lockedBy: Worker | null
}

export interface Goose {
  kind: 'goose'
  id: number
  x: number
  y: number
  size: GooseSize
  hp: number
  hpMax: number
  alive: boolean
  zone: Zone
  home: Point
  state: 'wander' | 'chase' | 'return'
  target: Attacker | null
  wanderTo: Point | null
  pauseLeft: number
  biteCd: number
  burnLeft: number
  nest: Nest | null
  lockedBy: Worker | null
  facingRight: boolean
  biting: boolean
}

export interface Nest {
  kind: 'nest'
  id: number
  x: number
  y: number
  hp: number
  alive: boolean
  zone: Zone
  children: number
  spawnCd: number
  respawnLeft: number
}

export interface Pile { id: number; x: number; y: number; cork: number; feather: number }

export type Target = Tree | Goose | Nest
