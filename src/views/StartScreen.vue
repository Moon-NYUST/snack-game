<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'

const router = useRouter()
const game = useGameStore()
</script>

<template>
  <div class="start-screen">
    <h1 class="title">Snack Game</h1>
    <p class="subtitle" :style="{ color: game.colorPageBg === '#ffffff' || game.colorPageBg === '#efe5d9' ? '#555555' : '#95a5a6' }">經典貪吃蛇</p>
    <div class="menu">
      <button class="menu-btn start-btn" @click="router.push('/game')">
        開始遊戲
      </button>
      <button class="menu-btn" @click="router.push('/highscores')">
        分數排行
      </button>
      <button class="menu-btn" @click="router.push('/settings')">
        設定
      </button>
    </div>
  </div>
</template>

<style scoped>
.start-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: v-bind('game.colorPageBg');
  color: v-bind('game.colorPageBg === "#ffffff" || game.colorPageBg === "#efe5d9" ? "#1a1a2e" : "#ffffff"');
  transition: background-color 0.2s, color 0.2s;
}

.title {
  font-size: 52px;
  font-weight: 800;
  letter-spacing: 4px;
  margin: 0 0 8px;
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  font-size: 18px;
  margin: 0 0 48px;
  letter-spacing: 6px;
  transition: color 0.2s;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 280px;
  padding: 24px;
  border-radius: 12px;
  background-color: v-bind('game.colorPanelBg');
  border: 2px solid #34495e;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  transition: background-color 0.2s;
}

.menu-btn {
  padding: 14px 0;
  font-size: 18px;
  font-weight: 600;
  border: 2px solid #2ecc71;
  border-radius: 8px;
  background: transparent;
  color: v-bind('game.colorPageBg === "#ffffff" || game.colorPageBg === "#efe5d9" ? "#1a1a2e" : "#ffffff"');
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 2px;
}

.menu-btn:not(:disabled):hover {
  background: #2ecc71;
  color: #1a1a2e;
}

.menu-btn:not(:disabled):active {
  transform: scale(0.97);
}

.menu-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #555;
}
</style>
