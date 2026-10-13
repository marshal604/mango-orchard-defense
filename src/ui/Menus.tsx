import { useState, type ReactNode } from 'react'
import type { Difficulty } from '../game/logic/config'
import { DIFFICULTY, KING, DEN, PAVILION, TRAPS } from '../game/logic/config'
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
      <h1 className="logo">芒果園<br />保衛戰</h1>
      <p className="tagline">採芒果、趕獼猴、擺攤賺錢，打倒猴王！</p>
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
        <small>{difficulty === 'hell' ? '血少、猴兇、東西貴、工人會被打倒' : '第一次玩選這個'}</small>
        <div className="row">
          <button type="button" className="btn" onClick={onBack}>返回</button>
          <button type="submit" className="btn btn-gold" disabled={!name}>出發</button>
        </div>
      </form>
    </Screen>
  )
}

const STEPS = [
  { img: 'fruit_tree', title: '採芒果、趕獼猴', text: '靠近果樹或猴子就會自動揮竹竿，芒果和搶回來的香蕉自動進背包' },
  { img: 'stall', title: '回收購攤賣掉', text: '背包快滿了就回果園村的路邊水果攤，站上前面的圓圈，排隊的客人會一個一個跟你買' },
  { img: 'toolshop', title: '買升級', text: '農會（請工人）、農具行（採果工具、護具）、柑仔店（背包、收購價）分散在地圖上，站上圓圈打開選單。建物周圍是安全區。不知道去哪就看任務，金色箭頭會帶路' },
  { img: 'monkey_king', title: '打倒猴王', text: '猴王在地圖西南角的深山，被牠抓到會流血、還會被撞到扭到腳。打倒牠就通關，越快越好' },
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
          ★ 越多的區域掉落越多、猴子也越兇。大公猴會抓傷你，抓傷時血會一直掉。躲進廟口涼亭猴子不敢靠近（要投香油錢＝身上現金，累積 ${PAVILION.freeAfter} 後免費）；
          小心剉冰店（被拉去吃冰 {TRAPS.ice.lockSec} 秒，之後肚子痛：跑超快但一直掉血）；誤闖朝天椒田會被辣到咳，但之後打到的猴子會辣到一直掉血。
          拆掉猴群據點有 ${DEN.reward}，而且手腳俐落：攻擊速度 ×{DEN.haste.mult} {DEN.haste.sec} 秒。猴王血量 {DIFFICULTY.normal.king.hp}（地獄 {DIFFICULTY.hell.king.hp}），會在離家 {KING.leashRadius} 外放棄追你並回血。
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
