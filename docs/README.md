# Atlas of Fins｜專案文件總覽

> 最後整理：2026-07-18
> 對應程式版本：v0.5.0-alpha.5
> 現行實作計畫：v0.5「船屋與航程記憶」
> 用途：區分跨版本權威文件、現行計畫與已完成版本紀錄。

## 1. 文件狀態定義

| 狀態 | 意義 |
|---|---|
| 現況 | 描述目前程式實際可用內容；應與程式、測試及版本號一致 |
| 現行實作計畫 | 已完成決策、尚待依 Slice 實作的下一工作包 |
| 已完成規格 | 對應功能已實作；保留設計背景、資料規則與驗收紀錄 |
| 正式定案 | 已完成產品決策；尚未實作不代表仍可任意變更 |
| 架構參考 | 保存資料模型、切片與風險分析；若與正式定案衝突，以正式定案為準 |
| 歷史基準 | 保存當時的範圍與決策，不代表目前版本上限或未來方向 |

判讀規則：

1. 查詢「現在玩得到什麼」時，以程式、自動測試、[`DEVELOPMENT_PROGRESS.md`](DEVELOPMENT_PROGRESS.md) 與已完成版本規格為準。
2. 查詢「接下來怎麼實作」時，以 [`versions/v0.5/V0_5_IMPLEMENTATION_PLAN.md`](versions/v0.5/V0_5_IMPLEMENTATION_PLAN.md) 為準。
3. 查詢「完整遊戲最後要做成什麼」時，以 [`FINAL_GAME_DESIGN.md`](FINAL_GAME_DESIGN.md) 為最高權威。
4. 子系統架構文件只補充實作細節，不可覆寫正式定案。
5. 尚未實作的正式定案不可寫進目前版本的已完成功能清單或 [`TEST_CHECKLIST.md`](TEST_CHECKLIST.md)。

## 2. 建議閱讀順序

1. [`../README.md`](../README.md)：安裝、遊玩方式與目前可玩功能。
2. [`DEVELOPMENT_PROGRESS.md`](DEVELOPMENT_PROGRESS.md)：唯一的版本與開發進度總表。
3. [`FINAL_GAME_DESIGN.md`](FINAL_GAME_DESIGN.md)：長期正式定案與第一張航圖版本順序。
4. [`versions/v0.5/V0_5_IMPLEMENTATION_PLAN.md`](versions/v0.5/V0_5_IMPLEMENTATION_PLAN.md)：現行版本的 Slice、存檔、相依順序與驗收門檻；Slice A～E 已完成。
5. [`COLLECTION_EXPERIENCE_SYSTEMS.md`](COLLECTION_EXPERIENCE_SYSTEMS.md)：v0.5 潮光、船隻、日誌與自動釣魚的架構背景。
6. [`LONG_TERM_GAME_DESIGN.md`](LONG_TERM_GAME_DESIGN.md) 與 [`WORLD_ROUTE_SYSTEM_DESIGN.md`](WORLD_ROUTE_SYSTEM_DESIGN.md)：產品方向及世界航線架構。
7. `versions/` 內對應版本的歷史規格、完成計畫與驗收報告。

## 3. 資料夾分類

```text
docs/
├── README.md                         # 本索引
├── DEVELOPMENT_PROGRESS.md           # 跨版本進度總表
├── TEST_CHECKLIST.md                 # 已實作功能回歸清單
├── FINAL_GAME_DESIGN.md              # 長期最高設計依據
├── COLLECTION_EXPERIENCE_SYSTEMS.md  # 收藏、船屋、日誌架構
├── WORLD_ROUTE_SYSTEM_DESIGN.md       # 世界與航線架構
├── LONG_TERM_GAME_DESIGN.md           # 產品方向形成過程
├── ASSET_LICENSES.md                  # 素材與授權紀錄
└── versions/
    ├── v0.1/                         # 初版歷史基準
    ├── v0.2/                         # 收藏航程完成規格
    ├── v0.3/                         # 海灣事件與魚誌完成規格
    ├── v0.4/                         # 第一趟遠航完成計畫與壓測
    └── v0.5/                         # 現行船屋與航程記憶計畫
```

只有明確屬於單一版本的文件放入 `versions/`。會隨後續版本持續更新的進度、驗收、正式定案、架構與授權文件留在 `docs/` 根層。

## 4. 跨版本文件

