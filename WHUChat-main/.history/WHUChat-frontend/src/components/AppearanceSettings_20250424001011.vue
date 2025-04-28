<template>
    <div>
      <v-card-title class="text-h6">{{ $t('settings.appearance') }}</v-card-title>
      
      <v-list>
        <v-list-item>
          <template #prepend>
            <v-icon>mdi-palette</v-icon>
          </template>
          
          <v-list-item-title>{{ $t('settings.theme') }}</v-list-item-title>
          
          <template #append>
            <v-btn-toggle
              v-model="theme"
              mandatory
              @update:model-value="updateTheme"
            >
              <v-btn value="light">{{ $t('settings.light') }}</v-btn>
              <v-btn value="dark">{{ $t('settings.dark') }}</v-btn>
              <v-btn value="system">{{ $t('settings.system') }}</v-btn>
            </v-btn-toggle>
          </template>
        </v-list-item>
        
        <v-list-item>
          <template #prepend>
            <v-icon>mdi-font-family</v-icon>
          </template>
          
          <v-list-item-title>{{ $t('settings.fontSize') }}</v-list-item-title>
          
          <template #append>
            <v-slider
              v-model="fontSize"
              min="12"
              max="24"
              step="1"
              thumb-label
              @update:model-value="updateFontSize"
            />
          </template>
        </v-list-item>
      </v-list>
    </div>
  </template>
  
  <script setup lang="ts">
  import { useThemeStore } from '@/stores/settings'
  
  const themeStore = useThemeStore()
  const theme = ref(themeStore.theme)
  const fontSize = ref(themeStore.fontSize)
  
  const updateTheme = (val: string) => {
    themeStore.setTheme(val)
  }
  
  const updateFontSize = (val: number) => {
    themeStore.setFontSize(val)
  }
  </script>
  