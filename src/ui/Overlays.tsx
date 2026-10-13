import { useEffect, useState } from 'react'
import { DIFFICULTY, DEN } from '../game/logic/config'
import type { Difficulty } from '../game/logic/config'
import type { Game } from '../game/logic/game'
import type { Notice } from '../game/logic/events'
import type { Trophy } from '../meta/trophies'
import { formatMs, formatTime } from './format'

export function IntroCard({ difficulty, onStart }: { difficulty: Difficulty; onStart: () => void }) {
  const king = DIFFICULTY[difficulty].king
  return (
    <div className="overlay" style={{ background: 'rgba(0,0,0,.75)' }}>
      <div className="panel card pop">
        <p className="sub">通關目標</p>
        <h2>盡快打倒猴王</h2>
        <img className="art" src="assets/monkey_king_walk_side_0.png" alt="" />
        <ul>
          <li>猴王在<span className="gold">地圖西南角的深山</span></li>
          <li>不知道下一步？看<span className="gold">左上角的任務</span>，金色箭頭會帶路</li>
          <li>被猴王抓到會<span style={{ color: '#ff8a7a' }}>流血</span>又<span style={{ color: '#8fb8ff' }}>扭到腳</span>，先升級採果工具與護具再去</li>
          <li>採芒果、趕猴子賺錢，拆猴群據點有 ${DEN.reward} 還能暫時攻速加倍</li>
          <li>猴王血量 {king.hp}，打倒就通關，越快越好</li>
        </ul>
        <div className="stack"><button type="button" className="btn btn-gold btn-block" onClick={onStart}>開始</button></div>
      </div>
    </div>
  )
}

// 3, 2, 1 at 800 ms each, then 出發！ for 500 ms.
export function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3)
  useEffect(() => {
    const id = window.setTimeout(() => (n > 0 ? setN(n - 1) : onDone()), n > 0 ? 800 : 500)
    return () => window.clearTimeout(id)
  }, [n, onDone])
  return (
    <div className="countdown" aria-live="assertive">
      <span key={n} className="logo pop">{n > 0 ? n : '出發！'}</span>
    </div>
  )
}

export function PauseCard({ elapsed, onResume, onHome }: { elapsed: number; onResume: () => void; onHome: () => void }) {
  return (
    <div className="overlay">
      <div className="panel card pop">
        <h2>暫停</h2>
        <p className="sub">計時停在 {formatTime(elapsed)}</p>
        <div className="stack">
          <button type="button" className="btn btn-gold" onClick={onResume}>繼續</button>
          <button type="button" className="btn" onClick={onHome}>放棄回首頁</button>
        </div>
      </div>
    </div>
  )
}

export type Hold = { kind: 'notice'; notice: Notice } | { kind: 'trophy'; trophy: Trophy }

const TIER: Record<Trophy['tier'], { label: string; color: string }> = {
  bronze: { label: '銅獎盃', color: '#d0845a' },
  silver: { label: '銀獎盃', color: '#c8ccd4' },
  gold: { label: '金獎盃', color: '#f8c838' },
}

// Blocking card: the world and the timer are paused while it is shown.
export function HoldCard({ hold, onNext }: { hold: Hold; onNext: () => void }) {
  if (hold.kind === 'trophy') {
    const t = TIER[hold.trophy.tier]
    return (
      <div className="overlay">
        <div className="panel card pop" key={hold.trophy.id}>
          <p className="sub">你獲得了一個獎盃</p>
          <p style={{ color: t.color, margin: '10px 0 0' }}>{t.label}</p>
          <h2>{hold.trophy.name}</h2>
          <p className="sub" style={{ marginTop: 6 }}>{hold.trophy.desc}</p>
          <div className="stack"><button type="button" className="btn btn-gold" onClick={onNext}>繼續</button></div>
        </div>
      </div>
    )
  }
  const n = hold.notice
  return (
    <div className="overlay" style={{ background: 'rgba(0,0,0,.6)' }}>
      <div className={`card notice pop${n.tone === 'warn' ? ' warn' : ''}`} key={n.title}>
        <h2 style={{ fontSize: 24 }}>{n.title}</h2>
        {n.lines.map((l) => <p key={l}>{l}</p>)}
        <div className="stack"><button type="button" className="btn btn-gold" onClick={onNext}>繼續</button></div>
      </div>
    </div>
  )
}

