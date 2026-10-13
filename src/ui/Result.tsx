import type { Game } from '../game/logic/game'
import { Dialog } from './Dialog'
import { formatTime } from './Hud'

export const formatMs = (sec: number) => `${formatTime(sec)}.${String(Math.floor((sec % 1) * 100)).padStart(2, '0')}`

export function Result({ game, rank, onAgain, onHome }: { game: Game; rank?: number; onAgain: () => void; onHome: () => void }) {
  const s = game.run.stats
  return (
    <Dialog title="打倒鵝王！">
      <p className="result-time" data-testid="result-time">{formatMs(game.elapsed)}</p>
      {rank !== undefined && <p>本機排行第 {rank} 名</p>}
      <p>砍樹 {s.trees}　趕鵝 {s.geese}　拆鵝窩 {s.nests}</p>
      <p>總收入 ${s.earned}　倒下 {s.deaths} 次</p>
      <button type="button" className="btn btn-gold" onClick={onAgain}>再玩一次</button>
      <button type="button" className="btn" onClick={onHome}>回首頁</button>
    </Dialog>
  )
}
