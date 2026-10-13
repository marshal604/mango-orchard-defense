import type { Worker } from './entities'
import type { Notice } from './events'
import { MILESTONES, NEST, SHADE, TRAPS, WORKER } from './config'

// Every player-facing line the headless game emits lives here, built from config numbers.

const WORKER_NAME: Record<Worker['kind'], string> = { ballboy: '撿球小弟', wrangler: '趕鵝員' }

export const MSG = {
  scraped: '破皮了！',
  sprained: '扭到腳！',
  needCarbon: '需要碳纖拍',
  needCarbonToast: '老軟木橡樹要碳纖拍才砍得動：到球拍專賣店升級球拍',
  kingDown: '打倒鵝王！',
  nestDown: `拆鵝窩 +$${NEST.reward}　手感發燙 攻速 x${NEST.haste.mult}`,
  delivery: (amount: number) => `外送 +$${amount}`,
  workerDown: (w: Worker) => `${WORKER_NAME[w.kind]}被鵝打倒了，${WORKER.respawnDelay} 秒後在球友會館復活`,
  trapEnter: (kind: 'locker' | 'drink') => (kind === 'locker'
    ? `誤闖更衣室，被拉去換比賽服 ${TRAPS.locker.lockSec} 秒…`
    : `被運動飲料攤的試喝隊伍卡住 ${TRAPS.drink.lockSec} 秒…`),
  trapLeave: (kind: 'locker' | 'drink') => (kind === 'locker'
    ? `進入拚戰模式！${TRAPS.locker.effectSec} 秒內跑更快，但每秒流失 ${TRAPS.locker.drainPerSec} 點體力`
    : `熱血沸騰！${TRAPS.drink.abilitySec} 秒內被你打到的鵝會嚇到一直掉毛`),
}

export const shadeNotice = (fee: number, donated: number): Notice => ({
  type: 'notice', tone: 'info', title: '遮陽棚',
  lines: [
    '遮陽棚是球友會募款搭的，進來要捐出身上所有現金',
    `（捐了 $${fee}，累積 $${donated}／$${SHADE.freeAfter}，滿額後免費）`,
    `在棚下每秒回 ${SHADE.regenPerSec} 滴血、鵝不會追你`,
  ],
})

export const discountNotice: Notice = {
  type: 'notice', tone: 'info', title: '趕鵝有功',
  lines: [`已經趕走 ${MILESTONES.geeseForDiscount} 隻鵝`, '公園管理處感謝你，之後所有升級打八折'],
}

export const complaintsNotice: Notice = {
  type: 'notice', tone: 'warn', title: '公園客訴',
  lines: [
    `已經砍了 ${MILESTONES.treesForComplaints} 棵樹`,
    '民眾抗議砍太多樹',
    '所有工人工作速度變成一半',
    `外送時間延長 ${MILESTONES.complaintsDeliveryMult} 倍`,
  ],
}
