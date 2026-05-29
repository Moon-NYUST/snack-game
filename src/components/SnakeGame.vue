<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useGameStore, SETTINGS_V2_KEY } from '../stores/game'
import LeaderBoard from './LeaderBoard.vue'

const props = defineProps({
  showGameContent: { type: Boolean, default: false },
})
const emit = defineEmits(['gameOver', 'openSettings', 'backToMenu'])

const game = useGameStore()
const nameInput = ref('')
const CELL_PX = 24
const lbMode = ref<'overall' | 'personal'>('overall')
const showShop = ref(false)
const shopTab = ref<'basic' | 'premium' | 'rare' | 'gacha'>('basic')
const gachaResults = ref<Array<{ type: 'win' | 'loss'; skinId?: string; skinName?: string; coinsEarned?: number }>>([])
const shopNotice = ref('')
const previewSkin = ref<any>(null)
const previewSegments = computed(() => (previewSkin.value ? ['head', 'body', 'body', 'body', 'body'] : []))

const themeClass = computed(() => game.currentTheme)
const themeClasses = ['theme-neon', 'theme-arcade', 'theme-tech', 'theme-rainforest']

watch(themeClass, (newTheme, oldTheme) => {
  const appRoot = document.getElementById('app')
  if (appRoot) {
    appRoot.classList.remove(...themeClasses)
    appRoot.classList.add(newTheme)
  }
})

const skinPreviewStyles: Record<string, Record<string, string>> = {
  basic_red: { background: 'linear-gradient(135deg, #e74c3c, #c0392b)' },
  basic_orange: { background: 'linear-gradient(135deg, #e67e22, #d35400)' },
  basic_yellow: { background: 'linear-gradient(135deg, #f1c40f, #f39c12)' },
  basic_green: { background: 'linear-gradient(135deg, #2ecc71, #27ae60)' },
  basic_blue: { background: 'linear-gradient(135deg, #3498db, #2c3e50)' },
  basic_purple: { background: 'linear-gradient(135deg, #9b59b6, #8e44ad)' },
  basic_black: { background: 'linear-gradient(135deg, #2c3e50, #1b2631)' },
  basic_white: { background: 'linear-gradient(135deg, #ecf0f1, #bdc3c7)', color: '#2c3e50' },
  premium_rainbow: { background: 'linear-gradient(135deg, #ff0058, #ffbb00, #27aae1, #8e44ad)' },
  premium_gold: { background: 'linear-gradient(135deg, #f1c40f, #f39c12, #d35400)' },
  premium_zebra: { background: 'repeating-linear-gradient(45deg, #ffffff, #ffffff 8px, #2c3e50 8px, #2c3e50 16px)' },
  premium_flame: { background: 'linear-gradient(135deg, #e74c3c, #e67e22, #f39c12)' },
  rare_cyberpunk: { background: 'linear-gradient(135deg, #ff007f, #00f0ff, #7000ff)' },
  rare_ghost: { background: 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(52,152,219,0.3))', color: '#1b2631' },
  rare_rgb: { background: 'linear-gradient(135deg, #ff0000, #00ff00, #0000ff, #ffff00, #00ffff, #ff00ff)' },
  rare_lava: { background: 'linear-gradient(135deg, #111111, #d35400, #c0392b)' },
}

const basicSkins = computed(() => Object.values(game.skins).filter((skin) => skin.category === 'basic'))
const premiumSkins = computed(() => Object.values(game.skins).filter((skin) => skin.category === 'premium'))
const rareSkins = computed(() => Object.values(game.skins).filter((skin) => skin.category === 'rare'))
const isBasicFirstBuyAvailable = computed(() => !game.firstBuyDiscountUsed['basic'])
const isPremiumFirstBuyAvailable = computed(() => !game.firstBuyDiscountUsed['premium'])

function getEffectiveSkinPrice(skin: any) {
  if (skin.unlocked) return 0
  if (skin.category === 'basic' && isBasicFirstBuyAvailable.value) return Math.round(skin.price * 0.1)
  if (skin.category === 'premium' && isPremiumFirstBuyAvailable.value) return Math.round(skin.price * 0.1)
  if (skin.category === 'rare') return skin.price // 稀有皮膚無法購買，只能抽獎獲得
  return skin.price
}

function openShop() {
  showShop.value = true
  shopTab.value = 'basic'
  shopNotice.value = ''
  gachaResults.value = []
  previewSkin.value = null
}

function closeShop() {
  showShop.value = false
  previewSkin.value = null
}

function setPreviewSkin(skin: any) {
  previewSkin.value = skin
}

function clearPreviewSkin() {
  previewSkin.value = null
}

function startGameFromLobby() {
  loadPlayerSettingsFromStorage()
  const name = nameInput.value.trim() || '匿名'
  game.playerName = name
  game.startGame()
}

function buySkin(skinId: string) {
  if (game.buySkin(skinId)) {
    const skin = game.skins[skinId]
    shopNotice.value = `已購買 ${skin?.name ?? '皮膚'}！`
  } else {
    shopNotice.value = '金幣不足或已解鎖'
  }
}

function equipShopSkin(skinId: string) {
  if (game.equipSkin(skinId)) {
    const skin = game.skins[skinId]
    shopNotice.value = `已裝備 ${skin?.name ?? '皮膚'}`
  } else {
    shopNotice.value = '請先解鎖該皮膚'
  }
}

function performGacha(draws: number) {
  const results = game.drawGacha(draws)
  if (results.length === 0) {
    shopNotice.value = '金幣不足，無法抽獎'
    return
  }
  gachaResults.value = results
  const wins = results.filter((r) => r.type === 'win')
  const refunded = results.reduce((sum, r) => sum + (r.coinsEarned ?? 0), 0)
  if (wins.length) {
    shopNotice.value = `恭喜獲得：${wins.map((r) => r.skinName).filter(Boolean).join('、')}`
  } else if (refunded > 0) {
    shopNotice.value = `重複返還 ${refunded} 金幣`
  } else {
    shopNotice.value = '謝謝惠顧，下次再試試吧！'
  }
}

const SETTINGS_KEY = SETTINGS_V2_KEY
const DEFAULT_SPEED_MS = 150
const DEFAULT_FOOD_SCORE = 10
const DEFAULT_BOOST_KEY = 'ShiftLeft'
const DEFAULT_BOOST_MULTIPLIER = 2.0
const DEFAULT_SPIKE_SPEED = 5
const DEFAULT_SPIKE_THRESHOLD = 100
const DEFAULT_LEVEL_UP_SCORE = 200

const ARROW_BY_DIR = {
  Up: 'ArrowUp',
  Down: 'ArrowDown',
  Left: 'ArrowLeft',
  Right: 'ArrowRight',
} as const

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type DirKey = keyof typeof ARROW_BY_DIR

const playerKeys = ref({
  Up: 'W',
  Down: 'S',
  Left: 'A',
  Right: 'D',
  Pause: ['Space', 'Escape'] as string[],
})

const gameSpeedMs = ref(DEFAULT_SPEED_MS)
const foodScorePerEat = ref(DEFAULT_FOOD_SCORE)
const playerBoostKey = ref(DEFAULT_BOOST_KEY)
const boostMultiplier = ref(DEFAULT_BOOST_MULTIPLIER)
const spikeSpeed = ref(DEFAULT_SPIKE_SPEED)
const spikeThreshold = ref(DEFAULT_SPIKE_THRESHOLD)
const levelUpScore = ref(DEFAULT_LEVEL_UP_SCORE)

