<template>
  <div class="settings-container">
    <!-- 返回按钮 -->
    <v-btn
      color="primary"
      variant="text"
      prepend-icon="mdi-arrow-left"
      @click="handleBack"
      class="back-button"
    >
      返回主页
    </v-btn>

    <div class="settings-content">
      <!-- 左侧导航栏 -->
      <div class="sidebar-wrapper">
        <v-navigation-drawer permanent width="280" class="left-sidebar">
          <v-text-field
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            placeholder="搜索设置项..."
            variant="outlined"
            density="compact"
            class="ma-3"
            hide-details
          />
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
      </div>

      <!-- 右侧内容区 -->
      <div class="main-content">
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
          
          <!-- 数据设置 -->
          <v-window-item value="data">
            <v-card flat>
              <v-card-title>数据设置</v-card-title>
              <v-card-text>
                <v-btn color="primary" class="mr-4">
                  <v-icon start>mdi-cloud-download</v-icon>
                  备份数据
                </v-btn>
                <v-btn color="secondary">
                  <v-icon start>mdi-cloud-upload</v-icon>
                  恢复数据
                </v-btn>
              </v-card-text>
            </v-card>
          </v-window-item>
        </v-window>
      </div>
    </div>
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
  { title: '外观设置', icon: 'mdi-palette', value: 'appearance' },
  { title: '模型配置', icon: 'mdi-robot', value: 'models' },
  { title: '数据设置', icon: 'mdi-database', value: 'data' }
]

// 过滤菜单项
const filteredMenuItems = computed(() => {
  return menuItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

// 返回逻辑
const handleBack = () => {
  router.push('/')
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
    baseUrl: 'https://api.openai.com/v1',
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
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background-color: #f5f5f5;
}

.back-button {
  margin: 16px;
  align-self: flex-start;
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: white;
}

.settings-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100% - 64px);
}

.sidebar-wrapper {
  flex: 0 0 280px;
  height: 100%;
  overflow-y: auto;
  background-color: white;
  border-right: 1px solid #e0e0e0;
}

.main-content {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  background-color: white;
}

.left-sidebar {
  height: 100%;
}

/* 响应式设计 */
@media (max-width: 960px) {
  .settings-content {
    flex-direction: column;
  }
  
  .sidebar-wrapper {
    width: 100%;
    flex: 0 0 auto;
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .main-content {
    padding: 16px;
  }
}

/* 滚动条美化 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-track {
  background: transparent;
}
</style>
