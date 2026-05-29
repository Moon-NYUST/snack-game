<script setup lang="ts">
import type { LeaderboardEntry } from '../stores/game'

defineProps<{
  entries: LeaderboardEntry[]
}>()
</script>

<template>
  <div class="leaderboard">
    <h3 class="lb-title">排行榜</h3>
    <div v-if="entries.length === 0" class="lb-empty">暫無紀錄</div>
    <table v-else class="lb-table">
      <thead>
        <tr>
          <th class="col-rank">#</th>
          <th class="col-name">名稱</th>
          <th class="col-score">最高紀錄</th>
          <th class="col-change">變動</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(entry, i) in entries.slice(0, 5)" :key="entry.name">
          <td class="col-rank">
            <span v-if="i === 0" class="medal gold">🥇</span>
            <span v-else-if="i === 1" class="medal silver">🥈</span>
            <span v-else-if="i === 2" class="medal bronze">🥉</span>
            <span v-else>{{ i + 1 }}</span>
          </td>
          <td class="col-name">{{ entry.name }}</td>
          <td class="col-score">{{ entry.score }}</td>
          <td class="col-change">
            <span
              v-if="entry.rankChange === null"
              class="change-none"
            >—</span>
            <span
              v-else-if="entry.isLive && entry.rankChange === 0"
              class="change-up"
            >↑</span>
            <span
              v-else-if="entry.rankChange > 0"
              class="change-up"
            >↑{{ entry.rankChange }}</span>
            <span
              v-else-if="entry.rankChange < 0"
              class="change-down"
            >↓{{ -entry.rankChange }}</span>
            <span
              v-else
              class="change-none"
            >—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.leaderboard {
  background: #f8f9fa;
  border: 2px solid #34495e;
  border-radius: 4px;
  padding: 12px;
  min-width: 220px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.lb-title {
  font-size: 16px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px;
  text-align: center;
  letter-spacing: 1px;
}

.lb-empty {
  text-align: center;
  color: #95a5a6;
  font-size: 13px;
  padding: 16px 0;
}

.lb-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.lb-table th {
  text-align: left;
  padding: 4px 6px;
  border-bottom: 1px solid #bdc3c7;
  color: #7f8c8d;
  font-weight: 600;
}

.lb-table td {
  padding: 4px 6px;
  color: #2c3e50;
}

.col-rank {
  width: 28px;
  text-align: center;
}

.medal {
  font-size: 16px;
}

.col-name {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-score {
  text-align: right;
  font-weight: 600;
  width: 60px;
}

.col-change {
  text-align: center;
  width: 40px;
}

.change-up {
  color: #e74c3c;
  font-weight: 700;
}

.change-down {
  color: #27ae60;
  font-weight: 700;
}

.change-none {
  color: #95a5a6;
}
</style>