const displayBoostLabel = computed(() => {
  const k = playerBoostKey.value
  if (k === ' ' || k === 'Space') return 'Space'
  if (k === 'ShiftLeft' || k === 'ShiftRight' || k === 'Shift') return 'Shift'
  return k.length === 1 ? k.toUpperCase() : k
})

const leaderboardEntries = computed(() => {
  if (lbMode.value === 'overall') {
    return game.leaderboard.slice(0, 5).map((e) => ({ ...e, rankChange: null }))
  }
  return game.liveLeaderboard
})

const challengeParams = computed(() => game.CHALLENGE_PARAMS[game.challengeDifficulty])

const transitionDuration = computed(() => {
  if (!game.isRunning || game.isPaused || game.isWaiting) return 0

  // 1. 基礎移動速度（隨等級提升自動加速）
  const base = game.INITIAL_SPEED / (1 + (game.SPEEDUP_FACTOR / 100) * (game.level - 1))

  // 2. 對接自訂按鍵加速倍率
  const mult = boostMultiplier.value > 1 ? boostMultiplier.value : 2.0

  // 3. 回傳最終計算結果
  return Math.round(game.isBoosting ? base / mult : base)
})

function getCellClass(x: number, y: number): string {
  const head = game.snake[0]
  const currentSkinId = game.currentSkinId
  const currentSkin = currentSkinId ? game.skins?.[currentSkinId] : undefined
  const activatedSkinClass = currentSkin ? `skin-${currentSkin.id.replace(/_/g, '-')}` : ''

  if (game.snake.length > 0 && head?.x === x && head.y === y) {
    return ['cell-snake-head', activatedSkinClass].filter(Boolean).join(' ')
  }

  // 找到蛇身體的格子
  const bodyIdx = game.snake.findIndex((seg, idx) => idx > 0 && seg.x === x && seg.y === y)
  if (bodyIdx > 0) {
    if (!currentSkinId || currentSkinId === 'default' || currentSkinId === 'basic_orange' || currentSkinId === 'orange') {
      return 'cell-snake-body'
    }
    if (currentSkin) {
      return ['cell-snake-body', activatedSkinClass].join(' ')
    }
    return 'cell-snake-body'
  }

  const food = game.foods.find((f) => f.x === x && f.y === y)
  if (!food) return ''
  if (food.type === 'gold') return 'cell-gold'
  if (food.type === 'poison') return 'cell-poison'
  return 'cell-food'
}

function isSnakeCell(x: number, y: number): boolean {
  return game.snake.some((seg) => seg.x === x && seg.y === y)
}

function exitToMenu() {
  game.stopGame()
  game.initBoard()
  emit('backToMenu')
}

/** 從暫停選單開設定：維持暫停狀態再通知父層 */
function openSettingsFromPause() {
  game.ensurePaused()
  emit('openSettings')
}

defineExpose({
  reloadSettings: loadPlayerSettingsFromStorage,
})

function variantsForBoundKey(bound: string): string[] {
  if (!bound) return []
  const normalized = bound === 'Space' ? ' ' : bound
  const out = new Set<string>([normalized, bound])
  if (normalized.length === 1) {
    out.add(normalized.toLowerCase())
    out.add(normalized.toUpperCase())
    out.add(`Key${normalized.toUpperCase()}`)
  }
  if (bound === 'Shift' || bound.startsWith('Shift')) {
    out.add('Shift')
    out.add('ShiftLeft')
    out.add('ShiftRight')
  }
  return [...out]
}

function eventMatchesBound(e: KeyboardEvent, bound: string): boolean {
  return variantsForBoundKey(bound).some((v) => e.key === v || e.code === v)
}

function loadPlayerSettingsFromStorage() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
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
        }
      }

      const kb = parsed.keybindings
      if (kb) {
        playerKeys.value = {
          Up: (kb.Up ?? '').trim() || 'W',
          Down: (kb.Down ?? '').trim() || 'S',
          Left: (kb.Left ?? '').trim() || 'A',
          Right: (kb.Right ?? '').trim() || 'D',
          Pause: [
            (kb.Pause?.[0] ?? '').trim() || 'Space',
            (kb.Pause?.[1] ?? '').trim() || 'Escape',
          ],
        }
        playerBoostKey.value = (kb.Boost ?? '').trim() || DEFAULT_BOOST_KEY
      }

      const rules = parsed.ruleInputs
      if (rules?.initialSpeed != null && rules.initialSpeed > 0) {
        gameSpeedMs.value = Math.max(50, Math.round(1000 / rules.initialSpeed))
      } else {
        gameSpeedMs.value = DEFAULT_SPEED_MS
      }
      if (rules?.foodScore != null && rules.foodScore > 0) {
        foodScorePerEat.value = rules.foodScore
      } else {
        foodScorePerEat.value = DEFAULT_FOOD_SCORE
      }
      if (rules?.boostMultiplier != null && rules.boostMultiplier > 1) {
        boostMultiplier.value = rules.boostMultiplier
      } else if (rules?.speedBoost != null && rules.speedBoost > 0) {
        boostMultiplier.value = 1 + rules.speedBoost
      } else {
        boostMultiplier.value = DEFAULT_BOOST_MULTIPLIER
      }
      if (rules?.spikeSpeed != null && rules.spikeSpeed > 0) {
        spikeSpeed.value = rules.spikeSpeed
      } else {
        spikeSpeed.value = DEFAULT_SPIKE_SPEED
      }
      if (rules?.spikeThreshold != null && rules.spikeThreshold >= 0) {
        spikeThreshold.value = rules.spikeThreshold
      } else {
        spikeThreshold.value = DEFAULT_SPIKE_THRESHOLD
      }
      if (rules?.levelUpScore != null && rules.levelUpScore > 0) {
        levelUpScore.value = rules.levelUpScore
      } else {
        levelUpScore.value = DEFAULT_LEVEL_UP_SCORE
      }
    } else {
      gameSpeedMs.value = DEFAULT_SPEED_MS
      foodScorePerEat.value = DEFAULT_FOOD_SCORE
      playerBoostKey.value = DEFAULT_BOOST_KEY
      boostMultiplier.value = DEFAULT_BOOST_MULTIPLIER
      spikeSpeed.value = DEFAULT_SPIKE_SPEED
      spikeThreshold.value = DEFAULT_SPIKE_THRESHOLD
      levelUpScore.value = DEFAULT_LEVEL_UP_SCORE
    }
  } catch {
    gameSpeedMs.value = DEFAULT_SPEED_MS
    foodScorePerEat.value = DEFAULT_FOOD_SCORE
    playerBoostKey.value = DEFAULT_BOOST_KEY
    boostMultiplier.value = DEFAULT_BOOST_MULTIPLIER
    spikeSpeed.value = DEFAULT_SPIKE_SPEED
    spikeThreshold.value = DEFAULT_SPIKE_THRESHOLD
    levelUpScore.value = DEFAULT_LEVEL_UP_SCORE
  }

  syncPlayerSettingsToStore()
}

