import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BuildingId, Difficulty } from '../game/logic/config'
import { GUIDE } from '../game/logic/config'
import type { Notice } from '../game/logic/events'
import { Game, type GameEvent } from '../game/logic/game'
import { sfx, startBgm, stopBgm, unlockAudio } from '../game/sfx'
import type { GuideTarget } from '../game/scene'
import { Guide, type GuideView } from '../meta/guide'
import { addRecord } from '../meta/leaderboard'
import { TrophyTracker, type Trophy } from '../meta/trophies'
import { BuildingMenu } from './BuildingMenu'
import { GameView } from './GameView'
import { Hud } from './Hud'
import { Minimap } from './Minimap'
import { Countdown, DeathCard, HoldCard, IntroCard, PauseCard, ResultCard, type Hold } from './Overlays'
import { QuestPanel } from './QuestPanel'

const TUTORIAL_KEY = 'st_tutorial_done'
const SHEET_HEIGHT = 440
type Phase = 'intro' | 'countdown' | 'play' | 'won'

interface Toast { id: number; text: string }
interface Banner { id: number; danger: boolean; stars: string; mult: number }
let uid = 0

interface Props { nickname: string; difficulty: Difficulty; onHome: () => void }

export function PlayScreen({ nickname, difficulty, onHome }: Props) {
  const [game, setGame] = useState(() => new Game({ difficulty, seed: Date.now() % 1e9 }))
  const guide = useMemo(() => new Guide(localStorage.getItem(TUTORIAL_KEY) !== '1'), [game])
  const trophies = useMemo(() => new TrophyTracker(localStorage), [game])
  const [phase, setPhase] = useState<Phase>('intro')
  const [paused, setPaused] = useState(false)
  const [dead, setDead] = useState(false)
  const [holds, setHolds] = useState<Hold[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [banner, setBanner] = useState<Banner | null>(null)
  const [view, setView] = useState<GuideView>(() => guide.update(game))
  const [pad, setPad] = useState<BuildingId | null>(null)
  const [closedPad, setClosedPad] = useState<BuildingId | null>(null)
  const [result, setResult] = useState<{ rank: number; trophies: Trophy[] } | null>(null)
  const hudRef = useRef<HTMLDivElement>(null)
  const sideRef = useRef<HTMLDivElement>(null)
  const sheetOpen = !!pad && pad !== 'stall' && pad !== closedPad

  const toast = useCallback((text: string) => {
    const id = ++uid
    setToasts((t) => [...t, { id, text }].slice(-2))
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200)
  }, [])

  // Guide, trophies and pad polling: 4 times a second is plenty for UI.
  const hold = holds[0]
  const halted = phase !== 'play' || paused || !!hold

  useEffect(() => {
    if (halted) return
    const id = window.setInterval(() => {
      const next = guide.update(game)
      if (next.completed) sfx.quest()
      setView(next)
      const now = game.currentPad()
      setPad(now)
      setClosedPad((c) => (c === now ? c : null))
      if (game.finished) return
      const fresh = trophies.check(game)
      if (fresh.length) {
        sfx.trophy()
        setHolds((h) => [...h, ...fresh.map((trophy): Hold => ({ kind: 'trophy', trophy }))])
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [halted, game, guide, trophies])

  // Music follows the run: silent on intro, countdown, pause, cards and after the win.
  useEffect(() => {
    if (halted) stopBgm()
    else startBgm()
  }, [halted])

  useEffect(() => () => stopBgm(), [])

  const handleEvents = useCallback((events: GameEvent[]) => {
    for (const e of events) {
      if (e.type === 'dead') setDead(true)
      else if (e.type === 'toast') toast(e.text)
      else if (e.type === 'notice') setHolds((h) => [...h, { kind: 'notice', notice: e as Notice }])
      else if (e.type === 'zone') {
        const z = game.map.zones.find((x) => x.id === e.zone)
        if (z) {
          const id = ++uid
          setBanner({ id, danger: z.damageMult > 1, stars: z.stars, mult: z.damageMult })
          window.setTimeout(() => setBanner((b) => (b?.id === id ? null : b)), 1500)
        }
      } else if (e.type === 'win') {
        localStorage.setItem(TUTORIAL_KEY, '1')
        const rank = addRecord(localStorage, difficulty, { nickname, time: e.time })
        setResult({ rank, trophies: trophies.check(game) })
        setPhase('won')
      }
    }
  }, [game, difficulty, nickname, toast, trophies])

  const guideTarget = useCallback((): GuideTarget | null => {
    if (!view.target || !view.targetName) return null
    return { at: view.target, label: view.targetName, hideWithin: view.toKing ? GUIDE.kingHideDist : GUIDE.arrowHideDist }
  }, [view])

  const cover = useCallback(() => {
    const hud = hudRef.current?.offsetHeight ?? 150
    const side = sideRef.current?.offsetHeight ?? 0
    return { top: hud + 10 + side + 6, bottom: sheetOpen ? SHEET_HEIGHT : 0 }
  }, [sheetOpen])

  const startRun = () => {
    unlockAudio()
    setPhase('countdown')
  }
  const go = useCallback(() => setPhase('play'), [])
  const again = () => {
    const next = new Game({ difficulty, seed: Date.now() % 1e9 })
    setGame(next)
    setView(new Guide(localStorage.getItem(TUTORIAL_KEY) !== '1').update(next))
    setPhase('intro')
    setResult(null)
    setDead(false)
    setPaused(false)
    setHolds([])
    setToasts([])
    setBanner(null)
    setPad(null)
    setClosedPad(null)
  }

  const hudH = hudRef.current?.offsetHeight ?? 150
  return (
    <div className="run">
      <GameView game={game} paused={halted} onEvents={handleEvents} guide={guideTarget} cover={cover} />
      <Hud ref={hudRef} game={game} onPause={() => setPaused(true)} />
      <div className="under-hud" style={{ top: hudH + 10 }}>
        <div className="side-col" ref={sideRef}>
          {view.panel && <QuestPanel panel={view.panel} justCompleted={view.completed} />}
          {toasts.map((t) => <div key={t.id} className="toast pop">{t.text}</div>)}
        </div>
        <Minimap game={game} target={view.target} />
      </div>
      {banner && (
        <div key={banner.id} className={`zone-banner pop ${banner.danger ? 'danger' : 'safe'}`} style={{ top: hudH + 90 }}>
          <div className="l1">{banner.danger ? '進入危險區域' : '進入安全區域'}　<span className="gold">{banner.stars}</span></div>
          {banner.danger && <div className="l2">傷害 ×{banner.mult}　掉落 ×{banner.mult}</div>}
        </div>
      )}
      <BuildingMenu game={game} open={sheetOpen ? pad : null} suggest={view.suggest} onClose={() => setClosedPad(pad)} />
      {phase === 'intro' && <IntroCard difficulty={difficulty} onStart={startRun} />}
      {phase === 'countdown' && <Countdown onDone={go} />}
      {hold && phase === 'play' && <HoldCard hold={hold} onNext={() => setHolds((h) => h.slice(1))} />}
      {paused && <PauseCard elapsed={game.elapsed} onResume={() => setPaused(false)} onHome={onHome} />}
      {dead && phase === 'play' && !hold && (
        <DeathCard onKeep={() => { game.revive('keep'); setDead(false) }} onRestart={() => { game.revive('restart'); setDead(false) }} />
      )}
      {phase === 'won' && result && (
        <ResultCard game={game} nickname={nickname} rank={result.rank} trophies={result.trophies} onAgain={again} onHome={onHome} />
      )}
    </div>
  )
}
