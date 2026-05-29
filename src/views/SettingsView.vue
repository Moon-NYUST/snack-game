<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useGameStore } from '../stores/game'

type DirectionAction = 'Up' | 'Down' | 'Left' | 'Right' | 'Boost'
type RuleInputKey = 'initialSpeed' | 'foodScore' | 'speedBoost' | 'spikeSpeed' | 'spikeThreshold' | 'boostMultiplier' | 'levelUpScore'

type KeyBindingState = {
  Up: string
  Down: string
  Left: string
  Right: string
  Boost: string
  Pause: [string, string]
}

type KeyConfigItem = {
  label: string
  action: DirectionAction
  desc: string
  default: string
  fallback: string
}

type PauseConfigItem = {
  label: string
  desc: string
  action: number
  default: string
}

const props = withDefaults(
  defineProps<{ theme: string; isFromGame?: boolean }>(),
  { isFromGame: false },
)
const emit = defineEmits(['goToStart', 'saveTheme', 'backToPause'])

const backButtonLabel = computed(() =>
  props.isFromGame ? '返回遊戲' : '返回主選單',
)

const game = useGameStore()
const tempTheme = ref(props.theme)
const activeTab = ref<'theme' | 'keys' | 'rules'>('theme')

const themes = [
  { id: 'theme-neon', label: '霓虹風' },
  { id: 'theme-arcade', label: '街機風' },
  { id: 'theme-tech', label: '科技風' },
  { id: 'theme-rainforest', label: '雨林風' },
]

const keyConfig: Array<KeyConfigItem> = [
  { label: '向上', action: 'Up', desc: '控制蛇向上移動', default: 'W', fallback: 'W' },
  { label: '向下', action: 'Down', desc: '控制蛇向下移動', default: 'S', fallback: 'S' },
  { label: '向左', action: 'Left', desc: '控制蛇向左移動', default: 'A', fallback: 'A' },
  { label: '向右', action: 'Right', desc: '控制蛇向右移動', default: 'D', fallback: 'D' },
  { label: '加速', action: 'Boost', desc: '按住此按鍵可增加蛇的速度', default: 'Shift', fallback: 'Shift' },
]

const pauseConfig: PauseConfigItem[] = [
  { label: '暫停鍵 1', desc: '暫停/繼續遊戲（主鍵）', action: 0, default: 'Space' },
  { label: '暫停鍵 2', desc: '暫停/繼續遊戲（備用）', action: 1, default: 'ESC' },
]

const keybindings = reactive<KeyBindingState>({
  Up: '',
  Down: '',
  Left: '',
  Right: '',
  Boost: 'ShiftLeft',
  Pause: ['',''],
})

const activeBind = ref<{ type: 'direction' | 'pause'; idx: number } | null>(null)

const ruleInputs = reactive({
  initialSpeed: 4,
  foodScore: 10,
  speedBoost: 0.2,
  spikeSpeed: 5,
  spikeThreshold: 100,
  boostMultiplier: 2.0,
  levelUpScore: 200,
})

const localKey = 'SnakeGame_SettingsV2'

function ensureDefaultKeybindings() {
  if (!keybindings.Up.trim()) keybindings.Up = 'W'
  if (!keybindings.Down.trim()) keybindings.Down = 'S'
  if (!keybindings.Left.trim()) keybindings.Left = 'A'
  if (!keybindings.Right.trim()) keybindings.Right = 'D'
  if (!keybindings.Boost.trim()) keybindings.Boost = 'ShiftLeft'
  if (!keybindings.Pause[0].trim()) keybindings.Pause[0] = 'Space'
  if (!keybindings.Pause[1].trim()) keybindings.Pause[1] = 'Escape'
}

