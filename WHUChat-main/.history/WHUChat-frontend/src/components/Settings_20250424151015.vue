<template>
  <v-container fluid class="pa-0 settings-container">
    <!-- 顶部导航栏 -->
    <v-app-bar flat>
      <v-btn
        color="primary"
        variant="text"
        prepend-icon="mdi-arrow-left"
        @click="handleBack"
      >
        返回主页
      </v-btn>
      <v-spacer></v-spacer>
    </v-app-bar>

    <!-- 主要内容区域 -->
    <v-main>
      <v-container fluid class="pa-0">
        <v-row no-gutters style="height: 100%;">
          <!-- 左侧导航栏 -->
          <v-col cols="12" md="3" lg="2" class="sidebar-col">
            <v-card flat height="100%" class="rounded">
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
            </v-card>
          </v-col>

          <!-- 右侧内容区 -->
          <v-col cols="12" md="9" lg="10" class="content-col">
            <v-card flat class="h-100 rounded">
              <v-window v-model="activeTab">
                <!-- 外观设置 -->
                <v-window-item value="appearance">
                  <v-card-title>外观设置</v-card-title>
                  <v-card-text>
                    <v-select
                      label="主题模式"
                      :items="['light', 'dark', 'system']"
                      v-model="theme"
                      class="max-width-400"
                    />
                  </v-card-text>
                </v-window-item>
                
                <!-- 模型配置 -->
                <v-window-item value="models">
                  <v-card-title class="d-flex justify-space-between align-center flex-wrap">
                    <span>模型API配置</span>
                    <v-btn 
                      color="primary"
                      @click="addNewModel"
                      prepend-icon="mdi-plus"
                      class="my-2"
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
                        <!-- 在 <v-expansion-panel-text> 内，删除按钮上方添加 -->
                        <div class="model-parameters">
                          <v-select
                            v-model="model.parameters.type"
                            label="响应类型"
                            :items="['conservative', 'balanced', 'creative']"
                            item-title="label"
                            item-value="value"
                            class="mb-3"
                            @update:model-value="saveModel(index)"
                          />
  
                          <v-slider
                            v-model="model.parameters.temperature"
                            label="温度 (temperature)"
                            min="0"
                            max="1"
                            step="0.1"
                            thumb-label="always"
                            class="mb-3"
                            @update:model-value="saveModel(index)"
                          >
                            <template #append>
                              <span class="text-caption">{{ model.parameters.temperature.toFixed(1) }}</span>
                            </template>
                          </v-slider>
                        </div>

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
                          <div class="d-flex justify-space-between flex-wrap">
                            <v-btn
                              color="error"
                              variant="text"
                              @click="removeModel(index)"
                              class="mb-2"
                            >
                              删除
                            </v-btn>
                            <v-btn
                              color="primary"
                              variant="text"
                              @click="setAsDefault(index)"
                              :disabled="model.isDefault"
                              class="mb-2"
                            >
                              设为默认
                            </v-btn>
                          </div>
                        </v-expansion-panel-text>
                      </v-expansion-panel>
                    </v-expansion-panels>
                  </v-card-text>
                </v-window-item>
                
                <!-- 数据设置 -->
                <v-window-item value="data">
                  <v-card-title>数据设置</v-card-title>
                  <v-card-text>
                    <div class="d-flex flex-wrap">
                      <v-btn color="primary" class="mr-4 mb-2">
                        <v-icon start>mdi-cloud-download</v-icon>
                        备份数据
                      </v-btn>
                      <v-btn color="secondary" class="mb-2">
                        <v-icon start>mdi-cloud-upload</v-icon>
                        恢复数据
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-window-item>
              </v-window>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-container>
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

// 在 addNewModel 方法中修改默认配置
const addNewModel = () => {
  settingsStore.addModelConfig({
    name: '新模型',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    isDefault: false,
    parameters: {  // 添加默认参数
      temperature: 0.7,
      type: 'balanced'
    }
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
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.max-width-400 {
  max-width: 400px;
}

.sidebar-col, .content-col {
  height: calc(100vh - 64px); /* 减去顶部导航栏高度 */
  overflow-y: auto;
}

.sidebar-col {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.h-100 {
  height: 100%;
}

.model-parameters {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  padding: 12px;
  margin: 16px 0;
}

.model-parameters .v-slider {
  margin-top: 24px;
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

/* 确保在小屏幕上内容不会挤压 */
@media (max-width: 960px) {
  .sidebar-col, .content-col {
    height: auto;
    min-height: 300px;
  }
}
</style>