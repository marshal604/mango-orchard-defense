import { useState, type ReactNode } from 'react'
import type { Difficulty } from '../game/logic/config'
import { DEN, DIFFICULTY, KING, PAVILION, TRAPS } from '../game/logic/config'
import { topRecords } from '../meta/leaderboard'
import { formatMs } from './format'

const NAMES = [
  '芒果小農', '竹竿俠', '高枝剪大師', '猴子剋星', '愛文阿伯', '金煌姐',
  '採果一哥', '水果攤老闆', '驅猴達人', '香蕉守護者', '果園小霸王', '關廟阿嬤',
]
export const randomName = (not?: string) => {
  const pool = NAMES.filter((n) => n !== not)
  return pool[Math.floor(Math.random() * pool.length)]
}

function Screen({ art = true, children }: { art?: boolean; children: ReactNode }) {
  return (
    <div className="screen">
      {art && <div className="screen-art" style={{ backgroundImage: 'url(assets/title_bg.png)' }} />}
      <div className="screen-col">{children}</div>
    </div>
  )
}

interface TitleProps { onStart: () => void; onBoard: () => void; onHowTo: () => void }

export function Title({ onStart, onBoard, onHowTo }: TitleProps) {
  const top = topRecords(localStorage, 'normal').slice(0, 3)
  const items = [
    { label: '開始遊戲', onClick: onStart },
    { label: '排行榜', onClick: onBoard },
    { label: '遊玩方式', onClick: onHowTo },
  ]
  return (
    <Screen>
      <h1 className="title-logo logo">芒果園<br />保衛戰</h1>
      <p className="title-tag shadow">採芒果、趕獼猴、擺攤賺錢，打倒猴王！</p>
      <nav className="title-menu">
        {items.map((it, i) => (
          <button key={it.label} type="button" className="title-item shadow" onClick={it.onClick}>
            {i === 0 ? <span className="caret" /> : <span className="spacer" />}
            {it.label}
          </button>
        ))}
      </nav>
      <button type="button" className="top3" onClick={onBoard}>
        <div className="gray" style={{ fontSize: 13 }}>普通榜前三名</div>
        {top.length === 0 && <div className="gray">還沒有人通關，搶第一！</div>}
        {top.map((r, i) => (
          <div key={`${r.nickname}-${r.time}`} className="row">
            <span className={`rank-${i + 1}`}>{i + 1}　{r.nickname}</span>
            <span>{formatMs(r.time)}</span>
          </div>
        ))}
      </button>
    </Screen>
  )
}

const DIFF_NOTES: Record<Difficulty, string[]> = {
  normal: [`血量 ${DIFFICULTY.normal.hpMax}`, '離開戰鬥 5 秒後慢慢回血', '工人不會被打倒'],
  hell: [`血量只有 ${DIFFICULTY.hell.hpMax}`, '只能在建築旁回血', `升級貴 ${DIFFICULTY.hell.priceMult} 倍、工人會被打倒`],
}

interface SetupProps {
  initial: { nickname: string; difficulty: Difficulty }
  onGo: (nickname: string, difficulty: Difficulty) => void
  onBack: () => void
}

export function Setup({ initial, onGo, onBack }: SetupProps) {
  const [nickname, setNickname] = useState(initial.nickname || randomName())
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty)
  const name = nickname.trim().slice(0, 12)
  return (
    <Screen art={false}>
      <form style={{ display: 'contents' }} onSubmit={(e) => { e.preventDefault(); if (name) onGo(name, difficulty) }}>
        <h2 className="screen-title shadow">準備出發</h2>
        <label className="field-label" htmlFor="nick">輸入暱稱</label>
        <div className="row">
          <input id="nick" className="input" value={nickname} maxLength={12} onChange={(e) => setNickname(e.target.value)} />
          <button type="button" className="btn btn-sm" onClick={() => setNickname(randomName(nickname))}>換一個</button>
        </div>
        <div className="field-label">難度</div>
        <div className="cards-2">
          {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
            <button key={d} type="button" className="choice" aria-pressed={d === difficulty} onClick={() => setDifficulty(d)}>
              <strong>{DIFFICULTY[d].label}</strong>
              <ul>{DIFF_NOTES[d].map((n) => <li key={n}>{n}</li>)}</ul>
            </button>
          ))}
        </div>
        <div className="bottom-row">
          <button type="button" className="btn" onClick={onBack}>返回</button>
          <button type="submit" className="btn btn-gold" disabled={!name}>出發</button>
        </div>
      </form>
    </Screen>
  )
}

