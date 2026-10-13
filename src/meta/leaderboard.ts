import type { Difficulty } from '../game/logic/config'

export interface RunRecord { nickname: string; time: number; date?: string }

type Store = Pick<Storage, 'getItem' | 'setItem'>

const KEY = (d: Difficulty) => `st_board_${d}`
const LIMIT = 50

const isRecord = (v: unknown): v is RunRecord =>
  typeof v === 'object' && v !== null &&
  typeof (v as RunRecord).nickname === 'string' && typeof (v as RunRecord).time === 'number'

export function topRecords(store: Store, d: Difficulty): RunRecord[] {
  try {
    const parsed: unknown = JSON.parse(store.getItem(KEY(d)) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isRecord) : []
  } catch {
    // Corrupted or foreign data: treat as an empty board rather than crash the title screen.
    return []
  }
}

// Saves the record and returns its 1-based rank.
export function addRecord(store: Store, d: Difficulty, record: RunRecord): number {
  const withDate = { ...record, date: record.date ?? new Date().toISOString().slice(0, 10) }
  const board = [...topRecords(store, d), withDate].sort((a, b) => a.time - b.time)
  try {
    store.setItem(KEY(d), JSON.stringify(board.slice(0, LIMIT)))
  } catch {
    // Storage full or blocked (private mode): the rank is still shown, it just is not remembered.
  }
  return board.indexOf(withDate) + 1
}
