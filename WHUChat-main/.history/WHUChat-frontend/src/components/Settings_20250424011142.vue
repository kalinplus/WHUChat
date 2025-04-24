<template>
  <div class="settings-container">
    <!-- 返回按钮（顶部固定） -->
    <v-btn
      color="primary"
      variant="text"
      prepend-icon="mdi-arrow-left"
      @click="handleBack"
      class="mb-4"
    >
      返回主页
    </v-btn>
    <v-card>
      <v-layout>
        <!-- 左侧导航栏 -->
        <v-navigation-drawer
          permanent
          width="280"
          class="left-sidebar"
        >
          <!-- 搜索框 -->
          <v-text-field
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            placeholder="搜索设置项..."
            variant="outlined"
            density="compact"
            class="ma-3"
            hide-details
          />
          <!-- 导航菜单 -->
          <v-list density="compact" nav>
            <v-list-item
              v-for="item in filteredMenuItems"
              :key="item.value"
              :value="item"
              active-color="primary"
              :active="activeTab === item.value"
              @click="activeTab = item.value"
            >
              <template v-slot:prepend>
                <v-icon :icon="item.icon" />
              </template>
              <v-list-item-title>{{ item.title }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-navigation-drawer>
        <!-- 右侧内容区 -->
        <v-main class="right-panel">
          <v-window v-model="activeTab">
            <!-- 外观设置 -->
            <v-window-item value="appearance">
              <v-card flat>
                <v-card-text>
                  <v-select
                    label="主题模式"
                    :items="['light', 'dark', 'system']"
                    v-model="theme"
                  />
                </v-card-text>
              </v-card>
            </v-window-item>
            <!-- 模型配置 -->
            <v-window-item value="models">
              <v-card flat>
                <v-card-title class="d-flex justify-space-between">
                  <span>模型API配置</span>
                  <v-btn 
                    color="primary"
                    @click="addNewModel"
                    prepend-icon="mdi-plus"
                  >
                    添加模型
                  </v-btn>
                </v-card-title>
                <v-card-text>
                  <v-expansion-panels>
                    <v-expansion-panel
                      v-for="(model, index) in modelConfigs"
                      :key="index"
                    >
                      <v-expansion-panel-title>
                        <div class="d-flex align-center">
                          <v-chip 
                            v-if="model.isDefault"
                            color="primary"
                            size="small"
                            class="mr-2"
                          >
                            默认
                          </v-chip>
                          {{ model.name }}
                        </div>
                      </v-expansion-panel-title>
                      <v-expansion-panel-text>
                        <v-text-field
                          v-model="model.name"
                          label="模型名称"
                          class="mb-3"
                          @update:modelValue="saveModel(index)"
                        />
                        <v-text-field
                          v-model="model.apiKey"
                          label="API Key"
                          :type="showApiKey ? 'text' : 'password'"
                          :append-inner-icon="showApiKey ? 'mdi-eye-off' : 'mdi-eye'"
                          @click:append-inner="showApiKey = !showApiKey"
                          class="mb-3"
                          @update:modelValue="saveModel(index)"
                        />
                        <v-text-field
                          v-model="model.baseUrl"
                          label="API Base URL"
                          class="mb-3"
                          @update:modelValue="saveModel(index)"
                        />
                        <div class="d-flex justify-space-between">
                          <v-btn
                            color="error"
                            variant="text"
                            @click="removeModel(index)"
                          >
                            删除
                          </v-btn>
                          <v-btn
                            color="primary"
                            variant="text"
                            @click="setAsDefault(index)"
                            :disabled="model.isDefault"
                          >
                            设为默认
                          </v-btn>
                        </div>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </v-card-text>
              </v-card>
            </v-window-item>
            <!-- 新增的数据设置面板 -->
            <v-window-item value="data">
              <v-card flat>
                <v-card-title>数据设置</v-card-title>
                <v-card-text>
                  <!-- 这里可以添加数据备份/恢复等功能 -->
                </v-card-text>
              </v-card>
            </v-window-item>
          </v-window>
        </v-main>
      </v-layout>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useRouter } from 'vue-router'

const settingsStore = useSettingsStore()
const router = useRouter()
// 导航控制
const activeTab = ref('appearance')
const searchQuery = ref('')
const showApiKey = ref(false)

// 菜单项
const menuItems = [
  {
    title: '外观设置',
    icon: 'mdi-palette',
    value: 'appearance'
  },
  {
    title: '模型配置',
    icon: 'mdi-robot',
    value: 'models'
  },
  {
    title: '数据设置',
    icon: 'mdi-database',
    value: 'data'
  }
]
// 过滤菜单项
const filteredMenuItems = computed(() => {
  return menuItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.value.toLowerCase()))
})
// 返回逻辑
const handleBack = () => {
  if (window.history.state.back) {
    router.go(-1)
  } else {
    router.push('/')
  }
}
// 外观设置
const theme = computed({
  get: () => settingsStore.theme,
  set: (val) => settingsStore.setTheme(val)
})
// 模型配置
const modelConfigs = computed({
  get: () => settingsStore.modelConfigs,
  set: (val) => {}
})
const addNewModel = () => {
  settingsStore.addModelConfig({
    name: '新模型',
    apiKey: '',
    baseUrl: 'https://api.example.com/v1',
    isDefault: false
  })
}
const saveModel = (index: number) => {
  settingsStore.updateModelConfig(index, modelConfigs.value[index])
}
const removeModel = (index: number) => {
  if (modelConfigs.value[index].isDefault) {
    alert('不能删除默认模型，请先设置其他模型为默认')
    return
  }
  settingsStore.removeModelConfig(index)
}
const setAsDefault = (index: number) => {
  settingsStore.setDefaultModel(index)
}
</script>
<style scoped>
.settings-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
.left-sidebar {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  height: calc(100vh - 180px);
}
.right-panel {
  padding: 24px;
  height: calc(100vh - 180px);
  overflow-y: auto;
}
</style>