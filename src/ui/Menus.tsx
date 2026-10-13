import { useState, type ReactNode } from 'react'
import type { Difficulty } from '../game/logic/config'
import { DIFFICULTY, KING, NEST, SHADE, TRAPS } from '../game/logic/config'
import { topRecords } from '../meta/leaderboard'
import { formatMs } from './Result'

const PUNS = [
  '羽你同在', '一羽成名', '羽眾不同', '羽過天晴', '羽人為善', '殺球不留情',
  '網前小霸王', '吊球之神', '長球王', '切球大師', '接殺高手', '發球不過網',
]
export const randomPun = (not?: string) => {
  const pool = PUNS.filter((p) => p !== not)
  return pool[Math.floor(Math.random() * pool.length)]
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="screen">
      <img className="screen-bg" src="assets/title_bg.png" alt="" />
      <div className="screen-body">{children}</div>
    </div>
  )
}

export function Title({ onStart, onBoard, onHowTo }: { onStart: () => void; onBoard: () => void; onHowTo: () => void }) {
  return (
    <Screen>
      <h1 className="logo">羽球工坊<br />大亨</h1>
      <p className="tagline">採軟木、趕野鵝、做羽球，打倒鵝王！</p>
      <nav className="menu">
        <button type="button" className="btn btn-gold" onClick={onStart}>開始遊戲</button>
        <button type="button" className="btn" onClick={onBoard}>排行榜</button>
        <button type="button" className="btn" onClick={onHowTo}>遊玩方式</button>
      </nav>
    </Screen>
  )
}

interface SetupProps {
  initial: { nickname: string; difficulty: Difficulty }
  onGo: (nickname: string, difficulty: Difficulty) => void
  onBack: () => void
}

export function Setup({ initial, onGo, onBack }: SetupProps) {
  const [nickname, setNickname] = useState(initial.nickname || randomPun())
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty)
  const name = nickname.trim().slice(0, 12)
  return (
    <Screen>
      <form className="panel" onSubmit={(e) => { e.preventDefault(); if (name) onGo(name, difficulty) }}>
        <label htmlFor="nick">輸入暱稱</label>
        <div className="row">
          <input id="nick" value={nickname} maxLength={12} onChange={(e) => setNickname(e.target.value)} />
          <button type="button" className="btn" onClick={() => setNickname(randomPun(nickname))}>換一個</button>
        </div>
        <span>難度</span>
        <div className="row">
          {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
            <button key={d} type="button" className={d === difficulty ? 'btn btn-gold' : 'btn'} aria-pressed={d === difficulty} onClick={() => setDifficulty(d)}>
              {DIFFICULTY[d].label}
            </button>
          ))}
        </div>
        <small>{difficulty === 'hell' ? '血少、鵝兇、東西貴、工人會被打倒' : '第一次玩選這個'}</small>
        <div className="row">
          <button type="button" className="btn" onClick={onBack}>返回</button>
          <button type="submit" className="btn btn-gold" disabled={!name}>出發</button>
        </div>
      </form>
    </Screen>
  )
}

const STEPS = [
  { img: 'cork_tree', title: '砍軟木樹、趕野鵝', text: '靠近就會自動揮拍，軟木和鵝毛自動進背包' },
  { img: 'stall', title: '回收購攤賣掉', text: '背包快滿了就回中央運動公園的收購攤，站上前面的圓圈，排隊的客人會一個一個跟你買' },
  { img: 'proshop', title: '買升級', text: '球友會館（請工人）、球拍專賣店（球拍、護具）、補給站（背包、收購價）分散在地圖上，站上圓圈打開選單。建物周圍是安全區。不知道去哪就看任務，金色箭頭會帶路' },
  { img: 'goose_king', title: '打倒鵝王', text: '鵝王在地圖西南角的濕地，被牠啄會中毒又變慢。打倒牠就通關，越快越好' },
]

export function HowTo({ onBack }: { onBack: () => void }) {
  return (
    <Screen>
      <div className="panel">
        <h2>遊玩方式</h2>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.title}>
              <img src={`assets/${s.img}.png`} alt="" />
              <div><strong>{s.title}</strong><small>{s.text}</small></div>
            </li>
          ))}
        </ol>
        <small>
          手機：按住畫面任何地方拖曳移動。電腦：WASD 或方向鍵。<br />
          ★ 越多的區域掉落越多、鵝也越兇。大鵝會讓你中毒。站在遮陽棚下鵝不會追你（第一次要捐光現金，累積 ${SHADE.freeAfter} 後免費）；
          別誤闖更衣室（關 {TRAPS.locker.lockSec} 秒、出來變快但會掉血）；烤鵝攤會讓你打到的鵝著火。
          拆掉鵝窩有 ${NEST.reward}，攻擊速度 ×{NEST.haste.mult} {NEST.haste.sec} 秒。鵝王血量 {DIFFICULTY.normal.king.hp}（地獄 {DIFFICULTY.hell.king.hp}），會在離家 {KING.leashRadius} 外放棄追你並回血。
        </small>
        <button type="button" className="btn" onClick={onBack}>返回</button>
      </div>
    </Screen>
  )
}

export function Board({ onBack }: { onBack: () => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const records = topRecords(localStorage, difficulty)
  return (
    <Screen>
      <div className="panel">
        <h2>本機排行榜</h2>
        <div className="row">
          {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
            <button key={d} type="button" className={d === difficulty ? 'btn btn-gold' : 'btn'} onClick={() => setDifficulty(d)}>{DIFFICULTY[d].label}</button>
          ))}
        </div>
        {records.length === 0 && <p>還沒有人通關，搶第一！</p>}
        <ol className="board">
          {records.map((r, i) => (
            <li key={`${r.nickname}-${r.time}-${i}`}><span>{i + 1}　{r.nickname}</span><span>{formatMs(r.time)}</span></li>
          ))}
        </ol>
        <button type="button" className="btn" onClick={onBack}>返回</button>
      </div>
    </Screen>
  )
}
