# Atlas of Fins｜文件導覽

日常開發只需要先判斷問題屬於哪一種，再閱讀一份權威文件。不要為了單一改動同步所有 Markdown。

| 想確認的事情 | 唯一主要文件 |
|---|---|
| 遊戲永久玩法與限制 | [GAME_DESIGN.md](GAME_DESIGN.md) |
| 目前各海域有哪些魚、機率與出現條件 | [FISH_CATALOG.md](FISH_CATALOG.md) |
| 六海域主線、角色承接與章節日誌 | [MAIN_STORY.md](MAIN_STORY.md) |
| 如何新增海域或修改共用系統 | [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) |
| 現在實作到哪裡、下一個工作包是什麼 | [CURRENT.md](CURRENT.md) |
| 外部素材與授權 | [ASSET_LICENSES.md](ASSET_LICENSES.md) |

## 文件分層

```text
docs/
├── GAME_DESIGN.md        # 穩定玩法規則
├── FISH_CATALOG.md       # 目前實裝魚種的閱讀清單
├── MAIN_STORY.md         # 單一主線權威
├── DEVELOPMENT_GUIDE.md  # 兩種開發工作流
├── CURRENT.md            # 簡短、可替換的現況
├── ASSET_LICENSES.md     # 素材來源與授權
├── versions/             # 已完成版本的凍結紀錄
└── archive/              # 不再主動維護的舊提案與舊狀態
```

## 維護原則

1. 一項事實只在一個地方詳細說明，其他文件只連結，不複製全文。
2. 設計規則變動不等於新版本，不需建立版本分支或 Slice 計畫。
3. 新海域內容先更新 `MAIN_STORY.md` 的承接與該海域內容包，再修改程式資料。
4. 只有共用系統、存檔架構或跨多系統風險高的改動，才拆成工程 Slice。
5. `versions/` 與 `archive/` 原則上凍結；只修錯字、失效連結或補充勘誤，不要求每次開發同步。
6. `CURRENT.md` 只保留現在與下一步，不累積逐日工作日誌。

若文件與可執行程式不一致，以測試證實的程式現況判定「現在能玩什麼」，再修正對應的唯一權威文件。