function loadLocalSettings() {
  try {
    const raw = localStorage.getItem(localKey)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.keybindings) {
        Object.assign(keybindings, parsed.keybindings)
        ensureDefaultKeybindings()
      }
      if (parsed.ruleInputs) {
        Object.assign(ruleInputs, parsed.ruleInputs)
      }
    } else {
      keybindings.Up = game.keysMoveUp[0] || 'W'
      keybindings.Down = game.keysMoveDown[0] || 'S'
      keybindings.Left = game.keysMoveLeft[0] || 'A'
      keybindings.Right = game.keysMoveRight[0] || 'D'
      keybindings.Boost = game.keyBoost || 'ShiftLeft'
      keybindings.Pause[0] = game.keysPause[0] === ' ' ? 'Space' : (game.keysPause[0] || 'Space')
      keybindings.Pause[1] = game.keysPause[1] || 'Escape'

      const cellsPerSec = game.INITIAL_SPEED > 0 ? Math.round(1000 / game.INITIAL_SPEED) : 4
      ruleInputs.initialSpeed = cellsPerSec
      ruleInputs.foodScore = game.SCORE_PER_FOOD
      ruleInputs.speedBoost = (game.BOOST_MULTIPLIER - 1)
      ruleInputs.spikeSpeed = game.SPIKE_SPEED
      ruleInputs.spikeThreshold = game.SPIKE_SPAWN_SCORE
      ruleInputs.boostMultiplier = game.BOOST_MULTIPLIER
      ruleInputs.levelUpScore = game.LEVEL_UP_SCORE
    }
  } catch {
    ensureDefaultKeybindings()
  }
}

function saveLocalSettings() {
  ensureDefaultKeybindings()
  localStorage.setItem(localKey, JSON.stringify({
    keybindings: JSON.parse(JSON.stringify(keybindings)),
    ruleInputs: { ...ruleInputs }
  }))
}

function syncToGame() {
  saveLocalSettings()
  game.loadSettingsV2()
}

function leaveSettings() {
  if (props.isFromGame) {
    emit('backToPause')
  } else {
    emit('goToStart')
  }
}

const saveChanges = () => {
  saveLocalSettings()
  syncToGame()
  game.saveAllSettings()
  game.setTheme(tempTheme.value)
  emit('saveTheme', tempTheme.value)
  leaveSettings()
}

watch(tempTheme, saveLocalSettings)

let keyListener: ((e: KeyboardEvent) => void) | null = null

function startBindSlot(type: 'direction' | 'pause', idx: number) {
  activeBind.value = { type, idx }
  nextTick(() => {
    const el = document.querySelector(`[data-keybind-btn="${type}-${idx}"]`) as HTMLButtonElement
    el?.focus()
  })
}

function stopBinding() {
  activeBind.value = null
  if (keyListener) {
    window.removeEventListener('keydown', keyListener)
    keyListener = null
  }
}

watch(activeBind, v => {
  if (v) {
    keyListener = (e: KeyboardEvent) => {
      e.preventDefault()
      const action = keyConfig[v.idx]?.action
      const stored =
        e.code.startsWith('Key') || e.code.startsWith('Arrow') || e.code.includes('Shift')
          ? e.code
          : (e.key.length === 1 ? e.key.toUpperCase() : e.key)
      if (v.type === 'direction' && action) {
        const used = [
          keybindings.Up,
          keybindings.Down,
          keybindings.Left,
          keybindings.Right,
          keybindings.Boost,
        ]
        if (!used.includes(stored)) {
          keybindings[action] = stored
        }
      } else if (v.type === 'pause') {
        keybindings.Pause[v.idx] = stored
      }
      saveLocalSettings()
      stopBinding()
    }
    window.addEventListener('keydown', keyListener)
  } else {
    stopBinding()
  }
})

onUnmounted(() => stopBinding())

onMounted(() => {
  loadLocalSettings()
  game.loadSettingsV2()
})

