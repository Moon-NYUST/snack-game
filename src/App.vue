<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGameStore } from './stores/game';
import StartScreen from './components/StartScreen.vue';
import SnakeGame from './components/SnakeGame.vue';
import SettingsView from './views/SettingsView.vue';
import HighScores from './views/HighScores.vue';

const game = useGameStore();

const activeTheme = computed(() => game.currentTheme)
const themeClasses = ['theme-neon', 'theme-arcade', 'theme-tech', 'theme-rainforest']

watch(activeTheme, (newTheme) => {
  const root = document.getElementById('app')
  if (!root) return
  root.classList.remove(...themeClasses)
  root.classList.add(newTheme)
})

type Screen = 'START' | 'PLAYING' | 'SETTINGS' | 'LEADERBOARD';
const currentScreen = ref<Screen>('START');

/** 是否從遊戲暫停選單進入設定 */
const settingsFromGame = ref(false);

const snakeGameRef = ref<InstanceType<typeof SnakeGame> | null>(null);

const handleSaveTheme = (newTheme: string) => {
  game.setTheme(newTheme)
};

const goToStart = () => {
  settingsFromGame.value = false;
  currentScreen.value = 'START';
  game.stopGame();
  game.initBoard();
};

const handleStartGame = () => {
  currentScreen.value = 'PLAYING';
};


const openSettingsFromLobby = () => {
  settingsFromGame.value = false;
  currentScreen.value = 'SETTINGS';
};

const openSettingsFromGame = () => {
  game.ensurePaused();
  settingsFromGame.value = true;
  currentScreen.value = 'SETTINGS';
};

const handleSettingsToPause = () => {
  settingsFromGame.value = false;
  currentScreen.value = 'PLAYING';
  game.ensurePaused();
  snakeGameRef.value?.reloadSettings?.();
};

const handleSettingsToLobby = () => {
  settingsFromGame.value = false;
  currentScreen.value = 'START';
};
</script>

<template>
  <div id="app" :class="activeTheme">
    <div class="app-container">
      <div class="game-wrapper">
        <SnakeGame
          ref="snakeGameRef"
          :show-game-content="currentScreen === 'PLAYING'"
          @back-to-menu="goToStart"
          @open-settings="openSettingsFromGame"
        />
        <button v-if="currentScreen === 'PLAYING'" class="back-btn" @click="goToStart">返回</button>
      </div>

      <Transition name="fade" mode="out-in">
        <StartScreen
          v-if="currentScreen === 'START'"
          key="start"
          :theme="activeTheme"
          @startGame="handleStartGame"
          @openSettings="openSettingsFromLobby"
          @openLeaderboard="currentScreen = 'LEADERBOARD'"
        />

        <div v-else-if="currentScreen === 'SETTINGS'" key="settings" class="sub-screen">
          <SettingsView
            :theme="activeTheme"
            :is-from-game="settingsFromGame"
            @saveTheme="handleSaveTheme"
            @goToStart="handleSettingsToLobby"
            @back-to-pause="handleSettingsToPause"
          />
        </div>

        <div v-else-if="currentScreen === 'LEADERBOARD'" key="leaderboard" class="sub-screen">
          <HighScores @goToStart="currentScreen = 'START'" />
        </div>
      </Transition>
    </div>
  </div>
</template>

<style>
/* 核心變數系統 */
#app {
  width: 100vw; height: 100vh; transition: all 0.5s ease;
}

/* --- 主題風格規範 --- */
/* Neon */
.theme-neon {
  --bg-color: #0d1117;
  --bg: var(--bg-color);
  --text: #00f0ff;
  --text-color: #00f0ff;
  --text-muted: #8b949e;
  --accent: #00f0ff;
  --panel: rgba(255,255,255,0.05);
}
/* Arcade / Retro */
.theme-arcade {
  --bg-color: #2c3e50;
  --bg: var(--bg-color);
  --text: #f1c40f;
  --text-color: #f1c40f;
  --text-muted: #bdc3c7;
  --accent: #f1c40f;
  --panel: rgba(255,255,255,0.08);
  font-family: 'Courier New', monospace;
}
/* Tech / Cyber */
.theme-tech {
  --bg-color: #200b2e;
  --bg: var(--bg-color);
  --text: #ff007f;
  --text-color: #ff007f;
  --text-muted: #00f0ff;
  --accent: #ff007f;
  --panel: rgba(255,255,255,0.08);
}
/* Rainforest / Forest */
.theme-rainforest {
  --bg-color: #1b4332;
  --bg: var(--bg-color);
  --text: #ffffff;
  --text-color: #ffffff;
  --text-muted: #a7f3d0;
  --accent: #4ade80;
  --panel: rgba(255,255,255,0.08);
}

body { margin: 0; background: var(--bg, #000); color: var(--text-color, #fff); transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out; }
#app { width: 100vw; height: 100vh; transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out; }
.app-container { width: 100vw; height: 100vh; }
.game-wrapper, .sub-screen, .settings-card {
  background: var(--panel);
  border: 1px solid var(--accent);
  color: var(--text-color);
}
.back-btn { border: 2px solid var(--accent); color: var(--text-color); }


/* 讓所有子組件通用這些變數 */
.game-wrapper, .sub-screen, .settings-card {
  background: var(--panel);
  border: 1px solid var(--accent);
  color: var(--text);
}
.back-btn { border: 2px solid var(--accent); color: var(--accent); }
</style>