| 文件 | 狀態 | 內容與權責 |
|---|---|---|
| [`DEVELOPMENT_PROGRESS.md`](DEVELOPMENT_PROGRESS.md) | 現況 | 版本、完成項目、測試結果、下一階段與開發紀錄 |
| [`TEST_CHECKLIST.md`](TEST_CHECKLIST.md) | 現況 | 已實作功能的回歸驗收清單，不收錄尚未開發功能 |
| [`ASSET_LICENSES.md`](ASSET_LICENSES.md) | 現況 | 第三方素材、授權政策與新增素材時的登錄規則 |
| [`FINAL_GAME_DESIGN.md`](FINAL_GAME_DESIGN.md) | 正式定案 | v0.4～v1.0 產品、世界、收藏、居民、視聽、存檔、後期與版本順序的最高權威 |
| [`COLLECTION_EXPERIENCE_SYSTEMS.md`](COLLECTION_EXPERIENCE_SYSTEMS.md) | 架構參考 | 研究、潮光、船屋、自動／離線、日誌、每日小目標與居民委託模型 |
| [`WORLD_ROUTE_SYSTEM_DESIGN.md`](WORLD_ROUTE_SYSTEM_DESIGN.md) | 架構參考 | 世界區域、航線、魚類棲地、世界狀態、海圖與存檔模型 |
| [`LONG_TERM_GAME_DESIGN.md`](LONG_TERM_GAME_DESIGN.md) | 架構參考 | 療癒單機收藏定位、核心循環、內容支柱、成功標準與早期路線提案 |

## 5. 版本文件

| 版本 | 文件 | 狀態 | 用途 |
|---|---|---|---|
| v0.1 | [`療癒釣魚養成遊戲_初版開發規格.md`](versions/v0.1/療癒釣魚養成遊戲_初版開發規格.md) | 歷史基準 | 初版需求、早期數量與技術提案 |
| v0.2 | [`PHASE_2_GAME_DESIGN.md`](versions/v0.2/PHASE_2_GAME_DESIGN.md) | 已完成規格 | 熟悉度、閃光、水族箱、成就與 v2 存檔 |
| v0.3 | [`PHASE_3_GAME_DESIGN.md`](versions/v0.3/PHASE_3_GAME_DESIGN.md) | 已完成規格 | 三個海灣事件與 v3 存檔 |
| v0.3 | [`FISH_EXPANSION_DESIGN.md`](versions/v0.3/FISH_EXPANSION_DESIGN.md) | 已完成規格 | 10 種新增魚、收藏里程碑與驗收 |
| v0.4 | [`V0_4_IMPLEMENTATION_PLAN.md`](versions/v0.4/V0_4_IMPLEMENTATION_PLAN.md) | 已完成計畫 | Slice A～H、模組邊界、相依順序與完成紀錄 |
| v0.4 | [`SLICE_H_STRESS_REPORT.md`](versions/v0.4/SLICE_H_STRESS_REPORT.md) | 已完成驗收 | SVG、長時間航行、切區、離線與記憶體壓測基線 |
| v0.5 | [`V0_5_IMPLEMENTATION_PLAN.md`](versions/v0.5/V0_5_IMPLEMENTATION_PLAN.md) | 現行實作計畫 | v5、事件、潮光、前三艘船、船別家具、日誌、自動釣架與 Slice A～F |

未來建立 v0.6 以上實作計畫時，新增對應 `versions/v0.x/`，不要把新版本工作附加到 v0.5 文件末端。

## 6. 已完成的長期定案

- 療癒、單機、低思考壓力且沒有錯過懲罰的收藏釣魚定位。
- 完全架空地理與居民，洋流關係、棲地與魚類生態參照真實資料。
- 六大海域、自由返航、多段航線、離線航行與手動停泊。
- 約 100 種魚、區域印章、正式觀察、奇景、閃光與世界完成標準。
- 永久潮光、六艘船、共通插槽與船別家具、溫和航速成長。
- 可去重事件、魚類初遇短句、唯讀航海日誌、今日潮記與安全封存。
- 目前停泊港口限定、需要魚餌、最多三小時且效率約手動一半的靜潮自動釣架。
- 第一張航圖以單一 HTML／CSS／SVG 程式化視覺完整出版，高畫質手繪美術於出版後升級。

## 7. 文件維護規則

1. 開始實作前，先引用 [`FINAL_GAME_DESIGN.md`](FINAL_GAME_DESIGN.md) 的對應章節，並在對應版本資料夾建立實作計畫。
2. 開發期間只在 [`DEVELOPMENT_PROGRESS.md`](DEVELOPMENT_PROGRESS.md) 標記進行中；功能通過測試後才加入 [`TEST_CHECKLIST.md`](TEST_CHECKLIST.md)。
3. 每個 Slice 同步版本號、計畫勾選、進度、測試與根 README，不讓文件先於程式宣稱完成。
4. 已完成版本文件原則上只修正錯字、失效連結或補充實際驗收，不回寫成目前需求。
5. 若測試證明正式定案需要修改，記錄原因、影響範圍與遷移方式，並同步所有從屬文件。
6. 新增、移動或改名文件後，必須檢查所有相對 Markdown 連結。
