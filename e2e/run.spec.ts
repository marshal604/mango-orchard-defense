import { expect, test, type Page } from '@playwright/test'

// Trophy cards and milestone notices pause the run; dismiss whatever is showing.
async function dismissCards(page: Page) {
  const next = page.getByRole('button', { name: '繼續' })
  while (await next.isVisible().catch(() => false)) await next.click()
}

async function until(page: Page, check: () => Promise<boolean>) {
  for (let i = 0; i < 50; i++) {
    await dismissCards(page)
    if (await check()) return
    await page.waitForTimeout(100)
  }
  throw new Error('condition not met in time')
}

// Drives one full run through the real UI. window.__game (dev only) is used to skip the grind.
test('title -> intro -> countdown -> move -> harvest -> sell -> beat the Monkey King', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '開始遊戲' }).click()
  await page.getByLabel('輸入暱稱').fill('測試員')
  await page.getByRole('button', { name: '出發' }).click()

  await page.getByRole('button', { name: '開始' }).click()
  await expect(page.locator('.countdown')).toBeHidden({ timeout: 6000 })
  await expect(page.getByTestId('quest')).toContainText('裝滿背包')

  const start = await page.evaluate(() => window.__game!.player.x)
  await page.keyboard.down('ArrowLeft')
  await page.waitForTimeout(500)
  await page.keyboard.up('ArrowLeft')
  expect(await page.evaluate(() => window.__game!.player.x)).toBeLessThan(start - 50)

  await page.evaluate(() => {
    const g = window.__game!
    g.teleport({ x: 1000, y: 600 })
    g.spawnTree({ x: 1030, y: 600 }, false)
  })
  await until(page, () => page.evaluate(() => window.__game!.run.mango > 0))

  await page.evaluate(() => {
    const g = window.__game!
    const stall = g.map.buildings.find((b) => b.id === 'stall')!
    g.teleport({ x: stall.x, y: stall.y + stall.h / 2 + 40 })
  })
  await until(page, () => page.evaluate(() => window.__game!.run.money > 0))

  await page.evaluate(() => {
    const g = window.__game!
    // Wild monkeys chasing the player take target priority over the King; clear them for a deterministic finish.
    for (const m of g.monkeys) if (m.size !== 'king') m.alive = false
    g.king.hp = 1
    g.teleport({ x: g.king.x + 30, y: g.king.y })
  })
  await until(page, () => page.getByTestId('result-time').isVisible())
  await expect(page.getByText('新紀錄！本機第 1 名')).toBeVisible()
})
