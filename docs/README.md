# Atlas of Fins｜專案文件總覽

> 最後整理：2026-07-17
> 對應程式版本：v0.3.0-alpha.4
> 用途：說明每份文件的權責、完成狀態與閱讀順序，避免歷史規格、正式定案與尚未實作內容混淆。

## 1. 文件狀態定義

| 狀態 | 意義 |
|---|---|
| 現況 | 描述目前程式實際可用內容；應與程式、測試及版本號一致 |
| 已完成規格 | 對應功能已實作；保留設計背景、資料規則與驗收紀錄 |
| 正式定案 | 已完成產品決策；尚未實作不代表仍可任意變更 |
| 架構參考 | 保存資料模型、切片與風險分析；若與正式定案衝突，以正式定案為準 |
| 歷史基準 | 保存當時的範圍與決策，不代表目前版本上限或未來方向 |

判讀規則：

1. 查詢「現在玩得到什麼」時，以程式、自動測試、`DEVELOPMENT_PROGRESS.md` 與已完成規格為準。
2. 查詢「未來應該做成什麼」時，以 [`FINAL_GAME_DESIGN.md`](FINAL_GAME_DESIGN.md) 為最高權威。
3. 子系統架構文件只補充實作細節，不可覆寫正式定案。
4. 尚未實作的正式定案不可寫進目前版本的已完成功能清單。

## 2. 建議閱讀順序

1. [`../README.md`](../README.md)：安裝、遊玩方式與目前可玩功能。
2. [`DEVELOPMENT_PROGRESS.md`](DEVELOPMENT_PROGRESS.md)：唯一的版本與開發進度總表。
3. [`FINAL_GAME_DESIGN.md`](FINAL_GAME_DESIGN.md)：十組設計討論後的長期正式定案與版本順序。
4. [`V0_4_IMPLEMENTATION_PLAN.md`](V0_4_IMPLEMENTATION_PLAN.md)：下一版本的工程切片、相依順序與驗收門檻。
5. [`LONG_TERM_GAME_DESIGN.md`](LONG_TERM_GAME_DESIGN.md)：產品方向形成過程、風險與成功標準。
6. [`WORLD_ROUTE_SYSTEM_DESIGN.md`](WORLD_ROUTE_SYSTEM_DESIGN.md)：世界航線、區域資料與存檔架構參考。
7. [`COLLECTION_EXPERIENCE_SYSTEMS.md`](COLLECTION_EXPERIENCE_SYSTEMS.md)：研究、潮光、船屋、自動、每日與居民委託架構參考。
8. 對應版本的已完成規格與驗收文件。

## 3. 文件清單

| 文件 | 狀態 | 內容與權責 |
|---|---|---|
| [`DEVELOPMENT_PROGRESS.md`](DEVELOPMENT_PROGRESS.md) | 現況 | 版本、完成項目、測試結果、下一階段與開發紀錄 |
| [`TEST_CHECKLIST.md`](TEST_CHECKLIST.md) | 現況 | 已實作功能的回歸驗收清單，不收錄尚未開發功能 |
| [`ASSET_LICENSES.md`](ASSET_LICENSES.md) | 現況 | 第三方素材、授權政策與新增素材時的登錄規則 |
| [`FINAL_GAME_DESIGN.md`](FINAL_GAME_DESIGN.md) | 正式定案 | v0.4～v1.0 產品、世界、收藏、居民、視聽、存檔、後期與版本順序的最高權威 |
| [`V0_4_IMPLEMENTATION_PLAN.md`](V0_4_IMPLEMENTATION_PLAN.md) | 正式實作計畫 | v0.4 Slice A～H、模組邊界、每日／居民委託契約、相依順序與驗收條件 |
| [`LONG_TERM_GAME_DESIGN.md`](LONG_TERM_GAME_DESIGN.md) | 架構參考 | 療癒單機收藏定位、核心循環、內容支柱、成功標準與早期路線提案 |
| [`WORLD_ROUTE_SYSTEM_DESIGN.md`](WORLD_ROUTE_SYSTEM_DESIGN.md) | 架構參考 | 世界區域、航線、魚類棲地、世界狀態、海圖與 v4 存檔模型 |
| [`COLLECTION_EXPERIENCE_SYSTEMS.md`](COLLECTION_EXPERIENCE_SYSTEMS.md) | 架構參考 | 研究航線、潮光、船屋、自動／離線、模組化日誌、每日小目標與居民委託模型 |
| [`PHASE_2_GAME_DESIGN.md`](PHASE_2_GAME_DESIGN.md) | 已完成規格 | v0.2 熟悉度、閃光個體、水族箱、成就與 v2 存檔 |
| [`PHASE_3_GAME_DESIGN.md`](PHASE_3_GAME_DESIGN.md) | 已完成規格 | v0.3 三個海灣事件、魚誌擴充與 v3 存檔 |
| [`FISH_EXPANSION_DESIGN.md`](FISH_EXPANSION_DESIGN.md) | 已完成規格 | v0.3 Slice D 新增 10 種魚、收藏里程碑及驗收 |
| [`../療癒釣魚養成遊戲_初版開發規格.md`](../療癒釣魚養成遊戲_初版開發規格.md) | 歷史基準 | v0.1 初版需求；保留原始範圍與早期技術建議 |

## 4. 已完成的長期定案

- 療癒、單機、低思考壓力的收藏釣魚定位。
- 固定按住／放開的安全張力操作；支援滑鼠、鍵盤與觸控，不規劃手把。
- 地理完全架空，洋流關係與魚類生態參照真實資料。
- 六大海域主順序、自由返航、多段航線、距離航程、離線航行與手動停泊。
- 約 100 種魚、區域印章、正式觀察魚、奇景、閃光替換圖鑑主圖與世界完成標準。
- 研究航線、永久潮光、六階段船屋、唯讀自動日誌與區域居民原則。
- 每個遊戲內航海日三項可選小目標，以及接受後不過期、需回原港交付的當地居民委託。
- 靜潮自動釣架上限 3 小時、需要魚餌、效率為手動 50%，且不取得新收藏。
- 以高畫質為唯一製作基準的結構化手繪美術、各海域獨立音樂與古典航海介面；不另設降畫質模式。
- 無現實日期限期、排行榜、連續登入、限定每日收藏、能力型完成獎勵或新遊戲＋。
- 無限固定數量限制的本機存檔、匯出／匯入、自動遷移備份、完全離線與多語系資料架構。
- 集中式、資料驅動且必須跟隨每次內容更新的開發者模式。

## 5. 尚待製作而非尚待定案

以下工作仍需逐版研究、製作與平衡，但不再視為核心方向問題：

- 琉光群島以外各海域的逐魚種清單與生態來源。
- 尚未命名居民的正式姓名、外觀細節與逐句台詞。
- 各居民委託模板的正式文案與普通獎勵平衡。
- 18～24 支釣竿的名稱、取得方式與平衡值。
- 高畫質資產解析度、檔案預算、載入策略與效能門檻。
- 各版本的工期、日期與第二張航圖內容。

## 6. 文件維護規則

開始實作前，先引用 `FINAL_GAME_DESIGN.md` 的對應章節，再建立版本切片並加入 `DEVELOPMENT_PROGRESS.md`。完成程式與驗證後，才可把項目標記為 `[x]`、移入 `TEST_CHECKLIST.md`，並更新根目錄 README 的目前功能。

若實作測試證明某項定案需要修改，必須記錄原因、影響範圍與遷移方式，再同步更新正式定案與所有從屬文件；不可只在單一提案文件改動。