const ruleItems: Array<{
  key: RuleInputKey
  title: string
  desc: string
  min: number
  max: number
  step: number
  postfix: string
}> = [
  {
    key: 'initialSpeed',
    title: '初始速度',
    desc: '蛇剛開始移動的速度。',
    min: 1,
    max: 20,
    step: 1,
    postfix: '格/秒',
  },
  {
    key: 'foodScore',
    title: '食物分數',
    desc: '吃到一個食物得到的分數。',
    min: 1,
    max: 100,
    step: 1,
    postfix: '分',
  },
  {
    key: 'speedBoost',
    title: '加速倍率',
    desc: '每次加速蛇會變快多少。',
    min: 0.05,
    max: 1.0,
    step: 0.01,
    postfix: '倍',
  },
  {
    key: 'spikeSpeed',
    title: '尖刺球速度',
    desc: '移動障礙物「尖刺球」在畫面上的滾動速度。',
    min: 1,
    max: 20,
    step: 1,
    postfix: '格/秒',
  },
  {
    key: 'spikeThreshold',
    title: '尖刺球出現門檻',
    desc: '達到多少分數後，畫面上才會開始出現尖刺球。',
    min: 0,
    max: 1000,
    step: 10,
    postfix: '分',
  },
  {
    key: 'boostMultiplier',
    title: '按鍵加速倍率',
    desc: '當你按住「加速鍵」時，蛇的移動速度會翻幾倍。',
    min: 1.1,
    max: 3.0,
    step: 0.1,
    postfix: '倍速',
  },
  {
    key: 'levelUpScore',
    title: '升級所需分數',
    desc: '每吃多少分，遊戲會自動提升難度（自動小幅加速）。',
    min: 50,
    max: 1000,
    step: 50,
    postfix: '分/級',
  },
]
</script>