function syncPlayerSettingsToStore() {
  const dirs: DirKey[] = ['Up', 'Down', 'Left', 'Right']
  const setKeys = [game.keysMoveUp, game.keysMoveDown, game.keysMoveLeft, game.keysMoveRight]

  dirs.forEach((dir, i) => {
    const custom = playerKeys.value[dir]
    const arrow = ARROW_BY_DIR[dir]
    const keys = [...new Set([
      ...variantsForBoundKey(custom),
      ...variantsForBoundKey(arrow),
    ])].filter((k) => k && !k.startsWith('Key'))
    setKeys[i]!.length = 0
    setKeys[i]!.push(...keys)
  })

  const pauseKeys = playerKeys.value.Pause.map((k) => (k === 'Space' ? ' ' : k))
  game.keysPause.length = 0
  game.keysPause.push(...pauseKeys)

  const boost = playerBoostKey.value
  game.keyBoost = boost.length === 1 ? boost.toLowerCase() : boost
  game.INITIAL_SPEED = gameSpeedMs.value
  game.SCORE_PER_FOOD = foodScorePerEat.value
  game.BOOST_MULTIPLIER = boostMultiplier.value
  game.BOOST_FACTOR = Math.round((boostMultiplier.value - 1) * 100)
  game.SPIKE_SPEED = spikeSpeed.value
  game.SPIKE_SPAWN_SCORE = spikeThreshold.value
  game.LEVEL_UP_SCORE = levelUpScore.value

  game.restartLoopIfActive()
}

function isBoostKeyEvent(e: KeyboardEvent): boolean {
  return eventMatchesBound(e, playerBoostKey.value)
}

function isPauseKeyEvent(e: KeyboardEvent): boolean {
  return playerKeys.value.Pause.some((bound) => eventMatchesBound(e, bound))
}

function getDirectionFromEvent(e: KeyboardEvent): Direction | null {
  const pairs: { key: DirKey; dir: Direction }[] = [
    { key: 'Up', dir: 'UP' },
    { key: 'Down', dir: 'DOWN' },
    { key: 'Left', dir: 'LEFT' },
    { key: 'Right', dir: 'RIGHT' },
  ]
  for (const { key, dir } of pairs) {
    if (eventMatchesBound(e, playerKeys.value[key]) || eventMatchesBound(e, ARROW_BY_DIR[key])) {
      return dir
    }
  }
  return null
}

function handleKeydown(e: KeyboardEvent) {
  const isEsc = e.key === 'Escape'

  if (isEsc && (game.isWaiting || game.isPaused)) {
    e.preventDefault()
    exitToMenu()
    return
  }

  if ((isEsc || isPauseKeyEvent(e)) && game.isRunning && !game.isWaiting && !game.isGameOver) {
    e.preventDefault()
    game.togglePause()
    return
  }

  if (isBoostKeyEvent(e)) {
    e.preventDefault()
    if (game.isRunning && !game.isWaiting && !game.isGameOver && !game.isPaused) {
      game.setBoosting(true)
    }
    return
  }

  const dir = getDirectionFromEvent(e)
  if (!dir) return
  e.preventDefault()

  if (game.isGameOver || game.isPaused) return

  if (game.isWaiting) {
    loadPlayerSettingsFromStorage()
    const name = nameInput.value.trim() || '匿名'
    game.playerName = name
    game.startGame()
    game.changeDirection(dir)
    return
  }

  game.changeDirection(dir)
}

function handleKeyup(e: KeyboardEvent) {
  if (isBoostKeyEvent(e)) {
    game.setBoosting(false)
  }
}

onMounted(() => {
  loadPlayerSettingsFromStorage()
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keyup', handleKeyup)
  game.initBoard()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('keyup', handleKeyup)
  game.stopGame()
})
</script>

