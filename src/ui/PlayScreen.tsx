import { useCallback, useEffect, useState } from 'react'
import type { Difficulty } from '../game/logic/config'
import { Game, type GameEvent } from '../game/logic/game'
import { addRecord } from '../meta/leaderboard'
import { nextGoal } from '../meta/quest'
import { BuildingMenu } from './BuildingMenu'
import { Dialog } from './Dialog'
import { GameView } from './GameView'
import { Hud } from './Hud'
import { QuestPanel } from './QuestPanel'
import { Result } from './Result'
import { Toasts, type Toast } from './Toasts'

type Notice = Extract<GameEvent, { type: 'notice' }>

const REVIVE_WAIT = 10
let toastId = 0

interface Props { nickname: string; difficulty: Difficulty; onHome: () => void }

export function PlayScreen({ nickname, difficulty, onHome }: Props) {
  const [game, setGame] = useState(() => new Game({ difficulty, seed: Date.now() % 1e9 }))
  const [countdown, setCountdown] = useState(3)
  const [paused, setPaused] = useState(false)
  const [dead, setDead] = useState(false)
  const [reviveWait, setReviveWait] = useState(0)
  const [rank, setRank] = useState<number | null>(null)
  const [notices, setNotices] = useState<Notice[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    if (countdown <= 0) return
    const id = window.setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => window.clearTimeout(id)
  }, [countdown])

  useEffect(() => {
    if (reviveWait <= 0) return
    const id = window.setTimeout(() => setReviveWait((w) => w - 1), 1000)
    return () => window.clearTimeout(id)
  }, [reviveWait])

  const handleEvents = useCallback((events: GameEvent[]) => {
    for (const e of events) {
      if (e.type === 'dead') {
        setDead(true)
        setReviveWait(REVIVE_WAIT)
      }
      if (e.type === 'win') setRank(addRecord(localStorage, difficulty, { nickname, time: e.time }))
    }
    const newNotices = events.filter((e): e is Notice => e.type === 'notice')
    if (newNotices.length) setNotices((n) => [...n, ...newNotices])
    const newToasts = events.flatMap((e) => (e.type === 'toast' ? [{ id: ++toastId, text: e.text }] : []))
    if (newToasts.length) setToasts((t) => [...t, ...newToasts].slice(-3))
  }, [difficulty, nickname])

  const expireToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const guideTarget = useCallback(() => nextGoal(game).target, [game])

  const revive = (mode: 'keep' | 'restart') => {
    game.revive(mode)
    setDead(false)
  }

  const again = () => {
    setGame(new Game({ difficulty, seed: Date.now() % 1e9 }))
    setRank(null)
    setDead(false)
    setNotices([])
    setCountdown(3)
  }

  const notice = notices[0]
  const halted = paused || !!notice || countdown > 0 || rank !== null
  return (
    <>
      <GameView game={game} paused={halted} onEvents={handleEvents} guideTarget={guideTarget} />
      <Hud game={game} onPause={() => setPaused(true)} />
      <QuestPanel game={game} />
      <BuildingMenu game={game} />
      <Toasts toasts={toasts} onExpire={expireToast} />
      {countdown > 0 && <div className="countdown" aria-live="assertive">{countdown}</div>}
      {notice && (
        <Dialog title={notice.title} tone={notice.tone}>
          {notice.lines.map((l) => <p key={l}>{l}</p>)}
          <button type="button" className="btn btn-gold" onClick={() => setNotices((n) => n.slice(1))}>知道了</button>
        </Dialog>
      )}
      {paused && (
        <Dialog title="暫停">
          <button type="button" className="btn btn-gold" onClick={() => setPaused(false)}>繼續</button>
          <button type="button" className="btn" onClick={onHome}>放棄回首頁</button>
        </Dialog>
      )}
      {rank !== null && <Result game={game} rank={rank} onAgain={again} onHome={onHome} />}
      {dead && (
        <Dialog title="你倒下了">
          <p>選擇復活方式</p>
          <button type="button" className="btn btn-gold" disabled={reviveWait > 0} onClick={() => revive('keep')}>
            {reviveWait > 0 ? `原地復活（休息 ${reviveWait} 秒）` : '原地復活（保留背包與錢）'}
          </button>
          <button type="button" className="btn" onClick={() => revive('restart')}>馬上回基地（背包與錢歸零）</button>
        </Dialog>
      )}
    </>
  )
}