<template>
  <div class="settings-page" :class="tempTheme">
    <div class="settings-card">
      <h2 class="main-title">遊戲設定</h2>

      <div class="tabs-header">
        <button
          v-for="tab in ['theme', 'keys', 'rules'] as const"
          :key="tab"
          class="tab-btn"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ tab === 'theme' ? '風格主題' : tab === 'keys' ? '操作按鍵' : '遊戲參數' }}
        </button>
      </div>

      <div class="panel-body enhance-scroll">
        <!-- 風格主題分頁 -->
        <div v-if="activeTab === 'theme'" class="theme-grid">
          <button
            v-for="t in themes"
            :key="t.id"
            class="theme-card"
            :class="{ active: tempTheme === t.id }"
            @click="tempTheme = t.id"
          >
            {{ t.label }}
          </button>
        </div>

        <!-- 操作按鍵分頁 -->
        <div v-if="activeTab === 'keys'" class="keys-panel key-flex-root">
          <h3 class="panel-subtitle" style="margin-bottom: 1.2rem;">移動操作按鍵設定</h3>
          <div class="key-slots-list">
            <div v-for="(conf, idx) in keyConfig" :key="conf.action" class="key-slot-row">
              <div class="key-slot-left">
                <span class="label">{{ conf.label }}</span>
                <div class="desc">{{ conf.desc }}</div>
              </div>
              <div class="key-slot-right">
                <button
                  class="key-slot-btn"
                  :data-keybind-btn="'direction-' + idx"
                  :class="{ recording: activeBind?.type === 'direction' && activeBind?.idx === idx }"
                  @click="startBindSlot('direction', idx)"
                  :disabled="activeBind !== null && !(activeBind.type === 'direction' && activeBind.idx === idx)"
                  tabindex="0"
                  >
                  <span v-if="activeBind?.type === 'direction' && activeBind?.idx === idx">請按鍵...</span>
                  <span v-else>
                    {{ keybindings[conf.action] || conf.default }}
                  </span>
                </button>
                <span class="fallback-label" :title="'推薦: ' + conf.fallback">
                  ({{ conf.fallback }})
                </span>
              </div>
            </div>
          </div>

          <h3 class="panel-subtitle" style="margin: 2rem 0 1.2rem;">暫停鍵設定 (雙槽)</h3>
          <div class="key-slots-list">
            <div v-for="(conf, pidx) in pauseConfig" :key="pidx" class="key-slot-row">
              <div class="key-slot-left">
                <span class="label">{{ conf.label }}</span>
                <div class="desc">{{ conf.desc }}</div>
              </div>
              <div class="key-slot-right">
                <button
                  class="key-slot-btn"
                  :data-keybind-btn="'pause-' + pidx"
                  :class="{ recording: activeBind?.type === 'pause' && activeBind?.idx === pidx }"
                  @click="startBindSlot('pause', pidx)"
                  :disabled="activeBind !== null && !(activeBind.type === 'pause' && activeBind.idx === pidx)"
                  tabindex="0"
                >
                  <span v-if="activeBind?.type === 'pause' && activeBind?.idx === pidx">請按鍵...</span>
                  <span v-else>
                    {{ keybindings.Pause[pidx] || conf.default }}
                  </span>
                </button>
                <span class="fallback-label" :title="'建議: ' + conf.default">
                  ({{ conf.default }})
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 規則/參數分頁 -->
        <div v-if="activeTab === 'rules'" class="rules-panel rules-flex-root">
          <div v-for="item in ruleItems" :key="item.key" class="rule-row">
            <div class="rule-label-box">
              <div class="rule-title">{{ item.title }}</div>
              <div class="rule-desc">{{ item.desc }}</div>
            </div>
            <div class="rule-slider-box">
              <input
                class="rule-slider"
                type="range"
                :min="item.min"
                :max="item.max"
                :step="item.step"
                v-model.number="ruleInputs[item.key]"
                @change="saveLocalSettings"
              >
              <input
                class="rule-number"
                type="number"
                :min="item.min"
                :max="item.max"
                :step="item.step"
                v-model.number="ruleInputs[item.key]"
                @change="saveLocalSettings"
              >
              <span class="rule-postfix">{{ item.postfix }}</span>
            </div>
          </div>
          <!-- 磁鐵相關設定 -->
          <div class="rule-row">
            <div class="rule-label-box">
              <div class="rule-title">磁鐵持續時間</div>
              <div class="rule-desc">吃到黃金果實後磁鐵持續的秒數。</div>
            </div>
            <div class="rule-slider-box">
              <input
                class="rule-slider"
                type="range"
                min="3"
                max="15"
                step="1"
                v-model.number="game.MAGNET_DURATION"
                @change="game.saveAllSettings"
              >
              <input
                class="rule-number"
                type="number"
                min="3"
                max="15"
                step="1"
                v-model.number="game.MAGNET_DURATION"
                @change="game.saveAllSettings"
              >
              <span class="rule-postfix">秒</span>
            </div>
          </div>

          <div class="rule-row">
            <div class="rule-label-box">
              <div class="rule-title">磁鐵吸力範圍</div>
              <div class="rule-desc">磁鐵對食物吸引的距離（格數）。</div>
            </div>
            <div class="rule-slider-box">
              <input
                class="rule-slider"
                type="range"
                min="2"
                max="6"
                step="1"
                v-model.number="game.MAGNET_RANGE"
                @change="game.saveAllSettings"
              >
              <input
                class="rule-number"
                type="number"
                min="2"
                max="6"
                step="1"
                v-model.number="game.MAGNET_RANGE"
                @change="game.saveAllSettings"
              >
              <span class="rule-postfix">格</span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <button class="action-btn save" @click="saveChanges">儲存設定</button>
        <button class="action-btn back" @click="leaveSettings">{{ backButtonLabel }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* === 共用覆蓋基礎 === */
.settings-page {
  width: 100vw; min-height: 100vh;
  display: flex; justify-content: center; align-items: center;
  transition: all 0.4s ease; padding: 2rem;
}
.settings-card {
  width: 100%; max-width: 500px;
  backdrop-filter: blur(12px);
  border-radius: 20px; padding: 2.5rem;
  text-align: center;
  display: flex; flex-direction: column; align-items: center;
  border-width: 2px; border-style: solid;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
}
.panel-body.enhance-scroll {
  width: 100%;
  box-sizing: border-box;
  max-height: 53vh;
  min-height: 260px;
  overflow-y: auto;
  padding-bottom: 3rem;
  /* 滾動條美化可視覺主題做調整 */
}
@media (max-width: 640px) {
  .settings-card { padding: 1.2rem !important; }
  .panel-body.enhance-scroll { max-height: 65vh; padding-bottom: 2rem;}
}

/* 新增按鍵設定、參數 flex 相關 */
.key-flex-root, .rules-flex-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.key-slots-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}
.key-slot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 92%;
  margin: 0.1em 0;
  background: rgba(0,0,0,0.04);
  border-radius: 10px;
  box-sizing: border-box;
  min-height: 68px;
  padding: 0.4em 1em;
  gap: 1.2em;
}
@media (max-width: 500px) {
  .key-slot-row { width: 99%; padding: 0.4em 0.1em;}
}
.key-slot-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 110px;
  max-width: 120px;
  gap: 2px;
}
.key-slot-left .label { font-size: 1.08em; font-weight: bold;}
.key-slot-left .desc { font-size: 0.95em; opacity: 0.78; margin-top: 0.09em;}