<template>
  <div class="game-root" :class="[themeClass]">

    <div class="persistent-ui">
      <div class="persistent-coin">🪙 {{ game.totalCoins }}</div>
      <button type="button" class="persistent-shop-btn" @click="openShop">進入商城 🛒</button>
    </div>

    <div class="game-shell" v-show="props.showGameContent || showShop">
      <div class="game-container">

        <div v-if="showShop" class="shop-modal-backdrop" @click.self="closeShop">
          <div class="shop-modal">
            <div class="shop-header">
              <div>
                <div class="shop-title">遊戲商城</div>
                <p class="shop-subtitle">大廳專屬皮膚購買與抽獎系統</p>
              </div>
              <button class="shop-close-btn" type="button" @click="closeShop">×</button>
            </div>

            <div class="shop-tabs">
              <button
                type="button"
                :class="{ active: shopTab === 'basic' }"
                @click="shopTab = 'basic'"
              >初級商城</button>
              <button
                type="button"
                :class="{ active: shopTab === 'premium' }"
                @click="shopTab = 'premium'"
              >高級商城</button>
              <button
                type="button"
                :class="{ active: shopTab === 'rare' }"
                @click="shopTab = 'rare'"
              >🌟 稀有皮膚</button>
              <button
                type="button"
                :class="{ active: shopTab === 'gacha' }"
                @click="shopTab = 'gacha'"
              >幸運抽獎</button>
            </div>

            <div v-if="shopNotice" class="shop-notice">{{ shopNotice }}</div>

            <div class="shop-preview-panel">
              <div class="preview-frame">
                <div class="preview-label">
                  {{ previewSkin?.name ? `預覽：${previewSkin.name}` : '請懸停或點擊皮膚卡片以查看 5 節預覽' }}
                </div>
                <div class="preview-display">
                  <template v-if="previewSkin">
                    <div
                      v-for="(segmentType, idx) in previewSegments"
                      :key="idx"
                      class="preview-cell preview-segment"
                      :class="[
                        `skin-${previewSkin.id.replace(/_/g, '-')}`,
                        `preview-${segmentType}`,
                      ]"
                      :style="skinPreviewStyles[previewSkin.id]"
                    ></div>
                  </template>
                  <template v-else>
                    <div
                      v-for="idx in 5"
                      :key="idx"
                      class="preview-cell preview-placeholder"
                    ></div>
                  </template>
                </div>
              </div>
            </div>

            <div class="shop-body">
              <div v-if="shopTab === 'basic'">
                <div class="shop-banner">初級皮膚一律 500 金幣。首次購買本分類享 1 折優惠。</div>
                <div class="shop-grid">
                  <article
                    v-for="skin in basicSkins"
                    :key="skin.id"
                    class="shop-card"
                    @mouseenter="setPreviewSkin(skin)"
                    @mouseleave="clearPreviewSkin"
                    @click="setPreviewSkin(skin)"
                  >
                    <div class="skin-preview" :style="skinPreviewStyles[skin.id]">
                      <span>{{ skin.name }}</span>
                    </div>
                    <div class="skin-info">
                      <div class="skin-price">
                        <span v-if="skin.unlocked" class="owned-label">已擁有</span>
                        <span v-else>
                          <strong>{{ getEffectiveSkinPrice(skin) }}</strong> 金幣
                          <span v-if="getEffectiveSkinPrice(skin) < skin.price" class="price-original">{{ skin.price }}</span>
                        </span>
                      </div>
                      <button
                        v-if="skin.unlocked"
                        type="button"
                        class="shop-action-btn secondary"
                        @click="equipShopSkin(skin.id)"
                      >
                        {{ game.currentSkinId === skin.id ? '已裝備' : '裝備' }}
                      </button>
                      <button
                        v-else
                        type="button"
                        class="shop-action-btn"
                        :disabled="game.totalCoins < getEffectiveSkinPrice(skin)"
                        @click="buySkin(skin.id)"
                      >購買</button>
                    </div>
                  </article>
                </div>
              </div>

              <div v-if="shopTab === 'premium'">
                <div class="shop-banner">高級皮膚帶有專屬質感。首次購買本分類可享 1 折優惠。</div>
                <div class="shop-grid">
                  <article
                    v-for="skin in premiumSkins"
                    :key="skin.id"
                    class="shop-card"
                    @mouseenter="setPreviewSkin(skin)"
                    @mouseleave="clearPreviewSkin"
                    @click="setPreviewSkin(skin)"
                  >
                    <div class="skin-preview" :style="skinPreviewStyles[skin.id]">
                      <span>{{ skin.name }}</span>
                    </div>
                    <div class="skin-info">
                      <div class="skin-price">
                        <span v-if="skin.unlocked" class="owned-label">已擁有</span>
                        <span v-else>
                          <strong>{{ getEffectiveSkinPrice(skin) }}</strong> 金幣
                          <span v-if="getEffectiveSkinPrice(skin) < skin.price" class="price-original">{{ skin.price }}</span>
                        </span>
                      </div>
                      <button
                        v-if="skin.unlocked"
                        type="button"
                        class="shop-action-btn secondary"
                        @click="equipShopSkin(skin.id)"
                      >
                        {{ game.currentSkinId === skin.id ? '已裝備' : '裝備' }}
                      </button>
                      <button
                        v-else
                        type="button"
                        class="shop-action-btn"
                        :disabled="game.totalCoins < getEffectiveSkinPrice(skin)"
                        @click="buySkin(skin.id)"
                      >購買</button>
                    </div>
                  </article>
                </div>
              </div>

              <div v-if="shopTab === 'rare'">
                <div class="shop-banner">✨ 稀有皮膚專屬收藏，只能透過幸運抽獎獲得。點擊下方卡片預覽效果。</div>
                <div class="shop-grid">
                  <article
                    v-for="skin in rareSkins"
                    :key="skin.id"
                    class="shop-card"
                    @mouseenter="setPreviewSkin(skin)"
                    @mouseleave="clearPreviewSkin"
                    @click="setPreviewSkin(skin)"
                  >
                    <div class="skin-preview" :style="skinPreviewStyles[skin.id]">
                      <span>{{ skin.name }}</span>
                    </div>
                    <div class="skin-info">
                      <div class="skin-price">
                        <span v-if="skin.unlocked" class="owned-label">✨ 已擁有</span>
                        <span v-else class="locked-label">🔒 未獲得</span>
                      </div>
                      <button
                        v-if="skin.unlocked"
                        type="button"
                        class="shop-action-btn secondary"
                        @click="equipShopSkin(skin.id)"
                      >
                        {{ game.currentSkinId === skin.id ? '已裝備' : '裝備' }}
                      </button>
                      <button
                        v-else
                        type="button"
                        class="shop-action-btn"
                        disabled
                      >抽獎獲得</button>
                    </div>
                  </article>
                </div>
              </div>

              <div v-if="shopTab === 'gacha'">
                <div class="shop-banner">幸運抽獎：80% 謝謝惠顧 / 10% 初級 / 5% 高級 1500 / 3% 高級 2000 / 2% 稀有。</div>
                <div class="gacha-panel">
                  <div class="gacha-actions">
                    <button type="button" class="shop-action-btn large" @click="performGacha(1)">單抽 300</button>
                    <button type="button" class="shop-action-btn large secondary" @click="performGacha(10)">十連 2700</button>
                  </div>
                  <div class="gacha-odds">抽獎機率 80% / 10% / 5% / 3% / 2%</div>
                  <div class="gacha-results">
                    <div
                      v-for="(result, idx) in gachaResults"
                      :key="idx"
                      class="gacha-result"
                      :class="result.type"
                    >
                      <div class="gacha-result-content">
                        <template v-if="result.type === 'win'">
                          🎉 獲得 {{ result.skinName }}！
                        </template>
                        <template v-else-if="result.coinsEarned">
                          💰 重複返還 {{ result.coinsEarned }} 金幣
                        </template>
                        <template v-else>
                          🙈 謝謝惠顧
                        </template>
                      </div>
                      <button
                        v-if="result.type === 'win' && result.skinId"
                        type="button"
                        class="gacha-equip-btn"
                        @click="equipShopSkin(result.skinId)"
                      >
                        立刻裝備
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="game-area">
          <div class="left-panel">
            <div class="lb-toggle">
              <button
                class="lb-toggle-btn"
                :class="{ active: lbMode === 'overall' }"
                @click="lbMode = 'overall'"
              >總排行</button>
              <button
                class="lb-toggle-btn"
                :class="{ active: lbMode === 'personal' }"
                @click="lbMode = 'personal'"
              >個人排行</button>
            </div>
            <LeaderBoard :entries="leaderboardEntries" :style="{ backgroundColor: game.colorPanelBg }" />
            <div class="game-info" :style="{ backgroundColor: game.colorPanelBg }">
              <div class="info-label">Level</div>
              <div class="info-value info-level">{{ game.level }}</div>
              <div class="info-label">Score</div>
              <div class="info-value info-score">{{ game.score }}</div>
            </div>
            <div class="legend-panel">
              <div class="legend-title">{{ game.gameMode === 'challenge' ? '挑戰模式說明' : '玩法說明' }}</div>
              <template v-if="game.gameMode === 'classic'">
                <ul class="legend-list">
                  <li><span class="legend-dot legend-normal"></span>🟢 普通蘋果：獲得 10 分，身體變長。</li>
                  <li><span class="legend-dot legend-poison"></span>🟣 毒蘋果：扣除 20 分，且身體縮短 1 節。</li>
                  <li><span class="legend-dot legend-gold"></span>🟡 黃金果實：獲得 50 分，身體縮短 2 節，並觸發 8 秒「狂暴磁鐵模式」！</li>
                  <li><span class="legend-dot legend-magnet"></span>🧲 磁鐵模式：蛇身散發藍光，自動吸引 3 格內的普通蘋果與黃金果實（不吸毒蘋果）。</li>
                </ul>
              </template>
              <template v-else>
                <ul class="legend-list">
                  <li>挑戰等級：第 {{ game.challengeDifficulty }} 關</li>
                  <li>起始速度：{{ challengeParams.INITIAL_SPEED }} ms</li>
                  <li>普通果實分數：{{ challengeParams.SCORE_PER_FOOD }} 分</li>
                  <li>等級加速因子：每級加速 {{ challengeParams.SPEEDUP_FACTOR }}%</li>
                  <li>升級所需分數：{{ challengeParams.LEVEL_UP_SCORE }} 分</li>
                  <li>尖刺生成門檻：{{ challengeParams.SPIKE_SPAWN_SCORE }} 分</li>
                  <li>尖刺移動速度：{{ challengeParams.SPIKE_SPEED }}</li>
                  <li>衝刺倍率：x{{ challengeParams.BOOST_MULTIPLIER }}</li>
                  <li>磁鐵持續時間：{{ challengeParams.MAGNET_DURATION }} 秒</li>
                  <li>磁鐵吸引範圍：{{ challengeParams.MAGNET_RANGE }} 格</li>
                </ul>
              </template>
            </div>
          </div>

          <div class="game-center">
            <div v-if="game.isWaiting" class="name-section">
              <input
                v-model="nameInput"
                class="name-input"
                type="text"
                maxlength="10"
                placeholder="請輸入你的名字"
              />
            </div>
            <div v-if="game.isRunning && !game.isWaiting" class="coin-counter coin-counter-ingame">
              🪙 本局: {{ game.currentMatchCoins }} | 總計: {{ game.totalCoins }}
            </div>
            <h1 class="title">Snack Game</h1>
            <div class="grid-section">
              <button
                v-if="!game.isWaiting && !game.isGameOver"
                class="pause-btn"
                @click="game.togglePause()"
              >⏸</button>
              <div
                class="grid-wrapper"
                :style="{
                  '--snake-transition': transitionDuration + 'ms',
                  backgroundColor: game.colorGridBg
                }"
              >
                <div v-for="(_, y) in game.GRID_SIZE" :key="y" class="grid-row">
                  <div
                    v-for="(_, x) in game.GRID_SIZE"
                    :key="x"
                    class="cell"
                    :class="[
                      getCellClass(x, y),
                      game.coins.some((c) => c.x === x && c.y === y) ? 'cell-coin' : '',
                      game.isMagnetMode && isSnakeCell(x, y) ? 'snake-magnet' : ''
                    ]"
                  ></div>
                </div>

                <div v-for="(ball, idx) in game.spikeBalls" :key="idx" class="spike-ball" :style="{ transform: `translate(${ball.x * CELL_PX}px, ${ball.y * CELL_PX}px)`, width: (CELL_PX*2) + 'px', height: (CELL_PX*2) + 'px' }">
                  <svg viewBox="0 0 100 100" class="spike-svg" aria-hidden="true">
                    <polygon points="50,5 43,38 57,38" fill="#e74c3c" stroke="#c0392b" stroke-width="3" stroke-linejoin="round" />
                    <polygon points="50,95 43,62 57,62" fill="#e74c3c" stroke="#c0392b" stroke-width="3" stroke-linejoin="round" />
                    <polygon points="5,50 38,43 38,57" fill="#e74c3c" stroke="#c0392b" stroke-width="3" stroke-linejoin="round" />
                    <polygon points="95,50 62,43 62,57" fill="#e74c3c" stroke="#c0392b" stroke-width="3" stroke-linejoin="round" />
                    <polygon points="18,18 39,32 32,39" fill="#e74c3c" stroke="#c0392b" stroke-width="3" stroke-linejoin="round" />
                    <polygon points="82,18 68,39 61,32" fill="#e74c3c" stroke="#c0392b" stroke-width="3" stroke-linejoin="round" />
                    <polygon points="18,82 32,61 39,68" fill="#e74c3c" stroke="#c0392b" stroke-width="3" stroke-linejoin="round" />
                    <polygon points="82,82 61,68 68,61" fill="#e74c3c" stroke="#c0392b" stroke-width="3" stroke-linejoin="round" />
                    <circle cx="50" cy="50" r="23" fill="#34495e" stroke="#2c3e50" stroke-width="4" />
                    <circle cx="50" cy="50" r="13" fill="#e74c3c" class="spike-pulse-core" />
                    <circle cx="44" cy="44" r="5" fill="#ffffff" opacity="0.4" />
                  </svg>
                </div>

                <div v-for="effect in game.coinEffects" :key="effect.id" class="coin-popup" :style="{ left: effect.x * CELL_PX + 'px', top: effect.y * CELL_PX + 'px' }">
                  +🪙 {{ effect.amount }}
                </div>

                <div v-if="game.isWaiting && !showShop" class="overlay">
                  <div class="overlay-content">
                    <p class="waiting-text">按設定之移動鍵開始</p>
                  </div>
                </div>
                <div v-if="game.isPaused" class="overlay">
                  <div class="overlay-content">
                    <p class="pause-title">暫停</p>
                    <button class="pause-action-btn" @click="game.togglePause()">繼續遊戲</button>
                    <button
                      class="pause-action-btn secondary"
                      :disabled="game.gameMode === 'challenge'"
                      @click="game.gameMode !== 'challenge' && openSettingsFromPause()"
                    >
                      設定
                      <span v-if="game.gameMode === 'challenge'">🔒</span>
                    </button>
                    <button class="pause-action-btn secondary" @click="exitToMenu">返回主選單</button>
                    <p v-if="game.gameMode === 'challenge'" class="pause-lock-text">挑戰模式中無法更改設定</p>
                  </div>
                </div>
                <div v-if="game.challengeComplete" class="overlay">
                  <div class="overlay-content">
                    <p class="game-over-text">挑戰成功通關</p>
                    <p class="final-score">獲得獎勵：{{ game.challengeReward }} 金幣</p>
                    <button class="restart-btn" @click="game.resetGame(); loadPlayerSettingsFromStorage()">Restart</button>
                    <button class="back-btn" @click="exitToMenu">返回選單</button>
                  </div>
                </div>
                <div v-else-if="game.isGameOver" class="overlay">
                  <div class="overlay-content">
                    <p class="game-over-text">GAME OVER</p>
                    <p class="final-score">Score: {{ game.score }}</p>
                    <button class="restart-btn" @click="game.resetGame(); loadPlayerSettingsFromStorage()">Restart</button>
                    <button class="back-btn" @click="exitToMenu">返回選單</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="rules">
              <span class="rule-item">按鍵移動: 上[{{ playerKeys.Up }}] 下[{{ playerKeys.Down }}] 左[{{ playerKeys.Left }}] 右[{{ playerKeys.Right }}]</span>
              <span class="rule-item">[{{ playerKeys.Pause.join(',') }}] 暫停</span>
              <span class="rule-item">[{{ displayBoostLabel }}] 加速</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>

