<template>
  <div class="settings-container">
    <v-tabs v-model="tab" grow>
      <v-tab value="appearance">外观设置</v-tab>
      <v-tab value="models">模型配置</v-tab>
    </v-tabs>

    <v-window v-model="tab">
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
                    type="password"
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
    </v-window>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()
const tab = ref('appearance')

// 外观设置
const theme = computed({
  get: () => settingsStore.theme,
  set: (val) => settingsStore.setTheme(val)
})

// 模型配置
const modelConfigs = computed({
  get: () => settingsStore.modelConfigs,
  set: (val) => {} // 通过单独方法更新
})

const addNewModel = () => {
  settingsStore.addModelConfig({
    name: '新模型',
    apiKey: '',
    baseUrl: 'https://api.example.com/v1'
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
  modelConfigs.value.splice(index, 1)
}

const setAsDefault = (index: number) => {
  settingsStore.setDefaultModel(index)
}
</script>

<style scoped>
.settings-container {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}
</style>
