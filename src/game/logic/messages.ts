import type { Worker } from './entities'
import type { Notice } from './events'
import { MILESTONES, NEST, SHADE, TRAPS, WORKER } from './config'

// Every player-facing line the headless game emits lives here, built from config numbers.

const WORKER_NAME: Record<Worker['kind'], string> = { ballboy: '撿球小弟', wrangler: '趕鵝員' }

export const MSG = {
  poisoned: '中毒！',
  slowed: '變慢！',
  needCarbon: '需要碳纖拍',
  needCarbonToast: '老軟木橡樹要碳纖拍才砍得動：到球拍專賣店升級球拍',
  kingDown: '打倒鵝王！',
  nestDown: `拆鵝窩 +$${NEST.reward}　攻速 x${NEST.haste.mult}`,
  delivery: (amount: number) => `外送 +$${amount}`,
  workerDown: (w: Worker) => `${WORKER_NAME[w.kind]}被鵝打倒了，${WORKER.respawnDelay} 秒後在球友會館復活`,
  trapEnter: (kind: 'locker' | 'roast') => (kind === 'locker'
    ? `誤闖更衣室，被關 ${TRAPS.locker.lockSec} 秒換衣服…`
    : `被烤鵝攤老闆拉去吃烤鵝，${TRAPS.roast.lockSec} 秒…`),
  trapLeave: (kind: 'locker' | 'roast') => (kind === 'locker'
    ? `換好球衣了！${TRAPS.locker.effectSec} 秒內跑更快，但每秒掉 ${TRAPS.locker.drainPerSec} 滴血`
    : `吃飽了！${TRAPS.roast.abilitySec} 秒內打到的鵝會著火`),
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