.game-root,
.game-root * {
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out;
}

.game-root * {
  color: var(--text-color) !important;
}

.game-root {
  position: relative;
}

.theme-rainforest .title,
.theme-forest .title,
.theme-rainforest .info-label,
.theme-forest .info-label,
.theme-rainforest .info-value,
.theme-forest .info-value,
.theme-rainforest .rule-item,
.theme-forest .rule-item,
.theme-rainforest .legend-title,
.theme-forest .legend-title,
.theme-rainforest .legend-list li,
.theme-forest .legend-list li {
  color: #ffffff !important;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8) !important;
}

.theme-rainforest .info-label,
.theme-forest .info-label {
  color: #a7f3d0 !important;
}

.theme-rainforest .game-info,
.theme-forest .game-info,
.theme-rainforest .lb-toggle-btn.active,
.theme-forest .lb-toggle-btn.active,
.theme-rainforest .shop-tabs button.active,
.theme-forest .shop-tabs button.active {
  color: #ffffff !important;
}

.persistent-ui {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(10, 10, 10, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.25);
}

.persistent-coin {
  font-weight: 700;
  letter-spacing: 0.03em;
}

.persistent-shop-btn {
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  padding: 10px 14px;
  font-weight: 700;
  color: var(--text-color) !important;
}

.persistent-shop-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}

.game-shell {
  min-height: 100vh;
}

.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  position: relative;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text-color);
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color) !important;
  margin: 0 0 8px;
  letter-spacing: 2px;
  text-align: center;
  width: 100%;
}

