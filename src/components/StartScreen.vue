<template>
  <div class="start-screen" :class="[props.theme]">
    <div class="background-animation"></div>
    <div class="content">
      <h1 class="title">
        <span>THE SNAKE</span>
        <span>GAME</span>
      </h1>

      <div v-if="page === 'MAIN'" class="menu">
        <button class="menu-btn" @click="page = 'MODE'">開始遊戲</button>
        <button class="menu-btn" @click="$emit('openSettings')">遊戲設定</button>
        <button class="menu-btn" @click="$emit('openLeaderboard')">高分排行</button>
      </div>

      <div v-else-if="page === 'MODE'" class="menu">
        <p class="mode-tip">請選擇遊戲模式</p>
        <button class="menu-btn" @click="startClassic()">經典模式</button>
        <button class="menu-btn" @click="page = 'DIFFICULTY'">挑戰模式</button>
        <button class="menu-btn secondary" @click="page = 'MAIN'">返回</button>
      </div>

      <div v-else-if="page === 'DIFFICULTY'" class="menu">
        <p class="mode-tip">挑戰難度</p>
        <button class="menu-btn" @click="startChallenge(1)">等級 1</button>
        <button class="menu-btn" @click="startChallenge(2)">等級 2</button>
        <button class="menu-btn" @click="startChallenge(3)">等級 3</button>
        <button class="menu-btn secondary" @click="page = 'MODE'">返回</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/game'

type Page = 'MAIN' | 'MODE' | 'DIFFICULTY'

const props = defineProps<{ theme: string }>()
const emit = defineEmits(['startGame', 'openSettings', 'openLeaderboard'])

const game = useGameStore()
const page = ref<Page>('MAIN')

function startClassic() {
  game.setGameMode('classic')
  game.initBoard()
  emit('startGame')
}

function startChallenge(level: 1 | 2 | 3) {
  game.setGameMode('challenge')
  game.setChallengeDifficulty(level)
  game.initBoard()
  emit('startGame')
}
</script>

<style scoped>
.start-screen {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background: var(--bg);
  color: var(--text-color);
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out;
}

.start-screen,
.start-screen * {
  color: var(--text-color) !important;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out;
}

.background-animation {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: linear-gradient(rgba(186, 0, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(186, 0, 255, 0.05) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: moveGrid 20s linear infinite;
  pointer-events: none;
}

@keyframes moveGrid {
  0% { transform: translateY(0); }
  100% { transform: translateY(50px); }
}

.content {
  text-align: center;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mode-tip {
  font-size: 1rem;
  margin-bottom: 1rem;
  color: var(--text-muted);
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  max-width: 320px;
}

.menu-btn {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  color: var(--text-color) !important;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  cursor: pointer;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, transform 0.25s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.menu-btn:hover {
  transform: translateY(-3px);
  background: rgba(255, 255, 255, 0.18);
}

.menu-btn.secondary {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
}

.menu-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

.title {
  display: flex;
  flex-direction: column;
  font-size: 4.5rem;
  font-weight: 900;
  margin-bottom: 2.5rem;
  line-height: 1;
  letter-spacing: 0.2rem;
  text-shadow:
    0 0 10px #00f2ff,
    0 0 20px #00f2ff,
    0 0 40px #bc00ff,
    0 0 80px #bc00ff;
}

@media (max-width: 600px) {
  .title { font-size: 3rem; }
  .menu { max-width: 85%; }
}
</style>
