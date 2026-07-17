# Atlas of Fins｜鰭之圖鑑

根據《療癒釣魚養成遊戲｜初版開發規格書》製作的可玩瀏覽器遊戲，目前版本為 v0.4.0-alpha.2，已完成第一趟遠航所需的區域資料、多棲地、世界狀態與 v4 存檔基礎；現有可玩內容完整保留眠潮灣三個事件與 30 種魚。這是一段沒有時間壓力的海灣生活：釣魚、補完圖鑑、販售漁獲、升級釣具，再把簡陋帆船慢慢整理成溫暖的家。

長期方向已正式定案為療癒單機收藏遊戲：世界地理、港口與人物完全架空，洋流關係與魚類生態參照真實資料；玩家將帶著船屋沿六大海域航行，逐步建立約 100 種魚的世界圖鑑。既有每日三項小目標會保留並加入區域居民委託；世界海圖、新海域、研究航線、潮光、自動日誌與進階船屋目前尚未出現在可玩版本，完整未來規格見 [`docs/FINAL_GAME_DESIGN.md`](docs/FINAL_GAME_DESIGN.md)。

## 開始遊玩

需求：Python 3（僅用來提供本機靜態伺服器）。

```bash
npm start
```

接著開啟 <http://127.0.0.1:4173>。不需要安裝 npm 套件或執行建置。

## 開發者模式

主選單選擇「開發者模式」，輸入密碼 `atlas-dev` 即可進入全解鎖測試旅程。此模式具備全部魚種圖鑑、釣點、裝備、家具、成就、測試標本與充足資源，並使用獨立的本機主要／備份存檔，不會覆蓋一般航程。

## 已完成內容

- 按住／放開控制張力的完整釣魚小遊戲，支援滑鼠、觸控與空白鍵
- 30 種資料驅動魚類、5 種行為模板、3 個釣點
- 14 常見、11 少見、5 稀有的魚種分布
- 3 支魚竿、5 種魚餌，以及釣點／時間／天氣／魚餌加權魚池
- 捕獲尺寸、重量、個人紀錄、捕獲環境、稀有度與尺寸售價公式
- 具備初次相遇、生態筆記、熟悉與精通階級的 30 格圖鑑
- 具備紀錄級／精通加成與分魚種保底的閃光個體收藏
- 漁獲販售、釣具／魚餌／家具商店與單一金幣經濟
- 四時段 20 分鐘日夜循環、床鋪切換時段、晴天與細雨
- 10 件固定插槽家具與圖鑑里程碑獎勵
- 隨圖鑑進度擴建至 15 格、可放入與取回完整標本的船屋水族箱
- 13 項永久收藏成就、手動領獎、可切換稱號與水族箱拾光裝飾
- 每日三項無懲罰委託
- 決定性航海日事件排程，以及「銀潮靠岸」、「月光潮汐」、「雨後漂流」三個事件
- 多釣點、限定時段與指定天氣魚池加成，並具備分階段目標、首次稱號與重複完成獎勵
- 六步驟遊戲內教學
- 程式化場景、魚類 SVG、Web Audio 音效與三組環境樂句
- 版本化主要／備份本機存檔及缺欄位遷移
- 眠潮灣區域、三釣點、跨區棲地與區域發現印章資料基礎
- v4 世界狀態、未知位置安全修復，以及遷移前原始存檔備份
- 桌面與行動裝置響應式介面

## 測試

```bash
npm test
```

目前共有 54 項單元測試，並以 `tests/fixtures/` 中的一般、高完成度與開發者三種固定 v3 存檔驗證 v4 遷移相容性、世界狀態修復與一般／開發者存檔隔離。

瀏覽器端完整流程測試位於 `tests/browser-smoke.mjs`，會驗證開發者模式、30 種魚圖鑑、新 SVG 輪廓、海灣事件與平靜日、新遊戲、拋竿、張力捕獲、販售、購買魚餌、船屋睡眠、教學完成、v3 至 v4 遷移與原始備份、內容安全檢查及未捕捉例外。它需搭配已開啟遠端除錯埠 `9223` 的 Chromium 瀏覽器執行：

```bash
npm run test:browser
```

第三方素材使用狀態記錄於 [`docs/ASSET_LICENSES.md`](docs/ASSET_LICENSES.md)，回歸驗收項目位於 [`docs/TEST_CHECKLIST.md`](docs/TEST_CHECKLIST.md)。

## 專案文件

完整閱讀順序、文件權責與「已完成／已核准／仍提案」的界線，請先看 [`docs/README.md`](docs/README.md)。

- 目前版本、測試與下一步：[`docs/DEVELOPMENT_PROGRESS.md`](docs/DEVELOPMENT_PROGRESS.md)
- 長期遊戲正式定案：[`docs/FINAL_GAME_DESIGN.md`](docs/FINAL_GAME_DESIGN.md)
- v0.4 實作拆分：[`docs/V0_4_IMPLEMENTATION_PLAN.md`](docs/V0_4_IMPLEMENTATION_PLAN.md)
- 長期產品方向與版本路線：[`docs/LONG_TERM_GAME_DESIGN.md`](docs/LONG_TERM_GAME_DESIGN.md)
- 世界航線與區域資料架構：[`docs/WORLD_ROUTE_SYSTEM_DESIGN.md`](docs/WORLD_ROUTE_SYSTEM_DESIGN.md)
- 研究、船屋、自動航行與詩意日誌：[`docs/COLLECTION_EXPERIENCE_SYSTEMS.md`](docs/COLLECTION_EXPERIENCE_SYSTEMS.md)
- 已完成 v0.2／v0.3 規格：[`docs/PHASE_2_GAME_DESIGN.md`](docs/PHASE_2_GAME_DESIGN.md)、[`docs/PHASE_3_GAME_DESIGN.md`](docs/PHASE_3_GAME_DESIGN.md)
- 10 種新魚設計與驗收：[`docs/FISH_EXPANSION_DESIGN.md`](docs/FISH_EXPANSION_DESIGN.md)
