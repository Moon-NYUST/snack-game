# Snack Game 開發計畫

## 三大階段

### 階段一：HTML (Static) → Vue 元件
- [x] 開始畫面（`StartScreen.vue`）
- [x] 遊戲畫面（`GameView.vue` + `SnakeGame.vue`）
- [x] 路由配置（`router/index.ts`）

### 階段二：Data（變數）
- [x] 蛇（`snake`）：座標陣列 `Position[]`
- [x] 食物（`foods`）：多個食物，陣列 `Position[]`
- [x] 分數（`score`）：累計進食得分
- [x] 方向（`direction` / `nextDirection`）：當前與下一幀方向
- [x] 遊戲狀態（`isRunning` / `isGameOver` / `isWaiting` / `isPaused`）
- [x] 加速狀態（`isBoosting`）
- [x] 排行榜（`leaderboard` / `liveLeaderboard`）
- [x] 玩家名稱（`playerName`）
- [x] 食物計數（`foodEaten`）
- [x] 等級（`level`）
- [x] 刺球（`spikeBalls`）

### 階段三：Function（Game Policy）
- [x] **移動邏輯（`move`）**：每 tick 向目前方向前進一格
- [x] **方向控制（`changeDirection`）**：禁止 180° 迴轉
- [x] **碰撞規則**：牆壁碰撞、自身碰撞、刺球碰撞
- [x] **進食規則**：蛇頭座標等於食物座標 → 身體增長、加分、重生食物
- [x] **遊戲生命週期**：`startGame` / `resetGame` / `stopGame`

## 已修正問題
- [x] 離開遊戲頁面時未停止遊戲迴圈
- [x] Game Over 缺少返回選單
- [x] 單一食物限制改為陣列
- [x] 無暫停功能
- [x] 蛇移動跳格生硬改為絕對定位+transition
- [x] 超過 500 分卡死（無窮迴圈）
- [x] 加速倍率不精確

## 已實現功能
- [x] 玩家名稱輸入
- [x] 排行榜（金銀銅牌、即時更新、跨 Session）
- [x] 等待按鍵再開始
- [x] 暫停系統（暫停遮罩、設定、退出）
- [x] 等級與速度同步升級
- [x] 尖刺球（金屬造型、平行飄移、彈性碰撞、圓形偵測）
- [x] 霓虹燈與主題切換（新增 Neon, Arcade, Tech, Rainforest 四款）
- [x] **全域主題連動**：透過 App.vue 的 class 與 CSS 變數，大廳/設定/遊戲畫面全域同步配色
- [x] **ESC 雙態行為**：等待時 ESC 返回主選單，遊戲中 ESC 暫停
- [x] **暫停鍵雙槽設定**：設定面板支援綁定兩個暫停按鍵（Space/Escape）

## 剩餘待辦
- [ ] 手機觸控滑動手勢
- [ ] 音效
- [ ] **血條模式**
- [ ] **無限模式**
