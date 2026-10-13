# 芒果園保衛戰 (Mango Orchard Defense)

[English](README.md) | **繁體中文**

俯視角像素風網頁遊戲：採芒果、趕跑偷水果的台灣獼猴，把收成賣給路邊水果攤排隊的客人，
買升級、請工人，最後到深山打倒猴王。通關時間就是分數。

![芒果園保衛戰 遊玩畫面](docs/media/gameplay.gif)

完整畫質影片：

https://github.com/user-attachments/assets/47b8540a-3551-456f-8d9d-c7f92a52bd5c

## 開始玩

```
npm install
npm run dev
```

- 電腦：WASD 或方向鍵
- 手機：按住畫面任何地方拖曳
- 靠近果樹或猴子會自動揮竿；站上建築前的圓圈會打開選單

## 玩法

- **採收與戰鬥**：用竹竿打芒果、從猴子手上搶回香蕉。老欉芒果樹太高，要高枝剪才搆得到。
- **賣出**：站在水果攤前的圓圈上，排隊的客人會一個一個跟你買。
- **升級**：農會請採果工和驅猴員，農具行買工具和護具，柑仔店加大背包、提高收購價、開通宅配。
- **危險就是報酬**：四個區域有不同星等，星越多猴子越兇、掉落也越多。
- **目標**：6 步新手任務加金色箭頭帶路；里程碑（趕走 60 隻猴子升級打八折、採收 100 棵樹工人過勞）；17 個成就。
- **陷阱**：廟口涼亭（投香油錢後安心回血）、剉冰店、朝天椒田、會擋路的進香團。

## 開發

| 指令 | 用途 |
|---|---|
| `npm run dev` | 啟動開發伺服器 |
| `npm test` | 單元測試（Vitest） |
| `npm run e2e` | 透過真實畫面跑完整流程（Playwright） |
| `npm run build` | 型別檢查與正式版建置 |

技術：Vite + React（選單與 HUD）+ Phaser（遊戲世界）+ TypeScript。所有遊戲規則放在 `src/game/logic/`
的 headless `Game` 類別，不依賴 Phaser，可以直接做單元測試。
詳見 [`CLAUDE.md`](CLAUDE.md) 與領域詞彙表 [`CONTEXT.md`](CONTEXT.md)。

## 文件

- [`docs/ai-prompt.md`](docs/ai-prompt.md)：如果要請 AI 做這款遊戲，prompt 該怎麼寫
- [`docs/reverse-engineering.md`](docs/reverse-engineering.md)、[`docs/feel-reference.md`](docs/feel-reference.md)、
  [`docs/ui-reference.md`](docs/ui-reference.md)：從原作拆解出的玩法數值、手感與進程、視覺版面
- [`docs/assets.md`](docs/assets.md)：給 Codex 的美術素材清單

## 參考

- 玩法與數值參考：[蔣出來](https://whoismygrandpa.win/game) 第一關「除鼠王」。用 REA 逆向分析其公開網頁，
  只沿用玩法與數值，美術、文字、音效皆為原創，分析結果見上方文件
- 字型：[Cubic 11 / 俐方體11號](https://github.com/ACh-K/Cubic-11)（SIL Open Font License 1.1，授權檔在 `public/fonts/OFL.txt`）
- 遊戲引擎：[Phaser](https://phaser.io/)；介面：[React](https://react.dev/) + [Vite](https://vite.dev/)
- 美術：由 [Codex](https://github.com/openai/codex) 影像生成，素材規格見 `docs/assets.md`
