<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { LeaderboardEntry } from '../stores/game'

const STORAGE_KEY = 'snack-game-leaderboard'

function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

const entries = ref(loadLeaderboard().slice(0, 20))
const emit = defineEmits(['goToStart'])
</script>

<template>
  <div class="hs-container">
    <h1 class="hs-title">分數排行</h1>
    <div v-if="entries.length === 0" class="hs-empty">暫無紀錄</div>
    <table v-else class="hs-table">
      <thead>
        <tr>
          <th class="col-rank">#</th>
          <th class="col-name">名稱</th>
          <th class="col-score">分數</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(entry, i) in entries" :key="entry.name">
          <td class="col-rank">
            <span v-if="i === 0" class="medal gold">🥇</span>
            <span v-else-if="i === 1" class="medal silver">🥈</span>
            <span v-else-if="i === 2" class="medal bronze">🥉</span>
            <span v-else>{{ i + 1 }}</span>
          </td>
          <td class="col-name">{{ entry.name }}</td>
          <td class="col-score">{{ entry.score }}</td>
        </tr>
      </tbody>
    </table>
    <button class="back-btn" @click="emit('goToStart')">返回</button>
  </div>
</template>

<style scoped>
.hs-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 40px 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: #fff;
  box-sizing: border-box;
}

.hs-title {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 4px;
  margin: 0 0 32px;
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hs-empty {
  font-size: 16px;
  color: #95a5a6;
  margin-bottom: 32px;
}

.hs-table {
  border-collapse: collapse;
  font-size: 15px;
  width: 360px;
  max-width: 100%;
}

.hs-table th {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 2px solid #34495e;
  color: #95a5a6;
  font-weight: 600;
  letter-spacing: 1px;
}

.hs-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #2c3e50;
  color: #ecf0f1;
}

.col-rank {
  width: 40px;
  text-align: center;
}

.medal {
  font-size: 18px;
}

.col-name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-score {
  text-align: right;
  font-weight: 600;
  width: 80px;
}

.back-btn {
  margin-top: 32px;
  padding: 10px 32px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background: transparent;
  border: 2px solid #2ecc71;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 2px;
}

.back-btn:hover {
  background: #2ecc71;
  color: #1a1a2e;
}
</style>
