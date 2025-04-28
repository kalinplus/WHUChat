import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

type ThemeMode = 'light' | 'dark' | 'system'
type LanguageCode = 'zh' | 'en'

interface LanguageOption {
  code: LanguageCode
  name: string
}

interface ModelConfig {
  name: string
  apiKey: string
  baseUrl: string
  isDefault: boolean
}

export const useSettingsStore = defineStore('settings', () => {
  // ==================== 状态定义 ====================
  const theme = ref<ThemeMode>((localStorage.getItem('theme') as ThemeMode) || 'system')
  const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  const { locale } = useI18n({ useScope: 'global' })
  const languageOptions: LanguageOption[] = [
    { code: 'zh', name: '中文' },
    { code: 'en', name: 'English' }
  ]
  const language = ref<LanguageCode>(
    (localStorage.getItem('language') as LanguageCode) || 'en'
  )

  const modelConfigs = ref<ModelConfig[]>([
    {
      name: 'GPT-4',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      isDefault: true
    },
    {
      name: 'Claude',
      apiKey: '',
      baseUrl: 'https://api.anthropic.com/v1',
      isDefault: false
    }
  ])

  // ==================== 方法定义 ====================
  const handleSystemThemeChange = (e: MediaQueryListEvent) => {
    if (theme.value === 'system') {
      applyTheme()
    }
  }

  const applyTheme = () => {
    const effectiveTheme = theme.value === 'system'
      ? (systemThemeQuery.matches ? 'dark' : 'light')
      : theme.value
    document.documentElement.setAttribute('data-theme', effectiveTheme)
  }

  const updateLanguage = (newLang: LanguageCode) => {
    language.value = newLang
    locale.value = newLang
    localStorage.setItem('language', newLang)
  }

  const setTheme = (newTheme: ThemeMode) => {
    console.log('Setting theme to:', newTheme) // 调试日志
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    applyTheme()
  }
  

  const addModelConfig = (config: Omit<ModelConfig, 'isDefault'>) => {
    modelConfigs.value.push({ ...config, isDefault: false })
  }

  const updateModelConfig = (index: number, config: Partial<ModelConfig>) => {
    modelConfigs.value[index] = { ...modelConfigs.value[index], ...config }
  }

  const setDefaultModel = (index: number) => {
    modelConfigs.value.forEach((m, i) => {
      m.isDefault = i === index
    })
  }

  // ==================== 初始化 ====================
  systemThemeQuery.addEventListener('change', handleSystemThemeChange)
  applyTheme()
  locale.value = language.value

  // 自动响应语言变化
  watch(language, (newVal) => {
    locale.value = newVal
  })

  return {
    // 状态
    theme,
    language,
    languageOptions,
    modelConfigs,
    
    // 方法
    setTheme,
    updateLanguage,
    addModelConfig,
    updateModelConfig,
    setDefaultModel
  }
})
