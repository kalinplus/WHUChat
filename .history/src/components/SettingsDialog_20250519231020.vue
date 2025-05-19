<template>
  <v-dialog
    :model-value="modelValue"
    @update:modelValue="(val) => emit('update:modelValue', val)"
    max-width="600"
  >
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t("settings.title") }}</span>
        <v-btn icon @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="pa-4">
        <v-list lines="two">
          <!-- 模型设置 -->
          <v-list-item>
            <template #prepend>
              <v-icon>mdi-robot</v-icon>
            </template>
            <v-list-item-title>{{ $t("settings.models") }}</v-list-item-title>
            <v-list-item-subtitle>
              <v-select
                v-model="selectedModel"
                :items="availableModels"
                item-title="name"
                item-value="id"
                @update:modelValue="updateModel"
                :loading="loadingModels"
                return-object
              >
                <template v-slot:selection="{ item }">
                  <div class="d-flex align-center">
                    <v-avatar size="24" class="mr-2" v-if="item.raw.logo">
                      <v-img :src="item.raw.logo" alt="Model logo"></v-img>
                    </v-avatar>
                    <span>{{ item.raw.name }}</span>
                  </div>
                </template>
                <template v-slot:item="{ item }">
                  <div class="d-flex align-center">
                    <v-avatar size="24" class="mr-2" v-if="item.raw.logo">
                      <v-img :src="item.raw.logo" alt="Model logo"></v-img>
                    </v-avatar>
                    <div>
                      <div>{{ item.raw.name }}</div>
                      <div class="text-caption text-grey">{{ item.raw.description }}</div>
                    </div>
                  </div>
                </template>
              </v-select>
            </v-list-item-subtitle>
          </v-list-item>
          
          <!-- 模型特定API设置 -->
          <v-list-item v-if="selectedModel">
            <template #prepend>
              <v-icon>mdi-key</v-icon>
            </template>
            <v-list-item-title>{{ selectedModel.name }} {{ $t("settings.api") }}</v-list-item-title>
            <v-list-item-subtitle>
              <v-text-field
                v-model="modelApiKey"
                :label="$t('settings.apiKey')"
                type="password"
                hide-details
                class="mb-3"
              ></v-text-field>
              
              <v-text-field
                v-model="modelCustomUrl"
                :label="$t('settings.customUrl')"
                hint="可选，用于自定义API端点"
                hide-details
              ></v-text-field>
            </v-list-item-subtitle>
          </v-list-item>

          <!-- 全局API设置 -->
          <v-list-item>
            <template #prepend>
              <v-icon>mdi-key-chain</v-icon>
            </template>
            <v-list-item-title>{{ $t("settings.globalApi") }}</v-list-item-title>
            <v-list-item-subtitle>
              <v-text-field
                v-model="globalApiKey"
                :label="$t('settings.defaultApiKey')"
                type="password"
                hint="所有未设置特定API Key的模型将使用此密钥"
                hide-details
              ></v-text-field>
            </v-list-item-subtitle>
          </v-list-item>

          <!-- 主题设置 -->
          <v-list-item>
            <template #prepend>
              <v-icon>mdi-palette</v-icon>
            </template>
            <v-list-item-title>{{ t("settings.theme") }}</v-list-item-title>
            <v-list-item-subtitle>
              <v-btn-toggle
                v-model="selectedTheme"
                mandatory
                @update:modelValue="updateTheme"
              >
                <v-btn value="light">{{ t("settings.lightMode") }}</v-btn>
                <v-btn value="dark">{{ t("settings.darkMode") }}</v-btn>
                <v-btn value="system">{{ t("settings.followSystem") }}</v-btn>
              </v-btn-toggle>
            </v-list-item-subtitle>
          </v-list-item>

          <!-- 语言切换 -->
          <v-list-item>
            <template #prepend>
              <v-icon>mdi-translate</v-icon>
            </template>
            <v-list-item-title>{{ $t("settings.language") }}</v-list-item-title>
            <v-list-item-subtitle>
              <v-select
                v-model="selectedLanguage"
                :items="languageOptions"
                item-title="name"
                item-value="code"
                @update:modelValue="updateLanguage"
              ></v-select>
            </v-list-item-subtitle>
          </v-list-item>
          
          <!-- 聊天设置 -->
          <v-list-item>
            <template #prepend>
              <v-icon>mdi-chat-settings</v-icon>
            </template>
            <v-list-item-title>{{ $t("settings.chatSettings") }}</v-list-item-title>
            <v-list-item-subtitle>
              <v-checkbox
                v-model="enableWebSearch"
                :label="$t('settings.enableWebSearch')"
                density="comfortable"
                hide-details
                @update:modelValue="updateChatSettings"
              ></v-checkbox>
              <v-checkbox
                v-model="frugalMode"
                :label="$t('settings.frugalMode')"
                density="comfortable"
                hide-details
                @update:modelValue="updateChatSettings"
              ></v-checkbox>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
      
      <!-- 添加保存按钮 -->
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="saveSettings">
          {{ t("settings.saveAndClose") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useThemeManager } from "@/stores/settings";
import { useLanguageManager } from "@/stores/settings";
import { useStateStore } from "@/stores/states";
import { useI18n } from "vue-i18n";
import { useAuthFetch } from "@/composables/fetch";
import type { ModelConfig } from "@/stores/states";

const { t } = useI18n();
const stateStore = useStateStore();
defineProps(["modelValue"]);
const emit = defineEmits(["update:modelValue"]);
const closeDialog = () => {
  emit("update:modelValue", false);
};
defineExpose({ closeDialog });

// 语言切换逻辑
const { selectedLanguage, updateLanguage, languageOptions } = useLanguageManager();

// 主题切换逻辑
const { selectedTheme, updateTheme } = useThemeManager();

// 模型相关状态
const availableModels = ref([
  {
    id: "gpt-4",
    name: "GPT-4",
    description: "OpenAI GPT-4",
    logo: "/models/openai.png",
    model_id: "gpt-4",
    model_class: "openai",
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    description: "OpenAI GPT-3.5 Turbo",
    logo: "/models/openai.png",
    model_id: "gpt-3.5-turbo",
    model_class: "openai",
  },
  {
    id: "claude-3",
    name: "Claude 3",
    description: "Anthropic Claude 3",
    logo: "/models/anthropic.png",
    model_id: "claude-3",
    model_class: "anthropic",
  },
]);
const selectedModel = ref(stateStore.currentModel);
const loadingModels = ref(false);

// API 相关状态
const globalApiKey = ref(stateStore.apiKey || '');
const modelApiKey = ref('');
const modelCustomUrl = ref('');

// 聊天设置
const enableWebSearch = ref(true);
const frugalMode = ref(true);

// 获取模型列表
const fetchModels = async () => {
  loadingModels.value = true;
  try {
    const { data, error } = await useAuthFetch('/api/v1/models', {
      method: 'GET',
      params: {
        uuid: stateStore.user?.id || 1
      }
    });
    
    if (!error.value && data.value) {
      if (Array.isArray(data.value)) {
        // 确保每个模型对象都符合 ModelConfig 接口要求
        const validatedModels = data.value.map(model => ({
          id: model.id || '',
          name: model.name || 'Unknown Model',
          description: model.description || '',
          logo: model.logo || '/models/default.png',
          model_id: model.model_id || model.id || '',
          model_class: model.model_class || 'unknown',
          api_key: '',  // 默认为空，后面会从存储中加载
          custom_url: '' // 默认为空，后面会从存储中加载
        }));
        
        availableModels.value = validatedModels;
      } else {
        console.error('Unexpected response format: models is not an array', data.value);
      }
    } else {
      console.error('Failed to fetch models:', error.value);
      // 在出错时保留现有模型列表，不清空
    }
  } catch (err) {
    console.error('Error fetching models:', err);
  } finally {
    loadingModels.value = false;
  }
};

// 处理模型选择变化
watch(selectedModel, (newModel) => {
  if (newModel) {
    // 当选择模型变化时，更新API键字段
    const modelConfig = stateStore.modelConfigs[newModel.id];
    if (modelConfig) {
      modelApiKey.value = modelConfig.api_key || '';
      modelCustomUrl.value = modelConfig.custom_url || '';
    } else {
      modelApiKey.value = '';
      modelCustomUrl.value = '';
    }
  }
});

// 更新模型
const updateModel = (model) => {
  selectedModel.value = model;
};

// 保存设置
const saveSettings = () => {
  // 保存当前选中的模型
  if (selectedModel.value) {
    stateStore.setCurrentModel({
      ...selectedModel.value,
      api_key: modelApiKey.value,
      custom_url: modelCustomUrl.value
    });
    
    // 保存该模型的API Key
    stateStore.setApiKey(modelApiKey.value, selectedModel.value.id);
    
    // 保存该模型的自定义URL
    stateStore.setModelCustomUrl(modelCustomUrl.value, selectedModel.value.id);
  }
  
  // 保存全局API Key
  stateStore.setApiKey(globalApiKey.value);
  
  // 保存聊天设置
  updateChatSettings();
  
  // 关闭对话框
  closeDialog();
};

// 更新聊天设置
const updateChatSettings = () => {
  // 保存设置到localStorage或其他存储
  localStorage.setItem('chatSettings', JSON.stringify({
    enableWebSearch: enableWebSearch.value,
    frugalMode: frugalMode.value
  }));
};

// 初始化组件
onMounted(() => {
  // 加载存储的模型配置
  stateStore.loadModelConfigs();
  
  // 初始化当前选中模型的API Key和自定义URL
  if (selectedModel.value) {
    const modelConfig = stateStore.modelConfigs[selectedModel.value.id];
    if (modelConfig) {
      modelApiKey.value = modelConfig.api_key || '';
      modelCustomUrl.value = modelConfig.custom_url || '';
    }
  }
  
  // 加载保存的聊天设置
  const savedSettings = localStorage.getItem('chatSettings');
  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    enableWebSearch.value = settings.enableWebSearch ?? true;
    frugalMode.value = settings.frugalMode ?? true;
  }
  
  // 获取可用模型列表
  // fetchModels();
});
</script>