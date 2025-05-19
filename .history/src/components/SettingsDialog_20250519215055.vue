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
          
          <!-- API 设置 (可选) -->
          <v-list-item v-if="showApiOptions">
            <template #prepend>
              <v-icon>mdi-key</v-icon>
            </template>
            <v-list-item-title>{{ $t("settings.api") }}</v-list-item-title>
            <v-list-item-subtitle>
              <v-text-field
                v-model="apiKey"
                :label="$t('settings.apiKey')"
                type="password"
                hide-details
                @update:modelValue="updateApiKey"
              ></v-text-field>
            </v-list-item-subtitle>
          </v-list-item>

          <!-- 主题设置 -->
          <v-list-item>
            <template #prepend>
              <v-icon>mdi-palette</v-icon>
            </template>
            <v-list-item-title>{{ $t("settings.theme") }}</v-list-item-title>
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
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useThemeManager } from "@/stores/settings";
import { useLanguageManager } from "@/stores/settings";
import { useStateStore } from "@/stores/states";
import { useI18n } from "vue-i18n";
import { useAuthFetch } from "@/composables/fetch";

const { t } = useI18n();
const stateStore = useStateStore();
defineProps(["modelValue"]);
const emit = defineEmits(["update:modelValue"]);
const closeDialog = () => {
  emit("update:modelValue", false); // 与 v-model 配合使用
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

// 定义模型类型
interface Model {
  id: string;
  name: string;
  description: string;
  logo: string;
  model_id: string;
  model_class: string;
}

// API 相关状态
const apiKey = ref(stateStore.apiKey || '');
const showApiOptions = ref(true);

// 聊天设置
const enableWebSearch = ref(true);
const frugalMode = ref(true);

// 获取模型列表
const fetchModels = async () => {
  loadingModels.value = true;
  try {
    const { data, error } = await useAuthFetch<Model[]>('/api/v1/models', {
      method: 'GET',
      params: {
        uuid: stateStore.user?.id || 1
      }
    });
    
    if (!error.value && data.value) {
      if (Array.isArray(data.value)) {
        // 确保每个模型对象都符合 Model 接口要求
        const validatedModels: Model[] = data.value.map(model => ({
          id: model.id || '',
          name: model.name || 'Unknown Model',
          description: model.description || '',
          logo: model.logo || '/models/default.png',
          model_id: model.model_id || model.id || '',
          model_class: model.model_class || 'unknown'
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
    // 这里可以添加用户反馈，例如显示一个错误通知
  } finally {
    loadingModels.value = false;
  }
};

const updateModel = (model: Model) => {
  stateStore.setCurrentModel(model);
};

const updateApiKey = (key: string) => {
  stateStore.setApiKey(key);
  localStorage.setItem('apiKey', key);
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