.key-slot-right {
  display: flex; flex-direction: row; align-items: center; gap: 0.6em;
  min-width: 110px; justify-content: flex-end;
}
.key-slot-btn {
  min-width: 60px;
  min-height: 2.6em;
  font-size: 1.11em;
  padding: 0.18em 1.3em;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  background: #fff;
  color: #333;
  transition: background 0.25s, border 0.25s, color 0.25s;
  position: relative;
  box-shadow: none;
}
.key-slot-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.key-slot-btn.recording {
  background: #ffe885 !important;
  color: #000 !important;
  border: 2px solid #ffb800 !important;
  animation: keyRecFlash 1s infinite alternate;
}
@keyframes keyRecFlash {
  0% { box-shadow: 0 0 0px #ffd80088 }
  100% { box-shadow: 0 0 7px #ffd800aa }
}
.fallback-label {
  font-size: 0.88em;
  opacity: 0.7;
}

/* 參數調整設定區塊 */
.rules-flex-root {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.rule-row {
  width: 96%;
  max-width: 99%;
  min-width: 210px;
  margin: 0.9em 0;
  padding: 0.9em 1em;
  background: rgba(0,0,0,0.04);
  border-radius: 12px;
  display: flex; flex-direction: row; align-items: center; justify-content: space-between;
  gap: 1.1em;
  box-sizing: border-box;
}
@media (max-width: 520px) {
  .rule-row { flex-direction: column; align-items: stretch;}
  .rule-row .rule-slider-box { justify-content: flex-start !important; }
}
.rule-label-box {
  min-width: 120px;
  max-width: 180px;
  display: flex; flex-direction: column; align-items: flex-start;
  gap: 2px;
}
.rule-title { font-weight: bold; font-size: 1.08em;}
.rule-desc { font-size: 0.97em; opacity: 0.75; margin-top: 0.05em;}
.rule-slider-box {
  display: flex; flex-direction: row; align-items: center; gap: 0.6em; justify-content: flex-end;
  flex-grow: 1;
}
.rule-slider {
  width: 95px;
  min-width: 75px;
  max-width: 115px;
  accent-color: #0bb; /* 由主題覆蓋 */
  height: 24px;
}
.rule-number {
  width: 58px;
  border-radius: 7px;
  border: 1px solid #aaa;
  padding: 3px 6px;
  font-size: 1em;
  text-align: right;
  margin-left: 0.07em;
}
.rule-postfix {
  margin-left: 0.16em;
  font-size: 1em;
  opacity: 0.78;
}

/* ================ 主題覆蓋 ================ */
/* ==== Neon ==== */
.theme-neon .settings-card {
  background: rgba(25, 10, 45, 0.8);
  border-color: #00f2ff;
}
.theme-neon .main-title,
.theme-neon .panel-subtitle,
.theme-neon .label,
.theme-neon .legacy-content p,
.theme-neon .key-bind-row span,
.theme-neon .key-slot-left .label,
.theme-neon .key-slot-left .desc,
.theme-neon .rule-title,
.theme-neon .rule-desc {
  color: #fff;
  font-weight: bold;
  text-shadow: 0 0 6px #00f2ff, 0 0 12px #00f2ff99;
}
.theme-neon .tab-btn,
.theme-neon .action-btn {
  background: transparent;
  color: #fff;
  border: 1px solid #00f2ff;
  font-weight: bold;
  text-shadow: none;
}
.theme-neon .tab-btn.active,
.theme-neon .action-btn.save {
  background: #00f2ff;
  color: #000;
  font-weight: 900;
  box-shadow: 0 0 15px #00f2ff, 0 0 30px #00f2ff99 inset;
  border: none;
}
.theme-neon .tab-btn:hover:not(.active),
.theme-neon .action-btn:hover:not(.save) {
  filter: brightness(1.3) drop-shadow(0 0 6px #0ff8);
}
.theme-neon .theme-card {
  background: #130b22;
  color: #fff;
  border: 2px solid #232046;
  text-shadow: 0 0 6px #00f2ff99;
}
.theme-neon .theme-card.active {
  border-color: #00f2ff;
  box-shadow: 0 0 20px #00f2ff;
}
.theme-neon .key-slot-btn,
.theme-neon .key-slot-btn:disabled {
  background: #100f1d;
  color: #00f2ff;
  border: 2px solid #00f2ff;
  font-weight: bold;
  text-shadow: 0 0 10px #00f2ff66;
}
.theme-neon .key-slot-btn.recording {
  background: #ffe885 !important; color: #222 !important; border: 2px solid #ffd800 !important;
}
.theme-neon .rule-slider {
  accent-color: #00f2ff;
  background: #121933;
}
.theme-neon .rule-number {
  background: #0a0b16;
  color: #00f2ff;
  border: 1px solid #00f2ff99;
}

/* ==== 科技風 theme-tech ==== */
.theme-tech .settings-card {
  background: #f8fafc;
  border-color: #0f172a;
}
.theme-tech .main-title,
.theme-tech .panel-subtitle,
.theme-tech .label,
.theme-tech .legacy-content p,
.theme-tech .key-bind-row span,
.theme-tech .key-slot-left .label,
.theme-tech .key-slot-left .desc,
.theme-tech .rule-title,
.theme-tech .rule-desc {
  color: #0f172a;
  font-weight: 700;
  text-shadow: none;
}
.theme-tech .tab-btn,
.theme-tech .action-btn {
  background: #e2e8f0;
  color: #0f172a;
  border: 1.5px solid #cbd5e1;
  font-weight: 700;
  text-shadow: none;
}
.theme-tech .tab-btn.active,
.theme-tech .action-btn.save {
  background: #0f172a;
  color: #fff;
  font-weight: 900;
  box-shadow: none;
  border: none;
}
.theme-tech .tab-btn:hover:not(.active),
.theme-tech .action-btn:hover:not(.save) {
  filter: brightness(0.95) drop-shadow(0 2px 6px #cbd5e1);
}
.theme-tech .theme-card {
  background: #fff;
  color: #0f172a;
  border: 2px solid #cbd5e1;
  text-shadow: none;
}
.theme-tech .theme-card.active {
  border-color: #0f172a;
  box-shadow: 0 0 10px #0f172a44;
}
.theme-tech .key-slot-btn,
.theme-tech .key-slot-btn:disabled {
  background: #ffffff;
  color: #0f172a;
  border: 2px solid #0f172a;
  font-weight: bold;
  text-shadow: none;
}
.theme-tech .key-slot-btn.recording {
  background: #ffe885 !important; color: #112 !important; border: 2px solid #ffd800 !important;
}
.theme-tech .rule-slider {
  accent-color: #0f172a;
  background: #e2e8f0;
}
.theme-tech .rule-number {
  background: #f8fafc;
  color: #0f172a;
  border: 1.3px solid #0f172a;
}
/* ==== 街機風 theme-arcade ==== */
.theme-arcade .settings-card {
  background: #000;
  border-color: #00ff00;
  box-shadow: 0 0 8px #00ff0044;
}
.theme-arcade .main-title,
.theme-arcade .panel-subtitle,
.theme-arcade .label,
.theme-arcade .legacy-content p,
.theme-arcade .key-bind-row span,
.theme-arcade .key-slot-left .label,
.theme-arcade .key-slot-left .desc,
.theme-arcade .rule-title,
.theme-arcade .rule-desc {
  color: #00ff00;
  font-weight: bold;
  font-family: 'VT323', 'Fira Mono', monospace;
  letter-spacing: 0.03em;
  text-shadow: 0 0 3px #00ff0044, 0 1px 0 #005800;
}
.theme-arcade .tab-btn,
.theme-arcade .action-btn {
  background: #000;
  color: #00ff00;
  border: 2px solid #00ff00;
  font-family: 'VT323', 'Fira Mono', monospace;
  font-weight: bold;
  transition: 0.2s;
}
.theme-arcade .tab-btn.active,
.theme-arcade .action-btn.save {
  background: #00ff00;
  color: #000;
  font-weight: bold;
  border: 2px solid #00ff00;
  box-shadow: 0 0 9px #00ff0088;
  font-family: 'VT323', 'Fira Mono', monospace;
}
.theme-arcade .tab-btn:hover:not(.active),
.theme-arcade .action-btn:hover:not(.save) {
  filter: brightness(1.75) drop-shadow(0 0 4px #00ff0077);
}
.theme-arcade .theme-card {
  background: #101710;
  color: #00ff00;
  border: 2px solid #003800;
  font-family: 'VT323', 'Fira Mono', monospace;
  letter-spacing: 0.02em;
}
.theme-arcade .theme-card.active {
  border-color: #00ff00;
  background: #041a04;
  box-shadow: 0 0 8px #00ff00bb;
}
.theme-arcade .key-slot-btn,
.theme-arcade .key-slot-btn:disabled {
  background: #0a0b07;
  color: #00ff00;
  border: 2px solid #00ff00;
  font-family: 'VT323', 'Fira Mono', monospace;
  font-weight: bold;
}
.theme-arcade .key-slot-btn.recording {
  background: #ffe885 !important; color: #1C2600 !important; border: 2px solid #ffd800 !important;
}
.theme-arcade .rule-slider {
  accent-color: #00ff00;
  background: #2b3f19;
}
.theme-arcade .rule-number {
  background: #010f01;
  color: #00ff00;
  border: 1.3px solid #00ff00bb;
}
/* ==== 雨林風 theme-rainforest ==== */
.theme-rainforest .settings-card {
  background: #14532d;
  border-color: #bbf7d0;
  box-shadow: 0 2px 12px #06341422;
}
.theme-rainforest .main-title,
.theme-rainforest .panel-subtitle,
.theme-rainforest .label,
.theme-rainforest .legacy-content p,
.theme-rainforest .key-bind-row span,
.theme-rainforest .key-slot-left .label,
.theme-rainforest .key-slot-left .desc,
.theme-rainforest .rule-title,
.theme-rainforest .rule-desc {
  color: #e5e5c9;
  font-weight: bold;
  font-family: 'Noto Sans', '微軟正黑體', sans-serif;
  letter-spacing: 0.01em;
  text-shadow: 0 2px 6px #04785722;
}
.theme-rainforest .tab-btn,
.theme-rainforest .action-btn {
  background: #14532d;
  color: #bbf7d0;
  border: 2px solid #bbf7d0;
  font-weight: 700;
  font-family: 'Noto Sans', '微軟正黑體', sans-serif;
  transition: 0.2s;
}
.theme-rainforest .tab-btn.active,
.theme-rainforest .action-btn.save {
  background: #bbf7d0;
  color: #14532d;
  box-shadow: 0 0 8px #bbf7d088;
  border: 2px solid #bbf7d0;
  font-weight: 900;
}
.theme-rainforest .tab-btn:hover:not(.active),
.theme-rainforest .action-btn:hover:not(.save) {
  filter: brightness(1.1) drop-shadow(0 0 7px #bbf7d0);
}
.theme-rainforest .theme-card {
  background: #166534;
  color: #e5e5c9;
  border: 2px solid #bbf7d0;
  font-family: 'Noto Sans', '微軟正黑體', sans-serif;
  letter-spacing: 0.01em;
}
.theme-rainforest .theme-card.active {
  border-color: #fff7e0;
  background: #054c2a;
  box-shadow: 0 0 12px #bbf7d0cc;
}
.theme-rainforest .key-slot-btn,
.theme-rainforest .key-slot-btn:disabled {
  background: #0a210c;
  color: #bbf7d0;
  border: 2px solid #bbf7d0;
  font-weight: bold;
  font-family: 'Noto Sans', '微軟正黑體', sans-serif;
}
.theme-rainforest .key-slot-btn.recording {
  background: #ffe885 !important; color: #215c23 !important; border: 2px solid #ffd800 !important;
}
.theme-rainforest .rule-slider {
  accent-color: #bbf7d0;
  background: #166534;
}
.theme-rainforest .rule-number {
  background: #133326;
  color: #bbf7d0;
  border: 1.3px solid #bbf7d0;
}

/* Panel Footer 等保持原樣 */
.panel-footer { display: flex; gap: 1rem; margin-top: 2rem; }
.action-btn {
  padding: 1rem 2.5rem; border-radius: 50px; font-weight: bold; cursor: pointer; transition: 0.3s;
  border-width: 2px; border-style: solid;
}
.action-btn:hover { transform: translateY(-5px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }

/* Hide old rules-panel ol, li styles as說明已移除 */
.rules-panel ol, .rules-panel li { display: none; }
</style>
