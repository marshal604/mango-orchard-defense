export const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const formatMs = (sec: number) => `${formatTime(sec)}.${String(Math.floor((sec % 1) * 100)).padStart(2, '0')}`
