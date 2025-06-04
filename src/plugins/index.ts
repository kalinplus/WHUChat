/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

// Plugins
import vuetify from './vuetify'
import router from '../router'
import { createI18n } from 'vue-i18n'
import enMessages from '../locales/en.json'
import zhMessages from '../locales/zh.json'

// Types
import type { App } from 'vue'

// Create i18n instance
const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('languagePreference') || 'zh',
  fallbackLocale: 'en',
  messages: {
    en: enMessages,
    zh: zhMessages,
  },
})

export function registerPlugins (app: App) {
  app
    .use(vuetify)
    .use(router)
    .use(i18n)
}

export { i18n }
