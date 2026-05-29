import { createRouter, createWebHistory } from 'vue-router'
import StartScreen from '../views/StartScreen.vue'
import GameView from '../views/GameView.vue'
import HighScores from '../views/HighScores.vue'
import SettingsView from '../views/SettingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'start',
      component: StartScreen,
    },
    {
      path: '/game',
      name: 'game',
      component: GameView,
    },
    {
      path: '/highscores',
      name: 'highscores',
      component: HighScores,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
    },
  ],
})

export default router