.name-section {
  margin-bottom: 12px;
}

.name-input {
  width: 240px;
  padding: 8px 14px;
  font-size: 16px;
  border: 2px solid var(--accent);
  border-radius: 6px;
  background: transparent;
  color: var(--text-color) !important;
  outline: none;
  text-align: center;
  box-sizing: border-box;
}

.name-input::placeholder {
  color: #95a5a6;
}

.name-input:focus {
  border-color: #27ae60;
}

.legend-panel {
  margin-top: 14px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: var(--panel);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
  max-width: 380px;
}

.legend-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-color) !important;
  margin-bottom: 10px;
}

.legend-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.legend-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.45;
  font-size: 13px;
  color: var(--text-muted) !important;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 3px;
}

.legend-normal {
  background: #e74c3c;
  box-shadow: inset 0 0 0 4px rgba(231, 76, 60, 0.15);
}

.legend-poison {
  background: #9b59b6;
  box-shadow: inset 0 0 0 4px rgba(155, 89, 182, 0.15);
}

.legend-gold {
  background: #f1c40f;
  box-shadow: inset 0 0 0 4px rgba(241, 196, 15, 0.2);
}

.legend-magnet {
  background: #3498db;
  box-shadow: inset 0 0 0 4px rgba(52, 152, 219, 0.22);
}

.game-area {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 220px;
}

.lb-toggle {
  display: flex;
  gap: 0;
  margin-bottom: 4px;
}

.lb-toggle-btn {
  flex: 1;
  padding: 6px 0;
  font-size: 13px;
  font-weight: 600;
  border: 2px solid #34495e;
  background: #f8f9fa;
  color: #7f8c8d;
  cursor: pointer;
  transition: all 0.15s;
  letter-spacing: 1px;
}

.lb-toggle-btn:first-child {
  border-radius: 4px 0 0 4px;
}

.lb-toggle-btn:last-child {
  border-radius: 0 4px 4px 0;
}

.lb-toggle-btn.active {
  background: #34495e;
  color: #fff;
  border-color: #34495e;
}

.game-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: var(--panel);
  border: 2px solid var(--accent);
  border-radius: 4px;
  color: var(--text-color) !important;
}

.info-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted) !important;
  letter-spacing: 1px;
  margin-bottom: 1px;
}

.info-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text-color) !important;
}

.info-level,
.info-score {
  color: var(--text-color) !important;
}

.game-center {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.grid-section {
  position: relative;
}

.coin-popup {
  position: absolute;
  z-index: 5;
  font-size: 16px;
  font-weight: 800;
  color: #f1c40f;
  text-shadow: 0 0 8px rgba(241, 196, 15, 0.9), 0 2px 6px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  animation: floatUp 0.8s ease-out forwards;
}

@keyframes floatUp {
  0% {
    transform: translateY(0) scale(0.8);
    opacity: 0;
  }
  20% {
    transform: translateY(-10px) scale(1.2);
    opacity: 1;
  }
  100% {
    transform: translateY(-40px) scale(1);
    opacity: 0;
  }
}

.pause-btn {
  position: absolute;
  top: -34px;
  left: 0;
  z-index: 10;
  width: 32px;
  height: 32px;
  font-size: 18px;
  background: var(--panel);
  color: var(--text-color) !important;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out;
}

.pause-btn:hover {
  background: #2c3e50;
}

.grid-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 2px solid #34495e;
  border-radius: 4px;
  background: #ecf0f1;
}

.grid-row {
  display: flex;
}

.cell {
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  border: 1px solid #bdc3c7;
}

.cell-food {
  background-color: #e74c3c;
  border-color: #c0392b;
  border-radius: 50%;
}

.cell-gold {
  background-color: #f1c40f;
  border-color: #f39c12;
  border-radius: 50%;
  box-shadow: 0 0 8px #f1c40f, 0 0 16px rgba(241, 196, 15, 0.6);
  animation: goldGlow 1.5s ease-in-out infinite alternate;
}

@keyframes goldGlow {
  0% {
    box-shadow: 0 0 8px #f1c40f, 0 0 14px rgba(241, 196, 15, 0.4);
    opacity: 0.95;
  }
  100% {
    box-shadow: 0 0 12px #f1c40f, 0 0 22px rgba(241, 196, 15, 0.7);
    opacity: 1;
  }
}

/* 💡 關鍵魔改 2：新增紫色毒蘋果的 CSS 樣式與動畫效果 */
.cell-poison {
  background-color: #9b59b6; /* 經典紫色 */
  border: 2px solid #8e44ad; /* 深紫色邊框 */
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(155, 89, 182, 0.8);
  animation: poisonPulse 1.2s ease-in-out infinite alternate;
}

@keyframes poisonPulse {
  0% { filter: brightness(0.9); }
  100% { filter: brightness(1.2); }
}

/* 平滑移動的尖刺球容器 */
.spike-ball {
  position: absolute;
  pointer-events: none;
  will-change: transform;
  transform-origin: 0 0;
  z-index: 6;
  filter: drop-shadow(0 0 10px rgba(241, 196, 15, 0.45));
}
.spike-svg {
  width: 100%;
  height: 100%;
  display: block;
  animation: rotateSpikeSvg 8s linear infinite;
}

