// Procedural chiptune sfx + BGM (docs/feel-reference.md 1 "Sound"). No audio files.

const MUTE_KEY = 'st_muted'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let bgmTimer = 0
const lastPlayed = new Map<string, number>()

export const isMuted = () => localStorage.getItem(MUTE_KEY) === '1'

export function setMuted(muted: boolean) {
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  if (master) master.gain.value = muted ? 0 : 0.25
}

// Must be called from a user gesture (the intro "開始" button) to unlock audio on mobile.
export function unlockAudio() {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = isMuted() ? 0 : 0.25
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
}

function tone(freq: number, dur: number, type: OscillatorType, at = 0, vol = 0.5) {
  if (!ctx || !master) return
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.connect(gain).connect(master)
  osc.start(t)
  osc.stop(t + dur)
}

const throttled = (name: string, ms: number) => {
  const now = performance.now()
  if (now - (lastPlayed.get(name) ?? 0) < ms) return true
  lastPlayed.set(name, now)
  return false
}

export const sfx = {
  chop(lethal: boolean) {
    if (throttled('chop', 80)) return
    tone(220, 0.06, 'square', 0, 0.35)
    if (lethal) tone(110, 0.12, 'triangle', 0.04, 0.5)
  },
  hitMonkey(lethal: boolean) {
    if (throttled('monkey', 80)) return
    tone(660, 0.05, 'square', 0, 0.3)
    if (lethal) { tone(523, 0.08, 'square', 0.05, 0.3); tone(392, 0.12, 'square', 0.12, 0.3) }
  },
  hurt() {
    if (throttled('hurt', 250)) return
    tone(140, 0.15, 'sawtooth', 0, 0.4)
  },
  sale() {
    if (throttled('sale', 60)) return
    tone(1046, 0.04, 'square', 0, 0.15)
  },
  quest() { [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'square', i * 0.09, 0.35)) },
  trophy() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', i * 0.1, 0.45)) },
}

// 16-step square + triangle loop at ~132 BPM eighth notes.
const MELODY = [523, 0, 659, 784, 659, 0, 523, 587, 659, 0, 587, 523, 440, 0, 392, 0]
const BASS = [131, 131, 196, 196, 175, 175, 196, 196]
const STEP = 0.227

export function startBgm() {
  stopBgm()
  if (!ctx) return
  let i = 0
  bgmTimer = window.setInterval(() => {
    const note = MELODY[i % MELODY.length]
    if (note) tone(note, STEP * 0.9, 'square', 0, 0.12)
    if (i % 2 === 0) tone(BASS[(i / 2) % BASS.length], STEP * 1.8, 'triangle', 0, 0.2)
    i++
  }, STEP * 1000)
}

export function stopBgm() {
  window.clearInterval(bgmTimer)
  bgmTimer = 0
}
