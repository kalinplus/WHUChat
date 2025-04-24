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
  // 主题设置
  const theme = ref(localStorage.getItem('theme') || 'system')
  
  // 模型配置
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

  const setTheme = (newTheme: string) => {
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

  const applyTheme = () => {
    const effectiveTheme = theme.value === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme.value
    document.documentElement.setAttribute('data-theme', effectiveTheme)
  }

  // 初始化
  applyTheme()

  return { 
    theme, 
    modelConfigs,
    setTheme,
    addModelConfig,
    updateModelConfig,
    setDefaultModel
  }
})