const STEPS = [
  { img: 'fruit_tree', title: '採芒果、趕獼猴', text: '靠近果樹或猴子就會自動揮竹竿，芒果和搶回來的香蕉自動進背包' },
  { img: 'stall', title: '回水果攤賣掉', text: '背包快滿了就回果園村的路邊水果攤，站上前面的圓圈，排隊的客人會一個一個跟你買' },
  { img: 'toolshop', title: '買升級', text: '農會（請工人）、農具行（採果工具、護具）、柑仔店（背包、收購價）分散在地圖上，站上圓圈打開選單。建築周圍是安全區。不知道去哪就看左上角任務，金色箭頭會帶路' },
  { img: 'monkey_king_walk_side_0', title: '打倒猴王', text: '猴王在地圖西南角的深山，被牠抓到會流血、還會被撞到扭到腳。打倒牠就通關，越快越好' },
]

export function HowTo({ onBack }: { onBack: () => void }) {
  return (
    <Screen art={false}>
      <h2 className="screen-title shadow">遊玩方式</h2>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s.title} className="panel step">
            <div className="step-art"><img src={`assets/${s.img}.png`} alt="" /></div>
            <div>
              <div className="step-title"><span className="gold">{i + 1}.</span> {s.title}</div>
              <div className="step-text">{s.text}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="panel note">
        <div className="gold">操作</div>
        <div>手機：手指按住畫面任何地方拖曳移動</div>
        <div>電腦：WASD 或方向鍵</div>
        <div className="gray" style={{ marginTop: 6, fontSize: 13 }}>
          ★ 越多的區域掉落越多、猴子也越兇。大公猴會抓傷你，抓傷時血會一直掉。躲進廟口涼亭猴子不敢靠近（要投香油錢＝身上現金，累積 ${PAVILION.freeAfter} 後免費）；
          小心剉冰店（被拉去吃冰 {TRAPS.ice.lockSec} 秒，之後肚子痛：跑超快但一直掉血）；誤闖朝天椒田會被辣到咳，但之後打到的猴子會辣到一直掉血。
          拆掉猴群據點有 ${DEN.reward}，而且手腳俐落：攻擊速度 ×{DEN.haste.mult} {DEN.haste.sec} 秒。猴王血量 {DIFFICULTY.normal.king.hp}（地獄 {DIFFICULTY.hell.king.hp}），離家 {KING.leashRadius} 以外會放棄追你回家回血。
        </div>
      </div>
      <button type="button" className="btn" style={{ alignSelf: 'center', marginTop: 24, padding: '0 40px' }} onClick={onBack}>返回</button>
    </Screen>
  )
}

export function Board({ onBack }: { onBack: () => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const records = topRecords(localStorage, difficulty)
  return (
    <Screen art={false}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn btn-sm" onClick={onBack}>← 返回</button>
        <span className="gray" style={{ fontSize: 13 }}>本機紀錄</span>
      </div>
      <h2 className="screen-title shadow" style={{ marginTop: 16 }}>排行榜</h2>
      <div className="tabs" role="tablist">
        {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
          <button key={d} type="button" role="tab" className="tab" aria-selected={d === difficulty} onClick={() => setDifficulty(d)}>
            {DIFFICULTY[d].label}
          </button>
        ))}
      </div>
      <div className="panel board">
        <div className="board-row board-head"><span>名次</span><span>暱稱</span><span>時間</span></div>
        {records.length === 0 && <div className="board-row gray"><span /><span>還沒有人通關，搶第一！</span><span /></div>}
        {records.map((r, i) => (
          <div key={`${r.nickname}-${r.time}-${i}`} className="board-row">
            <span className={i < 3 ? `rank-${i + 1}` : ''}>{i + 1}</span>
            <span>{r.nickname}</span>
            <span>{formatMs(r.time)}</span>
          </div>
        ))}
      </div>
    </Screen>
  )
}
