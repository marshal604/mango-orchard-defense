import { expect, test } from '@playwright/test'

// Drives one full run through the real UI. window.__game (dev only) is used to skip the grind.
test('title -> start -> move -> gather -> sell -> beat the Monkey King', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '開始遊戲' }).click()
  await page.getByLabel('輸入暱稱').fill('測試員')
  await page.getByRole('button', { name: '出發' }).click()

  await expect(page.getByTestId('timer')).toBeVisible()
  await expect(page.locator('.countdown')).toBeHidden({ timeout: 5000 })

  const start = await page.evaluate(() => ({ ...window.__game!.player }))
  await page.keyboard.down('ArrowLeft')
  await page.waitForTimeout(500)
  await page.keyboard.up('ArrowLeft')
  const moved = await page.evaluate(() => window.__game!.player.x)
  expect(moved).toBeLessThan(start.x - 50)

  await page.evaluate(() => {
    const g = window.__game!
    g.teleport({ x: 1000, y: 600 })
    g.spawnTree({ x: 1030, y: 600 }, false)
  })
  await expect.poll(() => page.evaluate(() => window.__game!.run.mango), { timeout: 5000 }).toBeGreaterThan(0)

  await page.evaluate(() => {
    const g = window.__game!
    const stall = g.map.buildings.find((b) => b.id === 'stall')!
    g.teleport({ x: stall.x, y: stall.y + stall.h / 2 + 40 })
  })
  await expect(page.getByTestId('money')).not.toHaveText('0', { timeout: 5000 })

  await page.evaluate(() => {
    const g = window.__game!
    g.king.hp = 1
    g.teleport({ x: g.king.x + 30, y: g.king.y })
  })
  await expect(page.getByTestId('result-time')).toBeVisible({ timeout: 5000 })
  await expect(page.getByText('本機排行第 1 名')).toBeVisible()
})