const REVIVE_WAIT = 10

// Death does not pause the run: waiting to revive in place costs time, like the original's revive video.
export function DeathCard({ onKeep, onRestart }: { onKeep: () => void; onRestart: () => void }) {
  const [wait, setWait] = useState(REVIVE_WAIT)
  useEffect(() => {
    if (wait <= 0) return
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(id)
  }, [wait])
  return (
    <div className="overlay dead">
      <div className="card" style={{ maxWidth: 320 }}>
        <h2 className="shadow" style={{ fontSize: 36, color: 'var(--g-white)' }}>被猴子圍攻了</h2>
        <div className="stack">
          <button type="button" className="btn two-line btn-gold" disabled={wait > 0} onClick={onKeep}>
            <span style={{ fontSize: 22 }}>{wait > 0 ? `喘口氣 ${wait}` : '原地爬起來'}</span>
            <small>保留背包和錢</small>
          </button>
          <button type="button" className="btn two-line" onClick={onRestart}>
            <span style={{ fontSize: 22 }}>馬上回果園村</span>
            <small>背包和錢歸零</small>
          </button>
        </div>
        <p className="shadow" style={{ marginTop: 16, fontSize: 14 }}>計時沒有停喔</p>
      </div>
    </div>
  )
}

interface ResultProps {
  game: Game
  nickname: string
  rank: number
  trophies: Trophy[]
  onAgain: () => void
  onHome: () => void
}

export function ResultCard({ game, nickname, rank, trophies, onAgain, onHome }: ResultProps) {
  const s = game.run.stats
  return (
    <div className="overlay" style={{ background: 'var(--g-night)', overflowY: 'auto', alignItems: 'flex-start' }}>
      <div className="card" style={{ maxWidth: 360, paddingTop: 32 }}>
        <img className="art" src="assets/monkey_king_attack_2.png" alt="" style={{ height: 120 }} />
        <p className="sub">{nickname}・{game.run.cfg.label}</p>
        <h2 className="logo" style={{ fontSize: 42, marginTop: 8 }}>打倒猴王！</h2>
        <div className="result-time" data-testid="result-time">{formatMs(game.elapsed)}</div>
        <p className={rank === 1 ? 'gold pop' : 'gray'} style={{ margin: '4px 0 0' }}>{rank === 1 ? '新紀錄！本機第 1 名' : `本機排行第 ${rank} 名`}</p>
        <dl className="panel stats">
          <dt>採收果樹</dt><dd>{s.trees}</dd>
          <dt>趕走猴子</dt><dd>{s.monkeys}</dd>
          <dt>拆猴群據點</dt><dd>{s.dens}</dd>
          <dt>賺的錢</dt><dd>${s.earned}</dd>
          <dt>工人</dt><dd>{game.workers.length}</dd>
          <dt>倒下</dt><dd>{s.deaths}</dd>
        </dl>
        {trophies.length > 0 && (
          <div className="panel" style={{ marginTop: 12, padding: '10px 14px', fontSize: 14, textAlign: 'left' }}>
            <div className="gold">這場拿到的獎盃</div>
            {trophies.map((t) => <div key={t.id} className="pop">・{t.name}</div>)}
          </div>
        )}
        <div className="stack">
          <button type="button" className="btn btn-gold" onClick={onAgain}>再玩一次</button>
          <button type="button" className="btn" onClick={onHome}>回首頁</button>
        </div>
      </div>
    </div>
  )
}
