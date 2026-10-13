import type { Resource, Track } from './config'
import type { Target } from './entities'
import type { Point, ZoneId } from './map'

export interface Input { move: Point }

export interface Notice { type: 'notice'; title: string; lines: string[]; tone: 'info' | 'warn' }

export type GameEvent =
  | { type: 'zone'; zone: ZoneId }
  | { type: 'toast'; text: string }
  | { type: 'float'; x: number; y: number; text: string; color: string }
  | { type: 'hit'; target: Target | 'player' }
  | { type: 'dead' }
  | { type: 'revive' }
  | { type: 'sale'; kind: Resource }
  | { type: 'bought'; track: Track; level: number }
  | { type: 'buyFail'; track: Track }
  | Notice
  | { type: 'delivery'; amount: number }
  | { type: 'win'; time: number }

export const GOLD = '#f8b800'
