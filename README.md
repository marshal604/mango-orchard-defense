# 芒果園保衛戰 (mango-orchard-defense)

Orchard-vs-macaques top-down gather / sell / upgrade / boss game (芒果園保衛戰). See `CLAUDE.md`.

![芒果園保衛戰 遊玩畫面](docs/media/gameplay.gif)

完整畫質影片：

https://github.com/user-attachments/assets/47b8540a-3551-456f-8d9d-c7f92a52bd5c

採芒果、趕台灣獼猴、在路邊水果攤賣給排隊客人，買升級、請工人，最後到深山打倒猴王。通關時間就是分數。

```
npm install
npm run dev
```

## Docs

- `docs/ai-prompt.md`: how to describe this game in a prompt for an AI to build it
- `docs/reverse-engineering.md`, `docs/feel-reference.md`, `docs/ui-reference.md`: what was learned from the original
- `docs/assets.md`: art manifest for Codex

## 參考

- 玩法與數值參考：[蔣出來](https://whoismygrandpa.win/game) 第一關「除鼠王」。用 REA 逆向分析其公開網頁，只沿用玩法與數值，美術、文字、音效皆為原創，分析結果見 `docs/reverse-engineering.md`、`docs/feel-reference.md`、`docs/ui-reference.md`
- 字型：[Cubic 11 / 俐方體11號](https://github.com/ACh-K/Cubic-11)（SIL Open Font License 1.1，授權檔在 `public/fonts/OFL.txt`）
- 遊戲引擎：[Phaser](https://phaser.io/)；介面：[React](https://react.dev/) + [Vite](https://vite.dev/)
- 美術：由 [Codex](https://github.com/openai/codex) 影像生成，素材規格見 `docs/assets.md`
