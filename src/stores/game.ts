import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
// 1. 擴充 Food 的 type 型態，除了 'normal' 和 'poison' 之外，新增 'gold' 種類
// 2. 在 state 中新增 isMagnetMode (boolean，預設 false) 和 magnetTimer (number，預設 0)
type FoodType = 'normal' | 'poison' | 'gold'

interface Position {
  x: number
  y: number
}

interface Food extends Position {
  type: FoodType
}

interface SpikeBall {
  x: number
  y: number
  dx: number
  dy: number
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

export interface LeaderboardEntry {
  name: string
  score: number
  rankChange: number | null
  isLive?: boolean
}

export interface CoinEffect {
  id: number
  amount: number
  x: number
  y: number
}

// ===== 皮膚系統 =====
type SkinCategory = 'basic' | 'premium' | 'rare'

interface Skin {
  id: string
  name: string
  category: SkinCategory
  price: number // 原價
  unlocked: boolean
  effect?: string // 特效描述
}

interface GachaResult {
  type: 'win' | 'loss' // win = 抽中皮膚, loss = 謝謝惠顧
  skinId?: string
  skinName?: string
  coinsEarned?: number // 若為重複皮膚則返還金幣
}

const SKINS_DATABASE: Record<string, Skin> = {
  // 初級皮膚 (basic, 原價 500)
  'basic_red': { id: 'basic_red', name: '烈焰紅', category: 'basic', price: 500, unlocked: false },
  'basic_orange': { id: 'basic_orange', name: '橘橙', category: 'basic', price: 500, unlocked: true }, // 預設解鎖
  'basic_yellow': { id: 'basic_yellow', name: '檸檬黃', category: 'basic', price: 500, unlocked: false },
  'basic_green': { id: 'basic_green', name: '森林綠', category: 'basic', price: 500, unlocked: false },
  'basic_blue': { id: 'basic_blue', name: '天空藍', category: 'basic', price: 500, unlocked: false },
  'basic_purple': { id: 'basic_purple', name: '皇家紫', category: 'basic', price: 500, unlocked: false },
  'basic_black': { id: 'basic_black', name: '深夜黑', category: 'basic', price: 500, unlocked: false },
  'basic_white': { id: 'basic_white', name: '純淨白', category: 'basic', price: 500, unlocked: false },

  // 高級皮膚 (premium)
  'premium_rainbow': { id: 'premium_rainbow', name: '彩虹光暈', category: 'premium', price: 1500, unlocked: false },
  'premium_gold': { id: 'premium_gold', name: '黃金尊貴', category: 'premium', price: 1500, unlocked: false },
  'premium_zebra': { id: 'premium_zebra', name: '斑馬條紋', category: 'premium', price: 2000, unlocked: false },
  'premium_flame': { id: 'premium_flame', name: '烈焰條紋', category: 'premium', price: 2000, unlocked: false },

  // 稀有皮膚 (rare, 只能透過抽獎獲得)
  'rare_cyberpunk': { id: 'rare_cyberpunk', name: '賽博龐克彩虹', category: 'rare', price: 0, unlocked: false, effect: '炫彩閃爍' },
  'rare_ghost': { id: 'rare_ghost', name: '幽靈透明', category: 'rare', price: 0, unlocked: false, effect: '幽靈光暈' },
  'rare_rgb': { id: 'rare_rgb', name: 'RGB燈條', category: 'rare', price: 0, unlocked: false, effect: '彩色跑馬燈' },
  'rare_lava': { id: 'rare_lava', name: '岩漿熔流', category: 'rare', price: 0, unlocked: false, effect: '熔岩特效' },
}

const STORAGE_KEY = 'snack-game-leaderboard'
export const SETTINGS_V2_KEY = 'SnakeGame_SettingsV2'
const SKINS_STORAGE_KEY = 'snack-skins-unlock'
const CURRENT_SKIN_STORAGE_KEY = 'snack-current-skin'
const CURRENT_THEME_STORAGE_KEY = 'snack-current-theme'
const FIRST_BUY_DISCOUNT_STORAGE_KEY = 'snack-first-buy-discount'

type Theme = 'theme-neon' | 'theme-arcade' | 'theme-tech' | 'theme-rainforest'
type GameMode = 'classic' | 'challenge'
const DEFAULT_THEME: Theme = 'theme-neon'
const DEFAULT_GAME_MODE: GameMode = 'classic'
const DEFAULT_CHALLENGE_DIFFICULTY = 1 as const

function loadCurrentTheme(): Theme {
  const stored = localStorage.getItem(CURRENT_THEME_STORAGE_KEY)
  if (stored === 'theme-neon' || stored === 'theme-arcade' || stored === 'theme-tech' || stored === 'theme-rainforest') {
    return stored
  }
  return DEFAULT_THEME
}

const DEFAULT_BINDINGS_V2 = {
  Up: 'W',
  Down: 'S',
  Left: 'A',
  Right: 'D',
  Boost: 'ShiftLeft',
  Pause: ['Space', 'Escape'] as [string, string],
}

const ARROW_FALLBACKS: Record<'Up' | 'Down' | 'Left' | 'Right', string> = {
  Up: 'ArrowUp',
  Down: 'ArrowDown',
  Left: 'ArrowLeft',
  Right: 'ArrowRight',
}

function expandKey(key: string): string[] {
  if (!key) return []
  const out = new Set<string>([key])
  if (key.length === 1) {
    out.add(key.toLowerCase())
    out.add(key.toUpperCase())
  }
  return [...out]
}

function normalizePauseKey(key: string): string {
  return key === 'Space' ? ' ' : key
}

function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export const useGameStore = defineStore('game', () => {
  const GRID_SIZE = 20

  // Configurable settings
  const keysMoveUp = ref<string[]>(JSON.parse(localStorage.getItem('snack-keys-up') || '["ArrowUp", "w", "W"]'))
  const keysMoveDown = ref<string[]>(JSON.parse(localStorage.getItem('snack-keys-down') || '["ArrowDown", "s", "S"]'))
  const keysMoveLeft = ref<string[]>(JSON.parse(localStorage.getItem('snack-keys-left') || '["ArrowLeft", "a", "A"]'))
  const keysMoveRight = ref<string[]>(JSON.parse(localStorage.getItem('snack-keys-right') || '["ArrowRight", "d", "D"]'))
  const keysPause = ref<string[]>(JSON.parse(localStorage.getItem('snack-keys-pause') || '[" ", "Escape"]'))
  const keyBoost = ref<string>(localStorage.getItem('snack-key-boost') || 'j')

  const INITIAL_SPEED = ref(Number(localStorage.getItem('snack-initial-speed') || '150'))
  const FOODS_PER_LEVEL = ref(Number(localStorage.getItem('snack-foods-per-level') || '10'))
  const SCORE_PER_FOOD = ref(Number(localStorage.getItem('snack-score-per-food') || '10'))
  const SPIKE_SPAWN_SCORE = ref(Number(localStorage.getItem('snack-spike-spawn-score') || '100'))
  const SPIKE_SPEED = ref(Number(localStorage.getItem('snack-spike-speed') || '5'))
  const SPEEDUP_FACTOR = ref(Number(localStorage.getItem('snack-speedup-factor') || '10'))
  const BOOST_FACTOR = ref(Number(localStorage.getItem('snack-boost-factor') || '5'))
  const BOOST_MULTIPLIER = ref(Number(localStorage.getItem('snack-boost-multiplier') || '2'))
  const LEVEL_UP_SCORE = ref(Number(localStorage.getItem('snack-level-up-score') || '200'))
  const MAGNET_DURATION = ref(Number(localStorage.getItem('snack-magnet-duration') || '8'))
  const MAGNET_RANGE = ref(Number(localStorage.getItem('snack-magnet-range') || '3'))

  const colorPageBg = ref<string>(localStorage.getItem('snack-color-page-bg') || '#ffffff')
  const colorGridBg = ref<string>(localStorage.getItem('snack-color-grid-bg') || '#ecf0f1')
  const colorPanelBg = ref<string>(localStorage.getItem('snack-color-panel-bg') || '#f8f9fa')
  const currentTheme = ref<Theme>(loadCurrentTheme())
  const gameMode = ref<GameMode>(DEFAULT_GAME_MODE)
  const challengeDifficulty = ref<1 | 2 | 3>(DEFAULT_CHALLENGE_DIFFICULTY)
  const challengeComplete = ref(false)

  if (currentTheme.value === 'theme-rainforest') {
    colorPageBg.value = '#0f3624'
    colorGridBg.value = '#132a13'
    colorPanelBg.value = '#1b4332'
  }

  ensureMovementKeys()

  function resetSettings() {
    keysMoveUp.value = ["ArrowUp", "w", "W"]
    keysMoveDown.value = ["ArrowDown", "s", "S"]
    keysMoveLeft.value = ["ArrowLeft", "a", "A"]
    keysMoveRight.value = ["ArrowRight", "d", "D"]
    keysPause.value = [" ", "Escape"]
    keyBoost.value = 'j'

    INITIAL_SPEED.value = 150
    FOODS_PER_LEVEL.value = 10
    SCORE_PER_FOOD.value = 10
    SPIKE_SPAWN_SCORE.value = 100
    SPIKE_SPEED.value = 5
    SPEEDUP_FACTOR.value = 10
    BOOST_FACTOR.value = 5
    BOOST_MULTIPLIER.value = 2
    LEVEL_UP_SCORE.value = 200
    MAGNET_DURATION.value = 8
    MAGNET_RANGE.value = 3

    colorPageBg.value = '#ffffff'
    colorGridBg.value = '#ecf0f1'
    colorPanelBg.value = '#f8f9fa'

    saveAllSettings()
  }

  function saveAllSettings() {
    localStorage.setItem('snack-keys-up', JSON.stringify(keysMoveUp.value))
    localStorage.setItem('snack-keys-down', JSON.stringify(keysMoveDown.value))
    localStorage.setItem('snack-keys-left', JSON.stringify(keysMoveLeft.value))
    localStorage.setItem('snack-keys-right', JSON.stringify(keysMoveRight.value))
    localStorage.setItem('snack-keys-pause', JSON.stringify(keysPause.value))
    localStorage.setItem('snack-key-boost', keyBoost.value)

    localStorage.setItem('snack-initial-speed', INITIAL_SPEED.value.toString())
    localStorage.setItem('snack-foods-per-level', FOODS_PER_LEVEL.value.toString())
    localStorage.setItem('snack-score-per-food', SCORE_PER_FOOD.value.toString())
    localStorage.setItem('snack-spike-spawn-score', SPIKE_SPAWN_SCORE.value.toString())
    localStorage.setItem('snack-spike-speed', SPIKE_SPEED.value.toString())
    localStorage.setItem('snack-speedup-factor', SPEEDUP_FACTOR.value.toString())
    localStorage.setItem('snack-boost-factor', BOOST_FACTOR.value.toString())
    localStorage.setItem('snack-boost-multiplier', BOOST_MULTIPLIER.value.toString())
    localStorage.setItem('snack-level-up-score', LEVEL_UP_SCORE.value.toString())
    localStorage.setItem('snack-magnet-duration', MAGNET_DURATION.value.toString())
    localStorage.setItem('snack-magnet-range', MAGNET_RANGE.value.toString())

    localStorage.setItem('snack-color-page-bg', colorPageBg.value)
    localStorage.setItem('snack-color-grid-bg', colorGridBg.value)
    localStorage.setItem('snack-color-panel-bg', colorPanelBg.value)
    localStorage.setItem(CURRENT_THEME_STORAGE_KEY, currentTheme.value)
  }

  function setTheme(theme: string) {
    if (theme === 'theme-neon' || theme === 'theme-arcade' || theme === 'theme-tech' || theme === 'theme-rainforest') {
      currentTheme.value = theme
      if (theme === 'theme-rainforest') {
        colorPageBg.value = '#0f3624'
        colorGridBg.value = '#132a13'
        colorPanelBg.value = '#1b4332'
      }
      try {
        localStorage.setItem(CURRENT_THEME_STORAGE_KEY, theme)
      } catch {}
      return true
    }
    return false
  }

  function ensureMovementKeys() {
    const fill = (
      target: typeof keysMoveUp,
      dir: 'Up' | 'Down' | 'Left' | 'Right',
    ) => {
      if (target.value.length > 0) return
      const custom = DEFAULT_BINDINGS_V2[dir]
      const arrow = ARROW_FALLBACKS[dir]
      target.value = [...new Set([...expandKey(custom), ...expandKey(arrow)])]
    }
    fill(keysMoveUp, 'Up')
    fill(keysMoveDown, 'Down')
    fill(keysMoveLeft, 'Left')
    fill(keysMoveRight, 'Right')
    if (keysPause.value.length === 0) {
      keysPause.value = DEFAULT_BINDINGS_V2.Pause.map(normalizePauseKey)
    }
  }

  function loadSettingsV2(): boolean {
    try {
      const raw = localStorage.getItem(SETTINGS_V2_KEY)
      if (!raw) {
        ensureMovementKeys()
        return false
      }

      const parsed = JSON.parse(raw) as {
        keybindings?: {
          Up?: string
          Down?: string
          Left?: string
          Right?: string
          Boost?: string
          Pause?: string[]
        }
        ruleInputs?: {
          initialSpeed?: number
          foodScore?: number
          speedBoost?: number
          spikeSpeed?: number
          spikeThreshold?: number
          boostMultiplier?: number
          levelUpScore?: number
          magnetDuration?: number
          magnetRange?: number
        }
      }

      const kb = parsed.keybindings ?? {}
      const rules = parsed.ruleInputs ?? {}

      const applyDirection = (
        dir: 'Up' | 'Down' | 'Left' | 'Right',
        target: typeof keysMoveUp,
      ) => {
        const custom = (kb[dir] ?? '').trim() || DEFAULT_BINDINGS_V2[dir]
        const arrow = ARROW_FALLBACKS[dir]
        target.value = [...new Set([...expandKey(custom), ...expandKey(arrow)])]
      }

      applyDirection('Up', keysMoveUp)
      applyDirection('Down', keysMoveDown)
      applyDirection('Left', keysMoveLeft)
      applyDirection('Right', keysMoveRight)

      const pause = kb.Pause ?? DEFAULT_BINDINGS_V2.Pause
      keysPause.value = [
        normalizePauseKey((pause[0] ?? '').trim() || DEFAULT_BINDINGS_V2.Pause[0]),
        normalizePauseKey((pause[1] ?? '').trim() || DEFAULT_BINDINGS_V2.Pause[1]),
      ]

      const boost = (kb.Boost ?? '').trim() || DEFAULT_BINDINGS_V2.Boost
      keyBoost.value = boost.length === 1 ? boost.toLowerCase() : boost

      if (rules.initialSpeed != null && rules.initialSpeed > 0) {
        INITIAL_SPEED.value = Math.max(50, Math.round(1000 / rules.initialSpeed))
      }
      if (rules.foodScore != null && rules.foodScore > 0) {
        SCORE_PER_FOOD.value = rules.foodScore
      }
      if (rules.boostMultiplier != null && rules.boostMultiplier > 1) {
        BOOST_MULTIPLIER.value = rules.boostMultiplier
        BOOST_FACTOR.value = Math.round((rules.boostMultiplier - 1) * 100)
      } else if (rules.speedBoost != null && rules.speedBoost > 0) {
        BOOST_MULTIPLIER.value = 1 + rules.speedBoost
        BOOST_FACTOR.value = Math.round(rules.speedBoost * 100)
      }
      if (rules.spikeSpeed != null && rules.spikeSpeed > 0) {
        SPIKE_SPEED.value = rules.spikeSpeed
      }
      if (rules.spikeThreshold != null && rules.spikeThreshold >= 0) {
        SPIKE_SPAWN_SCORE.value = rules.spikeThreshold
      }
      if (rules.levelUpScore != null && rules.levelUpScore > 0) {
        LEVEL_UP_SCORE.value = rules.levelUpScore
      }
      if (rules.magnetDuration != null && rules.magnetDuration > 0) {
        MAGNET_DURATION.value = rules.magnetDuration
      }
      if (rules.magnetRange != null && rules.magnetRange > 0) {
        MAGNET_RANGE.value = rules.magnetRange
      }

      ensureMovementKeys()
      saveAllSettings()
      return true
    } catch {
      ensureMovementKeys()
      return false
    }
  }

  const snake = ref<Position[]>([{ x: 10, y: 10 }])
  // 💡 關鍵魔改 1：將 foods 陣列的型態從 Position[] 正式升級成 Food[] 結構
  const foods = ref<Food[]>([])
  // 金幣系統：畫面上的金幣位置、單局收集、與總計
  const coins = ref<Position[]>([])
  const currentMatchCoins = ref<number>(0)
  //控制金幣數量 此為調整成累積ref<number>(Number(localStorage.getItem('snake_total_coins') || '0'))
  //此為強制鎖定金幣數量 ref<number>(999999)
  const totalCoins = ref<number>(Number(localStorage.getItem('snake_total_coins') || '0'))
  const direction = ref<Direction>('RIGHT')
  const nextDirection = ref<Direction>('RIGHT')
  const score = ref(0)
  const isRunning = ref(false)
  const isGameOver = ref(false)
  const isWaiting = ref(true)
  const isPaused = ref(false)
  const isBoosting = ref(false)
  const isMagnetMode = ref(false)
  const magnetTimer = ref(0)
  const playerName = ref('')
  const leaderboard = ref<LeaderboardEntry[]>(loadLeaderboard())
  const spikeBalls = ref<SpikeBall[]>([])
  const foodEaten = ref(0)
  const rankSessionSnapshot = ref<LeaderboardEntry[]>([])
  const coinEffects = ref<CoinEffect[]>([])
  let coinEffectCounter = 0
  let gameLoop: ReturnType<typeof setInterval> | null = null
  let physicsLoop: number | null = null
  let lastTime = 0

  // ===== 皮膚系統 =====
  function loadSkinsFromStorage(): Record<string, Skin> {
    try {
      const raw = localStorage.getItem(SKINS_STORAGE_KEY)
      if (!raw) return { ...SKINS_DATABASE }
      const data = JSON.parse(raw)
      // 合併數據庫皮膚與儲存狀態
      const merged = { ...SKINS_DATABASE }
      Object.keys(merged).forEach((id) => {
        const skin = merged[id]
        if (skin && data[id]?.unlocked !== undefined) {
          skin.unlocked = data[id].unlocked
        }
      })
      return merged
    } catch {
      return { ...SKINS_DATABASE }
    }
  }

  function saveSkinsToStorage(skinsData: Record<string, Skin>) {
    try {
      const toSave: Record<string, { unlocked: boolean }> = {}
      Object.keys(skinsData).forEach((id) => {
        const skin = skinsData[id]
        if (skin) {
          toSave[id] = { unlocked: skin.unlocked }
        }
      })
      localStorage.setItem(SKINS_STORAGE_KEY, JSON.stringify(toSave))
    } catch {}
  }

  const skins = ref<Record<string, Skin>>(loadSkinsFromStorage())
  const currentSkinId = ref<string>(
    localStorage.getItem(CURRENT_SKIN_STORAGE_KEY) || 'basic_orange'
  )

  function loadFirstBuyDiscount(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(FIRST_BUY_DISCOUNT_STORAGE_KEY)
      return raw ? JSON.parse(raw) : { basic: false, premium: false }
    } catch {
      return { basic: false, premium: false }
    }
  }

  const firstBuyDiscountUsed = ref<Record<string, boolean>>(loadFirstBuyDiscount())

  function saveFirstBuyDiscount() {
    try {
      localStorage.setItem(FIRST_BUY_DISCOUNT_STORAGE_KEY, JSON.stringify(firstBuyDiscountUsed.value))
    } catch {}
  }

  function buySkin(skinId: string): boolean {
    const skin = skins.value[skinId]
    if (!skin) return false
    if (skin.unlocked) return false

    const category = skin.category
    let price = skin.price

    // 檢查首購折扣
    if (!firstBuyDiscountUsed.value[category]) {
      price = Math.round(price * 0.1) // 打 1 折
      firstBuyDiscountUsed.value[category] = true
      saveFirstBuyDiscount()
    }

    // 檢查金幣是否足夠
    if (totalCoins.value < price) return false

    // 扣款並解鎖
    totalCoins.value -= price
    skin.unlocked = true
    saveSkinsToStorage(skins.value)
    try {
      localStorage.setItem('snake_total_coins', String(totalCoins.value))
    } catch {}

    return true
  }

  function equipSkin(skinId: string): boolean {
    const skin = skins.value[skinId]
    if (!skin || !skin.unlocked) return false
    currentSkinId.value = skinId
    try {
      localStorage.setItem(CURRENT_SKIN_STORAGE_KEY, skinId)
    } catch {}
    return true
  }

  function drawGacha(draws: number = 1): GachaResult[] {
    const cost = draws === 1 ? 300 : draws === 10 ? 2700 : 300 * draws
    if (totalCoins.value < cost) return []

    totalCoins.value -= cost
    const results: GachaResult[] = []

    const rareSkins = Object.keys(skins.value).filter((id) => skins.value[id]?.category === 'rare') as string[]
    const basicSkins = Object.keys(skins.value).filter((id) => skins.value[id]?.category === 'basic') as string[]
    const premium1500Skins = Object.keys(skins.value).filter(
      (id) => skins.value[id]?.category === 'premium' && skins.value[id]?.price === 1500
    ) as string[]
    const premium2000Skins = Object.keys(skins.value).filter(
      (id) => skins.value[id]?.category === 'premium' && skins.value[id]?.price === 2000
    ) as string[]

    for (let i = 0; i < draws; i++) {
      const rand = Math.random()
      let winSkinId: string | null = null
      let priceIfDuplicate = 0

      if (rand < 0.8) {
        // 80% 謝謝惠顧
        results.push({ type: 'loss' })
      } else if (rand < 0.9) {
        // 10% 初級皮膚
        const idx = Math.floor(Math.random() * basicSkins.length)
        winSkinId = basicSkins[idx] ?? null
        priceIfDuplicate = 500
      } else if (rand < 0.95) {
        // 5% 1500元高級
        const idx = Math.floor(Math.random() * premium1500Skins.length)
        winSkinId = premium1500Skins[idx] ?? null
        priceIfDuplicate = 1500
      } else if (rand < 0.98) {
        // 3% 2000元高級
        const idx = Math.floor(Math.random() * premium2000Skins.length)
        winSkinId = premium2000Skins[idx] ?? null
        priceIfDuplicate = 2000
      } else {
        // 2% 稀有
        const idx = Math.floor(Math.random() * rareSkins.length)
        winSkinId = rareSkins[idx] ?? null
        priceIfDuplicate = 0 // 稀有皮膚沒有現金價值，但若重複仍須退款
      }

      if (winSkinId) {
        const skin = skins.value[winSkinId]
        if (skin && skin.unlocked) {
          // 重複皮膚，全額退款
          totalCoins.value += priceIfDuplicate
          results.push({
            type: 'loss',
            coinsEarned: priceIfDuplicate,
          })
        } else if (skin) {
          // 首次獲得
          skin.unlocked = true
          results.push({
            type: 'win',
            skinId: winSkinId,
            skinName: skin.name,
          })
        }
      }
    }

    saveSkinsToStorage(skins.value)
    try {
      localStorage.setItem('snake_total_coins', String(totalCoins.value))
    } catch {}

    return results
  }

  const level = computed(() => Math.floor(score.value / LEVEL_UP_SCORE.value) + 1)
  const challengeReward = computed(() => 300 * challengeDifficulty.value)

  const CHALLENGE_PARAMS: Record<1 | 2 | 3, {
    INITIAL_SPEED: number
    SCORE_PER_FOOD: number
    SPEEDUP_FACTOR: number
    LEVEL_UP_SCORE: number
    SPIKE_SPAWN_SCORE: number
    SPIKE_SPEED: number
    BOOST_MULTIPLIER: number
    MAGNET_DURATION: number
    MAGNET_RANGE: number
  }> = {
    1: { INITIAL_SPEED: 200, SCORE_PER_FOOD: 10, SPEEDUP_FACTOR: 10, LEVEL_UP_SCORE: 100, SPIKE_SPAWN_SCORE: 500, SPIKE_SPEED: 3, BOOST_MULTIPLIER: 1, MAGNET_DURATION: 10, MAGNET_RANGE: 5 },
    2: { INITIAL_SPEED: 150, SCORE_PER_FOOD: 15, SPEEDUP_FACTOR: 13, LEVEL_UP_SCORE: 130, SPIKE_SPAWN_SCORE: 350, SPIKE_SPEED: 4, BOOST_MULTIPLIER: 1.2, MAGNET_DURATION: 8, MAGNET_RANGE: 4 },
    3: { INITIAL_SPEED: 110, SCORE_PER_FOOD: 20, SPEEDUP_FACTOR: 16, LEVEL_UP_SCORE: 170, SPIKE_SPAWN_SCORE: 200, SPIKE_SPEED: 5, BOOST_MULTIPLIER: 1.5, MAGNET_DURATION: 6, MAGNET_RANGE: 3 },
  }

  function applyChallengeModeOverrides() {
    if (gameMode.value !== 'challenge') return
    const params = CHALLENGE_PARAMS[challengeDifficulty.value]
    INITIAL_SPEED.value = params.INITIAL_SPEED
    SCORE_PER_FOOD.value = params.SCORE_PER_FOOD
    SPEEDUP_FACTOR.value = params.SPEEDUP_FACTOR
    LEVEL_UP_SCORE.value = params.LEVEL_UP_SCORE
    SPIKE_SPAWN_SCORE.value = params.SPIKE_SPAWN_SCORE
    SPIKE_SPEED.value = params.SPIKE_SPEED
    BOOST_MULTIPLIER.value = params.BOOST_MULTIPLIER
    BOOST_FACTOR.value = Math.round((params.BOOST_MULTIPLIER - 1) * 100)
    MAGNET_DURATION.value = params.MAGNET_DURATION
    MAGNET_RANGE.value = params.MAGNET_RANGE
  }

  function setGameMode(mode: GameMode) {
    gameMode.value = mode
    if (mode === 'classic') {
      challengeDifficulty.value = DEFAULT_CHALLENGE_DIFFICULTY
      challengeComplete.value = false
    }
    applyChallengeModeOverrides()
  }

  function setChallengeDifficulty(difficulty: 1 | 2 | 3) {
    challengeDifficulty.value = difficulty
    if (gameMode.value !== 'challenge') {
      gameMode.value = 'challenge'
    }
    applyChallengeModeOverrides()
  }

  function getChallengeProgressReward(levelValue: number) {
    if (levelValue <= 1) return 0
    const base = 5 + 10 * (levelValue - 1)
    return base * challengeDifficulty.value
  }

  function addCoinEffect(amount: number, x: number = GRID_SIZE / 2, y: number = 2) {
    const id = coinEffectCounter++
    const effect: CoinEffect = { id, amount, x, y }
    coinEffects.value.push(effect)

    // 自動在 0.8 秒後移除該特效
    setTimeout(() => {
      coinEffects.value = coinEffects.value.filter((e) => e.id !== id)
    }, 800)
  }

  function completeChallenge() {
    if (challengeComplete.value) return
    challengeComplete.value = true
    isRunning.value = false
    isPaused.value = false
    stopLoop()
    const reward = challengeReward.value
    totalCoins.value += reward
    addCoinEffect(reward, GRID_SIZE / 2, 2)
    try {
      localStorage.setItem('snake_total_coins', String(totalCoins.value))
    } catch {}
    saveScore(playerName.value, score.value)
  }

  function getInterval(): number {
    return INITIAL_SPEED.value / (1 + (SPEEDUP_FACTOR.value / 100) * (level.value - 1))
  }

  function getEffectiveInterval(): number {
    if (!isBoosting.value) return getInterval()
    const mult = BOOST_MULTIPLIER.value > 1 ? BOOST_MULTIPLIER.value : 1 + BOOST_FACTOR.value / 100
    return getInterval() / mult
  }

  const liveLeaderboard = computed<LeaderboardEntry[]>(() => {
    if (!isRunning.value || isGameOver.value || !playerName.value) {
      return leaderboard.value
    }

    const snapshot = rankSessionSnapshot.value
    const oldRanks = new Map<string, number>()
    snapshot.forEach((e, i) => oldRanks.set(e.name, i))

    const storedEntry = snapshot.find((e) => e.name === playerName.value)
    const storedScore = storedEntry?.score ?? 0
    const displayScore = Math.max(storedScore, score.value)
    const scoreImproved = displayScore > storedScore

    let list: { name: string; score: number }[]
    if (storedEntry) {
      list = snapshot.map((e) =>
        e.name === playerName.value
          ? { name: e.name, score: displayScore }
          : { name: e.name, score: e.score },
      )
    } else {
      list = [
        ...snapshot.map((e) => ({ name: e.name, score: e.score })),
        { name: playerName.value, score: displayScore },
      ]
    }

    list.sort((a, b) => b.score - a.score)

    return list.slice(0, 5).map((e) => {
      const isLivePlayer = e.name === playerName.value
      const newRank = list.indexOf(e)
      const oldRank = oldRanks.get(e.name)
      let rankChange: number | null = null
      if (oldRank !== undefined) {
        rankChange = oldRank - newRank
      }
      return {
        name: e.name,
        score: e.score,
        rankChange: isLivePlayer && rankChange === 0 && scoreImproved ? 0 : rankChange,
        isLive: isLivePlayer && scoreImproved && oldRank !== undefined,
      }
    })
  })

  watch(level, (newLevel, oldLevel) => {
    if (isRunning.value && !isPaused.value) {
      stopLoop(); startLoop()
    }

    if (gameMode.value === 'challenge' && isRunning.value && !isPaused.value && !challengeComplete.value && oldLevel != null && newLevel > oldLevel) {
      const reward = getChallengeProgressReward(newLevel)
      if (reward > 0) {
        totalCoins.value += reward
        addCoinEffect(reward, GRID_SIZE / 2, 2)
        try { localStorage.setItem('snake_total_coins', String(totalCoins.value)) } catch {}
      }
      if (newLevel >= 10) {
        completeChallenge()
      }
    }
  })

  // 💡 關鍵魔改 2：讓生成食物函數回傳帶有型態的 Food 結構
  // 修改生成食物的邏輯：隨機數分佈調整為 65% 普通食物('normal')、20% 毒蘋果('poison')、15% 黃金果實('gold')
  function generateFood(): Food | null {
    const maxAttempts = 1000

    // 新規則：在分數低於 100 時只出現普通食物；分數 >= 100 時才開放多種類型
    // 分數 >= 100 的機率：normal 80% / poison 15% / gold 5%
    let type: FoodType = 'normal'
    if (score.value >= 100) {
      const rand = Math.random()
      if (rand < 0.80) {
        type = 'normal'
      } else if (rand < 0.95) {
        type = 'poison'
      } else {
        type = 'gold'
      }
    } else {
      type = 'normal'
    }

    for (let i = 0; i < maxAttempts; i++) {
      const candidate: Position = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      }
      const onSnake = snake.value.some((s) => s.x === candidate.x && s.y === candidate.y)
      const onFood = foods.value.some((f) => f.x === candidate.x && f.y === candidate.y)
      if (!onSnake && !onFood) return { ...candidate, type }
    }

    const empty: Position[] = []
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const onSnake = snake.value.some((s) => s.x === x && s.y === y)
        const onFood = foods.value.some((f) => f.x === x && f.y === y)
        if (!onSnake && !onFood) empty.push({ x, y })
      }
    }
    if (empty.length > 0) {
      const chosen = empty[Math.floor(Math.random() * empty.length)]!
      return { ...chosen, type }
    }
    return null
  }

  // 生成金幣（畫面上最多 1 顆）
  function spawnCoin() {
    if (coins.value.length >= 1) return
    const maxAttempts = 1000
    for (let i = 0; i < maxAttempts; i++) {
      const candidate: Position = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      }
      const onSnake = snake.value.some((s) => s.x === candidate.x && s.y === candidate.y)
      const onFood = foods.value.some((f) => f.x === candidate.x && f.y === candidate.y)
      const onCoin = coins.value.some((c) => c.x === candidate.x && c.y === candidate.y)
      const onSpike = spikeBalls.value.some((b) => Math.floor(b.x) === candidate.x && Math.floor(b.y) === candidate.y)
      if (!onSnake && !onFood && !onCoin && !onSpike) {
        coins.value.push(candidate)
        return
      }
    }
    // 若找不到位置則不生成
  }

  function eatVirtualFood() {
    const prevLevel = level.value
    foodEaten.value++
    score.value += SCORE_PER_FOOD.value
    if (level.value > prevLevel) score.value += level.value
  }

  function syncFoodCount() {
    const target = Math.floor(score.value / 100) + 1
    while (foods.value.length < target) {
      const pos = generateFood()
      if (pos) {
        foods.value.push(pos)
      } else {
        eatVirtualFood()
        break
      }
    }
  }

  function spawnSpikeBall() {
    if (score.value < SPIKE_SPAWN_SCORE.value) {
      return
    }

    const maxAttempts = 200
    for (let i = 0; i < maxAttempts; i++) {
      const x = Math.floor(Math.random() * (GRID_SIZE - 1))
      const y = Math.floor(Math.random() * (GRID_SIZE - 1))
      const snakeClose = snake.value.some(
        (s) => Math.abs(s.x - x) < 10 && Math.abs(s.y - y) < 10,
      )
      if (snakeClose) continue
      const onFood = foods.value.some(
        (f) => f.x >= x && f.x <= x + 1 && f.y >= y && f.y <= y + 1,
      )
      const onSpike = spikeBalls.value.some(
        (b) => Math.abs(b.x - x) < 2 && Math.abs(b.y - y) < 2,
      )
      if (!onFood && !onSpike) {
        const base = SPIKE_SPEED.value * (0.85 + Math.random() * 0.3)
        const angle = Math.random() * Math.PI * 2
        const dx = Math.cos(angle) * base
        const dy = Math.sin(angle) * base
        spikeBalls.value.push({ x, y, dx, dy })
        return
      }
    }
  }

  function updateSpikeBalls() {
    if (score.value < SPIKE_SPAWN_SCORE.value) {
      spikeBalls.value = []
      return
    }

    const extraPoints = score.value - SPIKE_SPAWN_SCORE.value
    const target = 1 + Math.floor(extraPoints / 50)

    let attempts = 0
    while (spikeBalls.value.length < target) {
      spawnSpikeBall()
      if (++attempts > 100) break
    }
  }

  function checkSnakeSpikeCollision(): boolean {
    const headPos = snake.value[0]
    if (!headPos) return false

    const hx = headPos.x + 0.5
    const hy = headPos.y + 0.5
    const radiusSnake = 0.5
    const radiusSpike = 0.8

    for (const ball of spikeBalls.value) {
      const bx = ball.x + 1.0
      const by = ball.y + 1.0
      const dx = hx - bx
      const dy = hy - by
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < radiusSnake + radiusSpike) {
        gameOver()
        return true
      }
    }
    return false
  }

  function isWithinGrid(x: number, y: number): boolean {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE
  }

  function isCellOccupiedBySnakeOrFood(x: number, y: number, ignoredFood?: Food): boolean {
    if (snake.value.some((s) => s.x === x && s.y === y)) return true
    return foods.value.some((other) => other !== ignoredFood && other.x === x && other.y === y)
  }

  function updateMagnetMode() {
    if (!isMagnetMode.value) return

    magnetTimer.value -= 1
    if (magnetTimer.value <= 0) {
      isMagnetMode.value = false
      magnetTimer.value = 0
      return
    }

    const head = snake.value[0]
    if (!head) return

    const reservedPositions = new Set<string>()

    for (const food of foods.value) {
      if (food.type === 'poison') continue

      const dx = head.x - food.x
      const dy = head.y - food.y
      const distance = Math.abs(dx) + Math.abs(dy)
      if (distance === 0 || distance > MAGNET_RANGE.value) continue

      const nextX = food.x + Math.sign(dx)
      const nextY = food.y + Math.sign(dy)
      const key = `${nextX},${nextY}`

      if (!isWithinGrid(nextX, nextY)) continue
      if (reservedPositions.has(key)) continue
      if (isCellOccupiedBySnakeOrFood(nextX, nextY, food)) continue

      food.x = nextX
      food.y = nextY
      reservedPositions.add(key)
    }

    // 磁鐵也會吸引金幣（與普通蘋果相同）
    for (const coin of coins.value) {
      const dx = head.x - coin.x
      const dy = head.y - coin.y
      const distance = Math.abs(dx) + Math.abs(dy)
      if (distance === 0 || distance > MAGNET_RANGE.value) continue

      const nextX = coin.x + Math.sign(dx)
      const nextY = coin.y + Math.sign(dy)
      const key = `${nextX},${nextY}`

      if (!isWithinGrid(nextX, nextY)) continue
      if (reservedPositions.has(key)) continue
      if (isCellOccupiedBySnakeOrFood(nextX, nextY)) continue
      if (coins.value.some((c) => c !== coin && c.x === nextX && c.y === nextY)) continue

      coin.x = nextX
      coin.y = nextY
      reservedPositions.add(key)
    }
  }

  function tickPhysics(dt: number) {
    const target = Math.max(0, Math.floor((score.value - SPIKE_SPAWN_SCORE.value) / 100))
    let attempts = 0
    while (spikeBalls.value.length < target) {
      spawnSpikeBall()
      if (++attempts > 100) break
    }

    for (const ball of spikeBalls.value) {
      ball.x += ball.dx * dt
      ball.y += ball.dy * dt

      if (ball.x < 0) {
        ball.x = 0
        ball.dx = Math.abs(ball.dx)
      } else if (ball.x > GRID_SIZE - 2) {
        ball.x = GRID_SIZE - 2
        ball.dx = -Math.abs(ball.dx)
      }

      if (ball.y < 0) {
        ball.y = 0
        ball.dy = Math.abs(ball.dy)
      } else if (ball.y > GRID_SIZE - 2) {
        ball.y = GRID_SIZE - 2
        ball.dy = -Math.abs(ball.dy)
      }
    }

    const len = spikeBalls.value.length
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const b1 = spikeBalls.value[i]!
        const b2 = spikeBalls.value[j]!
        const c1x = b1.x + 1
        const c1y = b1.y + 1
        const c2x = b2.x + 1
        const c2y = b2.y + 1

        const dx = c2x - c1x
        const dy = c2y - c1y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = 2.0

        if (dist < minDist && dist > 0.01) {
          const nx = dx / dist
          const ny = dy / dist

          const rvx = b2.dx - b1.dx
          const rvy = b2.dy - b1.dy

          const velAlongNormal = rvx * nx + rvy * ny

          if (velAlongNormal < 0) {
            const impulse = -velAlongNormal
            b1.dx -= impulse * nx
            b1.dy -= impulse * ny
            b2.dx += impulse * nx
            b2.dy += impulse * ny

            const percent = 0.5
            const slop = 0.01
            const penetration = minDist - dist
            const correctionX = Math.max(penetration - slop, 0) * percent * nx
            const correctionY = Math.max(penetration - slop, 0) * percent * ny

            b1.x -= correctionX
            b1.y -= correctionY
            b2.x += correctionX
            b2.y += correctionY
          }
        }
      }
    }
  }

  function updatePhysics(timestamp: number) {
    if (!isRunning.value || isPaused.value) {
      lastTime = 0
      return
    }
    if (!lastTime) lastTime = timestamp
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1)
    lastTime = timestamp

    tickPhysics(dt)
    checkSnakeSpikeCollision()

    physicsLoop = requestAnimationFrame(updatePhysics)
  }

  function startLoop() {
    stopLoop()
    gameLoop = setInterval(move, getEffectiveInterval())
    lastTime = 0
    physicsLoop = requestAnimationFrame(updatePhysics)
  }

  function stopLoop() {
    if (gameLoop !== null) { clearInterval(gameLoop); gameLoop = null }
    if (physicsLoop !== null) { cancelAnimationFrame(physicsLoop); physicsLoop = null }
  }

  function move() {
    updateMagnetMode()
    direction.value = nextDirection.value
    const head = snake.value[0]
    if (!head) { gameOver(); return }
    const newHead: Position = { x: head.x, y: head.y }

    switch (direction.value) {
      case 'UP': newHead.y -= 1; break
      case 'DOWN': newHead.y += 1; break
      case 'LEFT': newHead.x -= 1; break
      case 'RIGHT': newHead.x += 1; break
    }

    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      gameOver(); return
    }
    if (snake.value.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      gameOver(); return
    }

    snake.value.unshift(newHead)

    const eatenIdx = foods.value.findIndex((f) => f.x === newHead.x && f.y === newHead.y)
    if (eatenIdx !== -1) {
      // 💡 關鍵魔改 3：取得被吃掉食物的詳細類型
      const eatenFood = foods.value[eatenIdx]!
      foods.value.splice(eatenIdx, 1)

      if (eatenFood.type === 'poison') {
        // 🤢 吃到紫色毒蘋果：扣 20 分
        score.value = Math.max(0, score.value - 20)
        // 長度減少 1 （因為前面剛 unshift 塞了新頭，如果不 pop 就等於長度沒變，再多 pop 一次就等於長度減 1）
        snake.value.pop() // 還原剛長出來的頭
        if (snake.value.length > 1) {
          snake.value.pop() // 長度保底防禦：真正減少一節身體
        }
      } else if (eatenFood.type === 'gold') {
        // 🟨 吃到黃金果實：加 50 分，縮短身體，並啟動磁鐵模式
        score.value += 50

        // 先補貨：newHead 已新增到蛇身前端，這裡只要移除尾巴上的 2 節
        const shrinkCount = Math.min(2, Math.max(0, snake.value.length - 1))
        for (let i = 0; i < shrinkCount; i++) {
          snake.value.pop()
        }

        if (snake.value.length === 0) {
          snake.value.push(newHead)
        }
        isMagnetMode.value = true
        magnetTimer.value = Math.max(1, Math.round(MAGNET_DURATION.value * 1000 / getInterval()))
      } else {
        // 🍎 吃到普通紅蘋果：正常加分與升級邏輯
        const prevLevel = level.value
        foodEaten.value++

        // 在挑戰模式下，強制使用難度對應的分數（不讀取用戶自訂設定）
        const foodScore = gameMode.value === 'challenge'
          ? CHALLENGE_PARAMS[challengeDifficulty.value].SCORE_PER_FOOD
          : SCORE_PER_FOOD.value

        score.value += foodScore
        if (level.value > prevLevel) score.value += level.value
      }

      syncFoodCount()
      updateSpikeBalls()
    } else {
      snake.value.pop()
    }

    // 檢查是否吃到金幣
    const coinIdx = coins.value.findIndex((c) => c.x === newHead.x && c.y === newHead.y)
    if (coinIdx !== -1) {
      // 移除該金幣、更新計數、儲存總金幣並立即產生新金幣
      const coinPos = coins.value[coinIdx]!
      coins.value.splice(coinIdx, 1)
      currentMatchCoins.value += 1
      totalCoins.value += 10
      addCoinEffect(10, coinPos.x, coinPos.y)
      try {
        localStorage.setItem('snake_total_coins', String(totalCoins.value))
      } catch {}
      // 立刻產生下一個金幣（畫面上最多 1 顆）
      spawnCoin()
    }

    // 當前設計：加速僅影響速度，不會扣除身體節數，移除過去的 pop() 懲罰邏輯以提升體驗

    if (checkSnakeSpikeCollision()) return
  }

  function gameOver() {
    isRunning.value = false
    isGameOver.value = true
    isPaused.value = false
    isBoosting.value = false
    isMagnetMode.value = false
    magnetTimer.value = 0
    stopLoop()
    saveScore(playerName.value, score.value)
  }

  function changeDirection(newDir: Direction) {
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
    }
    if (opposites[newDir] !== direction.value) nextDirection.value = newDir
  }

  function togglePause() {
    if (!isRunning.value || isGameOver.value || isWaiting.value) return
    isPaused.value = !isPaused.value
    if (isPaused.value) stopLoop(); else startLoop()
  }

  function ensurePaused() {
    if (!isRunning.value || isGameOver.value || isWaiting.value) return
    if (!isPaused.value) {
      isPaused.value = true
    }
    stopLoop()
  }

  function setBoosting(value: boolean) {
    if (isWaiting.value || isGameOver.value) return
    if (value === isBoosting.value) return
    isBoosting.value = value
    if (!isPaused.value && isRunning.value) {
      stopLoop(); startLoop()
    }
  }

  function restartLoopIfActive() {
    if (isRunning.value && !isPaused.value && !isGameOver.value) {
      stopLoop()
      startLoop()
    }
  }

  function initBoard() {
    snake.value = [{ x: 10, y: 10 }]
    direction.value = 'RIGHT'
    nextDirection.value = 'RIGHT'
    score.value = 0
    foodEaten.value = 0
    isGameOver.value = false
    isRunning.value = false
    isWaiting.value = true
    isPaused.value = false
    isBoosting.value = false
    isMagnetMode.value = false
    magnetTimer.value = 0
    foods.value = []
    spikeBalls.value = []
    // 重置本局金幣紀錄與畫面上的金幣
    currentMatchCoins.value = 0
    coins.value = []
    challengeComplete.value = false
    rankSessionSnapshot.value = []
    applyChallengeModeOverrides()
    syncFoodCount()
  }

  function startGame() {
    rankSessionSnapshot.value = loadLeaderboard()
    isWaiting.value = false
    isRunning.value = true
    isPaused.value = false
    challengeComplete.value = false
    applyChallengeModeOverrides()
    startLoop()
    // 在遊戲開始時產生金幣
    spawnCoin()
  }

  function resetGame() { stopLoop(); initBoard() }
  function stopGame() { stopLoop() }

  function saveScore(name: string, newScore: number) {
    if (!name) return
    const entries = loadLeaderboard()
    const oldRanks = new Map<string, number>()
    entries.forEach((e, i) => oldRanks.set(e.name, i))
    const existing = entries.find((e) => e.name === name)
    if (existing) {
      if (newScore <= existing.score) return
      existing.score = newScore
    } else {
      entries.push({ name, score: newScore, rankChange: null })
    }
    entries.sort((a, b) => b.score - a.score)
    const updated: LeaderboardEntry[] = entries.map((e) => {
      const newIndex = entries.indexOf(e)
      const oldRank = oldRanks.get(e.name)
      return { name: e.name, score: e.score, rankChange: oldRank !== undefined ? oldRank - newIndex : null }
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    leaderboard.value = updated
  }

  return {
    GRID_SIZE, snake, foods, direction, score,
    isRunning, isGameOver, isWaiting, isPaused, isBoosting,
    playerName, leaderboard, liveLeaderboard, spikeBalls, level,
    initBoard, startGame, togglePause, ensurePaused, setBoosting, restartLoopIfActive, changeDirection, resetGame, stopGame,
    keysMoveUp, keysMoveDown, keysMoveLeft, keysMoveRight, keysPause, keyBoost,
    INITIAL_SPEED, FOODS_PER_LEVEL, SCORE_PER_FOOD, SPIKE_SPAWN_SCORE, SPIKE_SPEED,
    SPEEDUP_FACTOR, BOOST_FACTOR, BOOST_MULTIPLIER, LEVEL_UP_SCORE,
    colorPageBg, colorGridBg, colorPanelBg, resetSettings, saveAllSettings, loadSettingsV2,
    isMagnetMode, magnetTimer, MAGNET_DURATION, MAGNET_RANGE,
    gameMode, challengeDifficulty, challengeComplete, challengeReward, CHALLENGE_PARAMS,
    setGameMode, setChallengeDifficulty,
    // Coin system
    coins, currentMatchCoins, totalCoins, spawnCoin, coinEffects, addCoinEffect,
    // Skin system
    skins, currentSkinId, firstBuyDiscountUsed, buySkin, equipSkin, drawGacha,
    // Theme system
    currentTheme, setTheme,
  }
})
