import { describe, expect, it } from 'vitest'
import { addRecord, topRecords } from './leaderboard'

const memoryStorage = (): Pick<Storage, 'getItem' | 'setItem'> => {
  const data = new Map<string, string>()
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}

describe('local leaderboard', () => {
  it('sorts by fastest time and reports the new rank', () => {
    const store = memoryStorage()
    expect(addRecord(store, 'normal', { nickname: 'A', time: 300 })).toBe(1)
    expect(addRecord(store, 'normal', { nickname: 'B', time: 200 })).toBe(1)
    expect(addRecord(store, 'normal', { nickname: 'C', time: 250 })).toBe(2)
    expect(topRecords(store, 'normal').map((r) => r.nickname)).toEqual(['B', 'C', 'A'])
  })

  it('keeps separate boards per difficulty', () => {
    const store = memoryStorage()
    addRecord(store, 'hell', { nickname: 'H', time: 500 })
    expect(topRecords(store, 'normal')).toEqual([])
    expect(topRecords(store, 'hell')).toHaveLength(1)
  })

  it('survives corrupted storage', () => {
    const store = memoryStorage()
    store.setItem('st_board_normal', '{not json')
    expect(topRecords(store, 'normal')).toEqual([])
  })
})

describe('leaderboard storage failures', () => {
  it('still reports a rank when the browser refuses to store it', () => {
    const store = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError') } }
    expect(addRecord(store, 'normal', { nickname: 'A', time: 100 })).toBe(1)
  })
})
