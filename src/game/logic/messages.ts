import type { Worker } from './entities'
import type { Notice } from './events'
import { DEN, MILESTONES, PAVILION, PROCESSION, TRAPS, WORKER } from './config'

// Every player-facing line the headless game emits lives here, built from config numbers.

const WORKER_NAME: Record<Worker['kind'], string> = { picker: '採果工', ranger: '驅猴員' }

export type TrapKind = 'ice' | 'chili'

// One row per trap kind: what the player sees going in, while locked, and coming out.
export const TRAP_TEXT: Record<TrapKind, { enter: string; locked: string; leave: string }> = {
  ice: {
    enter: `被阿姨拉去吃剉冰，${TRAPS.ice.lockSec} 秒走不開…`,
    locked: '吃剉冰',
    leave: `吃太多冰肚子痛！${TRAPS.ice.effectSec} 秒內急著找廁所跑超快，但每秒掉 ${TRAPS.ice.drainPerSec} 滴血`,
  },
  chili: {
    enter: `誤闖朝天椒田，被辣到咳 ${TRAPS.chili.lockSec} 秒…`,
    locked: '辣到咳',
    leave: `手沾滿辣椒！${TRAPS.chili.abilitySec} 秒內被你打到的猴子會辣到一直掉血`,
  },
}

export const MSG = {
  scratched: '被抓傷了！',
  sprained: '扭到腳！',
  needShears: '搆不到',
  needShearsToast: '老欉芒果樹太高了，要高枝剪才搆得到：到農具行升級採果工具',
  kingDown: '打倒猴王！',
  kingNoticed: '猴王發現你了！被抓到會流血、還會扭到腳',
  processionBlocked: `被進香團擋住了！擠 ${PROCESSION.blockSec} 秒就能鑽過去`,
  denDown: `拆掉猴群據點 +$${DEN.reward}　手腳俐落 攻速 x${DEN.haste.mult}`,
  delivery: (amount: number) => `宅配收走 +$${amount}`,
  workerDown: (w: Worker) => `${WORKER_NAME[w.kind]}被猴子打倒了，${WORKER.respawnDelay} 秒後在農會復活`,
}

export const pavilionNotice = (fee: number, donated: number): Notice => ({
  type: 'notice', tone: 'info', title: '廟口涼亭',
  lines: [
    '涼亭是廟方蓋的，進來要投香油錢（身上現金全部）',
    `（投了 $${fee}，累積 $${donated}／$${PAVILION.freeAfter}，滿額後免費）`,
    `在涼亭下每秒回 ${PAVILION.regenPerSec} 滴血、猴子不敢靠近`,
  ],
})

export const discountNotice: Notice = {
  type: 'notice', tone: 'info', title: '驅猴有功',
  lines: [`已經趕走 ${MILESTONES.monkeysForDiscount} 隻猴子`, '農會表揚你，之後所有升級打八折'],
}

export const overworkNotice: Notice = {
  type: 'notice', tone: 'warn', title: '工人過勞',
  lines: [
    `已經採收 ${MILESTONES.treesForOverwork} 棵果樹`,
    '收成太多，工人累壞了',
    '所有工人工作速度變成一半',
    `宅配時間延長 ${MILESTONES.overworkDeliveryMult} 倍`,
  ],
}