@keyframes rotateSpikeSvg {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spike-pulse-core {
  animation: pulseCore 1.5s ease-in-out infinite alternate;
}

@keyframes pulseCore {
  0% { fill: #e74c3c; r: 10; }
  100% { fill: #f39c12; r: 14; }
}

/* ==========================================
   蛇的預設顏色樣式（升級為橘色漸層）
   ========================================== */

/* 1. 預設蛇頭（亮橘到飽和橘漸層） */
.cell-snake-head {
  background: linear-gradient(135deg, #e67e22, #d35400);

  box-shadow: 0 0 8px rgba(230, 126, 34, 0.5); /* 橘色微光 */
  transition: all 0.3s ease; /* 吃到磁鐵時的平滑變色過渡 */
}

/* 2. 預設蛇身體（飽和橘到深橘漸層，與頭部做出層次感） */
.cell-snake-body {
  background: linear-gradient(135deg, #f39c12, #e67e22);
  border-radius: 4px; /* 身體微圓角 */
  box-shadow: 0 0 6px rgba(243, 156, 18, 0.4);
  transition: all 0.3s ease;
}

/* ==========================================
   磁鐵模式：升級為彩虹炫光閃爍！
   ========================================== */
.cell-snake-head.snake-magnet,
.cell-snake-body.snake-magnet {
  /* 1. 打造流動的彩虹漸層背景 (紅、橘、黃、綠、藍、紫、紅) */
  background: linear-gradient(120deg, #ff3366, #ff9933, #ffff33, #33cc66, #3399ff, #9933ff, #ff3366);
  background-size: 400% 100%; /* 將背景放大，這樣顏色才會有流動的空間 */

  /* 2. 套用新動畫：同時控制「彩虹流動」與「外發光閃爍」 */
  animation: rainbowFlow 1.5s linear infinite, magnetRainbowGlow 1s ease-in-out infinite alternate;

  /* 3. 初始的多重色彩外發光（讓發光更立體） */
  box-shadow: 0 0 12px rgba(255, 51, 102, 0.8),
              0 0 4px rgba(51, 153, 255, 0.6),
              inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

/* ==========================================
   動畫 1：控制彩虹背景流動 (讓顏色源源不絕地滾動)
   ========================================== */
@keyframes rainbowFlow {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 400% 50%; /* 讓漸層背景橫向移動一整圈 */
  }
}

/* ==========================================
   動畫 2：控制外發光閃爍 (霓虹燈呼吸效果)
   ========================================== */
@keyframes magnetRainbowGlow {
  0% {
    /* 較暗時的發光：偏紅紫與藍 */
    box-shadow: 0 0 8px rgba(255, 51, 102, 0.6),
                0 0 4px rgba(51, 153, 255, 0.4),
                inset 0 0 0 1px rgba(255, 255, 255, 0.4);
  }
  100% {
    /* 最亮時的發光：大幅度擴散，並帶有耀眼的霓虹感 */
    box-shadow: 0 0 18px rgba(255, 153, 51, 0.9),
                0 0 8px rgba(51, 204, 102, 0.7),
                inset 0 0 0 1px rgba(255, 255, 255, 0.7);
  }
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
}

.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: var(--text-color) !important;
}

.pause-title {
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 20px;
  letter-spacing: 4px;
}

.pause-action-btn {
  width: 180px;
  padding: 10px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color) !important;
  background: var(--accent);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 8px;
}

.pause-action-btn:hover {
  background: #2471a3;
}

.pause-action-btn.secondary {
  background: transparent;
  border: 2px solid var(--text-color);
  color: var(--text-color) !important;
}

.pause-action-btn.secondary:hover {
  background: var(--text-color);
  color: var(--bg) !important;
}

.pause-action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.pause-lock-text {
  margin-top: 10px;
  font-size: 0.95rem;
  color: #f1c40f;
}

.waiting-text {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 3px;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.game-over-text {
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 8px;
  letter-spacing: 3px;
  color: var(--text-color) !important;
}

.final-score {
  font-size: 18px;
  margin: 0 0 16px;
  color: var(--text-color) !important;
}

.restart-btn {
  padding: 8px 24px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background-color: #2980b9;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.restart-btn:hover {
  background-color: #2471a3;
}

.back-btn {
  margin-top: 8px;
  padding: 8px 24px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background: transparent;
  border: 2px solid #fff;
  border-radius: 4px;
  cursor: pointer;
}

.back-btn:hover {
  background: #fff;
  color: #1a1a2e;
}

.rules {
  margin-top: 8px;
  display: flex;
  gap: 16px;
  justify-content: center;
  font-size: 13px;
  color: var(--text-muted) !important;
}

.rule-item {
  white-space: nowrap;
  color: var(--text-muted) !important;
}

/* 修改後的金幣樣式 */
.cell-coin {
  display: inline-block;
  position: relative; /* 讓 🪙 可以相對於格子定位 */

  /* 保留你原本的漂浮動畫 */
  animation: coinFloat 1.6s ease-in-out infinite;
}

/* 核心：用 CSS 動態把 🪙 塞進去 */
.cell-coin::before {
  content: "🪙";           /* 塞入金幣圖標 */
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); /* 確保金幣在格子正中央 */

  /* 控制金幣的大小，可以根據你的格子大小調整（例如 24px 或 28px） */
  font-size: 24px;

  /* 複製計數器的金色外發光特效 */
  filter: drop-shadow(0 0 6px rgba(241, 196, 15, 0.8));
}

@keyframes coinFloat {
  0% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-4px) rotate(8deg); }
  100% { transform: translateY(0) rotate(0deg); }
}

/* 金幣計數器樣式 */
.coin-counter {
  position: fixed;
  right: 20px;
  font-size: 14px;
  font-weight: 700;
  color: #f1c40f;
  text-shadow: 0 0 8px rgba(241, 196, 15, 0.6), 0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  letter-spacing: 1px;
  padding: 8px 12px;
  background: rgba(44, 62, 80, 0.7);
  border: 1px solid #f1c40f;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}

.coin-counter-waiting {
  top: 20px;
  font-size: 16px;
  animation: coinGlow 2s ease-in-out infinite;
}

.coin-counter-ingame {
  top: 70px;
  font-size: 13px;
}

.lobby-actions {
  margin-top: 14px;
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.start-game-btn {
  padding: 12px 18px;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: #ffffff;
  box-shadow: 0 10px 25px rgba(39, 174, 96, 0.3);
}

.start-game-btn:hover {
  transform: translateY(-1px);
}

.preview-display {
  display: flex;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.preview-cell {
  width: 46px;
  min-height: 46px;
  border-radius: 12px;
  border: 1px solid rgba(52, 73, 94, 0.12);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
}

.preview-cell.preview-head {
  width: 52px;
  border-width: 2px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

.preview-cell.preview-body {
  width: 44px;
}

.preview-cell.preview-placeholder {
  background: rgba(236, 240, 241, 0.8);
}

.shop-preview-panel {
  margin-bottom: 18px;
  border-radius: 18px;
  padding: 18px;
  background: var(--panel);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.12);
}

.preview-frame {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.preview-label {
  font-size: 14px;
  font-weight: 700;
  color: #34495e;
}

.preview-display {
  display: grid;
  grid-template-columns: repeat(5, minmax(38px, 1fr));
  gap: 8px;
  width: 100%;
}

.preview-cell {
  width: 100%;
  min-height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(52, 73, 94, 0.14);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.3);
}

.preview-placeholder {
  background: rgba(236, 240, 241, 0.8);
}

.shop-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 15, 29, 0.75);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1100;
}

.shop-modal {
  width: min(860px, 100%);
  max-height: min(88vh, 860px);
  background: var(--panel);
  border-radius: 24px;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.28);
  border: 1px solid var(--accent);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.shop-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 26px 12px;
}

.shop-title {
  font-size: 24px;
  font-weight: 800;
  color: #2c3e50;
}

.shop-subtitle {
  margin: 6px 0 0;
  color: #5c6b7a;
  font-size: 14px;
  line-height: 1.5;
}

.shop-close-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: var(--accent);
  color: var(--text);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.shop-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 0 24px 20px;
}

.shop-tabs button {
  border: 1px solid rgba(52, 73, 94, 0.15);
  background: #f7f9fb;
  color: #34495e;
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.shop-tabs button.active {
  background: #f1c40f;
  color: #2c3e50;
  border-color: #f1c40f;
}

.shop-notice {
  padding: 0 24px 14px;
  color: #2c3e50;
  font-weight: 700;
}

.shop-body {
  padding: 0 24px 24px;
  overflow-y: auto;
}

.shop-banner {
  margin-bottom: 18px;
  background: #fff7d6;
  border: 1px solid #f7d069;
  color: #7f6000;
  padding: 14px 16px;
  border-radius: 14px;
  font-size: 14px;
}

.shop-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.shop-card {
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(44, 62, 80, 0.08);
}

.skin-preview {
  min-height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 800;
  text-align: center;
  padding: 18px;
  position: relative;
}

.skin-preview span {
  z-index: 1;
}

.skin-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.skin-price {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #2c3e50;
  font-weight: 700;
}

.price-original {
  margin-left: 6px;
  color: #7f8c8d;
  text-decoration: line-through;
  font-size: 12px;
  font-weight: 500;
}

.owned-label {
  color: #27ae60;
}

.locked-label {
  color: #e74c3c;
  font-weight: 600;
}

.shop-action-btn {
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: 999px;
  background: #2c3e50;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.shop-action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #34495e;
}

.shop-action-btn.secondary {
  background: #f7f9fb;
  color: #2c3e50;
  border: 1px solid rgba(52, 73, 94, 0.12);
}

.shop-action-btn.large {
  flex: 1;
}

.shop-action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.gacha-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gacha-actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.gacha-odds {
  color: #7f8c8d;
  font-size: 13px;
}

.gacha-results {
  display: grid;
  gap: 10px;
  margin-top: 8px;
}

.gacha-result {
  padding: 12px 14px;
  border-radius: 14px;
  background: #f7f9fb;
  color: #2c3e50;
  font-weight: 700;
  border: 1px solid rgba(52, 73, 94, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.gacha-result-content {
  flex: 1;
  word-break: break-word;
}

.gacha-result.win {
  background: linear-gradient(135deg, #f9e79f, #f1c40f);
  border-color: #f39c12;
}

.gacha-result.loss {
  background: #ecf0f1;
}

.gacha-equip-btn {
  padding: 6px 12px;
  background: #27ae60;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.gacha-equip-btn:hover {
  background: #229954;
  transform: scale(1.05);
}

.gacha-equip-btn:active {
  transform: scale(0.98);
}

@media (max-width: 820px) {
  .shop-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .shop-tabs {
    grid-template-columns: 1fr;
  }
  .shop-modal {
    border-radius: 18px;
  }
  .shop-close-btn {
    width: 36px;
    height: 36px;
  }
}

@keyframes coinGlow {
  0%, 100% { text-shadow: 0 0 8px rgba(241, 196, 15, 0.6), 0 2px 4px rgba(0, 0, 0, 0.3); }
  50% { text-shadow: 0 0 16px rgba(241, 196, 15, 0.9), 0 2px 8px rgba(0, 0, 0, 0.5); }
}

/* ==========================================================================
   🪙 皮膚權重強化版 - 確保徹底覆蓋舊身體顏色
   ========================================================================== */

/* --- 初級皮膚區 (Basic Skins) --- */
.cell-snake-head.skin-basic-red,
.cell-snake-body.skin-basic-red {
  background: linear-gradient(135deg, #e74c3c, #c0392b) !important;
  box-shadow: 0 0 8px rgba(231, 76, 60, 0.55) !important;
}
.cell-snake-head.skin-basic-orange,
.cell-snake-body.skin-basic-orange {
  background: linear-gradient(135deg, #e67e22, #d35400) !important;
  box-shadow: 0 0 8px rgba(230, 126, 34, 0.55) !important;
}
.cell-snake-head.skin-basic-yellow,
.cell-snake-body.skin-basic-yellow {
  background: linear-gradient(135deg, #f1c40f, #f39c12) !important;
  box-shadow: 0 0 8px rgba(241, 196, 15, 0.55) !important;
}
.cell-snake-head.skin-basic-green,
.cell-snake-body.skin-basic-green {
  background: linear-gradient(135deg, #2ecc71, #27ae60) !important;
  box-shadow: 0 0 8px rgba(46, 204, 113, 0.55) !important;
}
.cell-snake-head.skin-basic-blue,
.cell-snake-body.skin-basic-blue {
  background: linear-gradient(135deg, #3498db, #2c3e50) !important;
  box-shadow: 0 0 8px rgba(52, 152, 219, 0.55) !important;
}
.cell-snake-head.skin-basic-purple,
.cell-snake-body.skin-basic-purple {
  background: linear-gradient(135deg, #9b59b6, #8e44ad) !important;
  box-shadow: 0 0 8px rgba(155, 89, 182, 0.55) !important;
}
.cell-snake-head.skin-basic-black,
.cell-snake-body.skin-basic-black {
  background: linear-gradient(135deg, #2c3e50, #1b2631) !important;
  box-shadow: 0 0 8px rgba(44, 62, 80, 0.55) !important;
}
.cell-snake-head.skin-basic-white,
.cell-snake-body.skin-basic-white {
  background: linear-gradient(135deg, #ecf0f1, #bdc3c7) !important;
  box-shadow: 0 0 8px rgba(189, 195, 199, 0.55) !important;
  color: #2c3e50 !important;
}

/* --- 高級皮膚區 (Premium Skins) --- */

/* 1. 彩虹皮膚 */
.cell-snake-head.skin-premium-rainbow,
.cell-snake-body.skin-premium-rainbow {
  background: linear-gradient(45deg, #e74c3c, #f1c40f, #2ecc71, #3498db, #9b59b6) !important;
  background-size: 200% 200% !important;
  animation: rainbowShift 3s linear infinite !important;
}

/* 2. 黃金奢華皮膚 */
.cell-snake-head.skin-premium-gold,
.cell-snake-body.skin-premium-gold {
  background: linear-gradient(135deg, #f1c40f 0%, #f39c12 50%, #d35400 100%) !important;
  box-shadow: 0 0 8px #f1c40f !important;
  border: 1px solid #f39c12 !important;
}

/* 3. 斑馬條紋皮膚 */
.cell-snake-head.skin-premium-zebra,
.cell-snake-body.skin-premium-zebra {
  background: repeating-linear-gradient(
    45deg,
    #ffffff,
    #ffffff 4px,
    #2c3e50 4px,
    #2c3e50 8px
  ) !important;
}

/* 4. 烈焰條紋皮膚 */
.cell-snake-head.skin-premium-flame,
.cell-snake-body.skin-premium-flame {
  background: repeating-linear-gradient(
    -45deg,
    #e67e22,
    #e67e22 6px,
    #e74c3c 6px,
    #e74c3c 12px
  ) !important;
  box-shadow: 0 0 6px #e67e22 !important;
}


/* --- 2% 終極稀有特效區 (Rare CG Skins) --- */

/* 1. 賽博龐克迷幻彩虹 */
.cell-snake-head.skin-rare-cyberpunk,
.cell-snake-body.skin-rare-cyberpunk {
  background: linear-gradient(90deg, #ff007f, #00f0ff, #7000ff, #ff007f) !important;
  background-size: 300% 100% !important;
  animation: cyberFlow 2s linear infinite !important;
  box-shadow: 0 0 12px #00f0ff, inset 0 0 6px #ff007f !important;
}

/* 2. 幽靈透明皮膚 */
.cell-snake-head.skin-rare-ghost,
.cell-snake-body.skin-rare-ghost {
  background: rgba(255, 255, 255, 0.25) !important;
  border: 2px solid rgba(52, 152, 219, 0.8) !important;
  box-shadow: 0 0 10px rgba(52, 152, 219, 0.5) !important;
  backdrop-filter: blur(1px) !important;
}

/* 3. 電競 RGB 燈條 */
.cell-snake-head.skin-rare-rgb,
.cell-snake-body.skin-rare-rgb {
  animation: rgbGlow 4s linear infinite !important;
  box-shadow: 0 0 10px currentColor !important;
}

/* 4. 地心岩漿流體 */
.cell-snake-head.skin-rare-magma,
.cell-snake-body.skin-rare-magma {
  background: linear-gradient(0deg, #111111, #d35400, #c0392b, #111111) !important;
  background-size: 100% 400% !important;
  animation: magmaPump 4s ease-in-out infinite !important;
  box-shadow: 0 0 8px #c0392b !important;
}

</style>
