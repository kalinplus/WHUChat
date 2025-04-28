import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'

type ThemeMode = 'light' | 'dark' | 'system'
type LanguageCode = 'zh' | 'en'

interface LanguageOption {
  code: LanguageCode
  name: string
}

// 默认模型参数，可根据需要扩展
interface ModelParameters {
  temperature: number
  maxTokens: number
}

interface ModelConfig {
  name: string
  apiKey: string
  baseUrl: string
  isDefault: boolean
  parameters: ModelParameters
}

export const useSettingsStore = defineStore('settings', () => {
  const vuetifyTheme = useTheme()
  
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

  // 默认参数
  const defaultParameters: ModelParameters = {
    temperature: 1,
    maxTokens: 2048
  }

  const modelConfigs = ref<ModelConfig[]>([
    {
      name: 'GPT-4',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      isDefault: true,
      parameters: { ...defaultParameters }
    },
    {
      name: 'Claude',
      apiKey: '',
      baseUrl: 'https://api.anthropic.com/v1',
      isDefault: false,
      parameters: { ...defaultParameters }
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
    
    vuetifyTheme.global.name.value = effectiveTheme
    document.documentElement.setAttribute('data-theme', effectiveTheme)
  }

  const updateLanguage = (newLang: LanguageCode) => {
    language.value = newLang
    locale.value = newLang
    localStorage.setItem('language', newLang)
  }

  const setTheme = (newTheme: ThemeMode) => {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    applyTheme()
  }

  const addModelConfig = (config: Omit<ModelConfig, 'isDefault' | 'parameters'>) => {
    modelConfigs.value.push({
      ...config,
      isDefault: false,
      parameters: { ...defaultParameters }
    })
  }

  const updateModelConfig = (index: number, config: Partial<ModelConfig>) => {
    const existing = modelConfigs.value[index]
    modelConfigs.value[index] = {
      ...existing,
      ...config,
      parameters: {
        ...defaultParameters,
        ...existing.parameters,
        ...(config.parameters || {})
      }
    }
  }

  const setDefaultModel = (index: number) => {
    modelConfigs.value.forEach((m, i) => {
      m.isDefault = i === index
    })
  }

  // ==================== 初始化 ====================
  systemThemeQuery.addEventListener('change', handleSystemThemeChange)
  applyTheme() // 初始化应用主题
  locale.value = language.value

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
