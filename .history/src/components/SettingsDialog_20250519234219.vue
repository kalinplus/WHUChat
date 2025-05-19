<script setup lang="ts">
// 首先确保导入了必要的依赖
import { ref, onMounted, computed, watch } from 'vue';
import { useThemeManager } from "@/stores/settings";
import { useLanguageManager } from "@/stores/settings";
import { useStateStore } from "@/stores/states";
import { useI18n } from "vue-i18n";
import { useAuthFetch } from "@/composables/fetch";
import axios from "axios"; // 如果需要使用axios

// 修改模型列表的类型定义，确保与后端返回数据兼容
interface ModelConfig {
  id: string | number;
  name: string;
  description?: string;
  logo?: string;
  model_id: string | number;
  model_class: string;
  api_key?: string;
  custom_url?: string;
  usable?: boolean;
}

// 更新获取模型列表的函数
const fetchModels = async () => {
  loadingModels.value = true;
  try {
    const baseUrl = "https://" + import.meta.env.VITE_API_HOST;
    const url = `${baseUrl}/api/v1/models`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 携带cookie
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error !== undefined && data.error !== 0) {
      throw new Error(`API error: ${data.error}`);
    }
    
    // 处理返回的模型列表数据
    if (Array.isArray(data)) {
      // 将后端返回的模型数据映射为前端需要的格式
      const validatedModels: ModelConfig[] = data.map(model => ({
        id: String(model.id),
        name: model.model || 'Unknown Model', // 后端返回的是model字段
        description: getModelDescription(model.model), // 根据模型名称生成描述
        logo: `/models/${getLogo(model.model)}`, // 根据模型名称获取logo
        model_id: model.id, // 使用id作为model_id，保持原始类型
        model_class: getModelClass(model.model), // 根据模型名称推断class
        usable: model.usable, // 保存可用状态
      }));
      
      console.log("Fetched models:", validatedModels);
      availableModels.value = validatedModels;
      
      // 如果当前没有选择的模型，选择第一个可用的模型
      if (!selectedModel.value && validatedModels.length > 0) {
        const firstUsableModel = validatedModels.find(model => model.usable !== false);
        if (firstUsableModel) {
          handleModelSelect(firstUsableModel);
        }
      }
    } else {
      console.error('Unexpected response format: models is not an array', data);
    }
  } catch (err) {
    console.error('Error fetching models:', err);
    // 显示错误消息给用户
    showSnackbar(err.message || '获取模型列表失败');
  } finally {
    loadingModels.value = false;
  }
};

// 辅助函数：根据模型名称获取logo
function getLogo(modelName: string): string {
  if (!modelName) return 'default.png';
  
  const name = modelName.toLowerCase();
  if (name.includes('gpt')) return 'openai.png';
  if (name.includes('claude')) return 'anthropic.png';
  if (name.includes('gemini')) return 'gemini.png';
  if (name.includes('llama')) return 'llama.png';
  return 'default.png';
}

// 辅助函数：根据模型名称获取模型类
function getModelClass(modelName: string): string {
  if (!modelName) return 'unknown';
  
  const name = modelName.toLowerCase();
  if (name.includes('gpt')) return 'openai';
  if (name.includes('claude')) return 'anthropic';
  if (name.includes('gemini')) return 'google';
  if (name.includes('llama')) return 'meta';
  return 'unknown';
}

// 辅助函数：根据模型名称生成描述
function getModelDescription(modelName: string): string {
  if (!modelName) return '';
  
  const name = modelName.toLowerCase();
  if (name.includes('gpt-4')) return 'OpenAI GPT-4';
  if (name.includes('gpt-3.5')) return 'OpenAI GPT-3.5 Turbo';
  if (name.includes('claude')) return 'Anthropic Claude';
  if (name.includes('gemini')) return 'Google Gemini';
  if (name.includes('llama')) return 'Meta LLaMA';
  return modelName;
}

// 添加一个显示错误消息的函数（如果你没有）
const snackbar = ref(false);
const snackbarText = ref('');
const showSnackbar = (text: string) => {
  snackbarText.value = text;
  snackbar.value = true;
};

// 在onMounted钩子中调用fetchModels函数
onMounted(() => {
  // 其他初始化代码...
  
  // 获取可用模型列表
  fetchModels();
});
</script>

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
        <v-list>
          <!-- 模型设置 -->
          <v-list-item>
            <template #prepend>
              <v-icon>mdi-robot</v-icon>
            </template>
            <v-list-item-title>{{ $t("settings.models") }}</v-list-item-title>
            <v-list-item-subtitle>
              <!-- 这里使用简单的下拉菜单而不是v-select来避免可能的问题 -->
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    variant="outlined"
                    class="mt-2 w-100 d-flex justify-start"
                    :loading="loadingModels"
                  >
                    <div class="d-flex align-center">
                      <v-avatar size="24" class="mr-2" v-if="selectedModel && selectedModel.logo">
                        <v-img :src="selectedModel.logo" alt="Model logo"></v-img>
                      </v-avatar>
                      <span>{{ selectedModel ? selectedModel.name : t("selectModel") }}</span>
                    </div>
                    <v-spacer></v-spacer>
                    <v-icon>mdi-chevron-down</v-icon>
                  </v-btn>
                </template>
                <v-list>
                  <v-list-item
                    v-for="model in availableModels"
                    :key="model.id"
                    @click="model.usable !== false && handleModelSelect(model)"
                    :disabled="model.usable === false"
                    :class="{ 'disabled-model': model.usable === false }"
                  >
                    <template v-slot:prepend>
                      <v-avatar size="24" v-if="model.logo">
                        <v-img :src="model.logo" alt="Model logo"></v-img>
                      </v-avatar>
                    </template>
                    <v-list-item-title>{{ model.name }}</v-list-item-title>
                    <v-list-item-subtitle>{{ model.description }}</v-list-item-subtitle>
                    <v-list-item-subtitle v-if="model.usable === false" class="text-error">
                      不可用
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-menu>

              <!-- 添加Snackbar用于显示错误消息 -->
              <v-snackbar v-model="snackbar" timeout="3000">
                {{ snackbarText }}
                <template v-slot:actions>
                  <v-btn variant="text" @click="snackbar = false">关闭</v-btn>
                </template>
              </v-snackbar>
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
                class="mt-2 mb-3"
                variant="outlined"
              ></v-text-field>
              
              <v-text-field
                v-model="modelCustomUrl"
                :label="$t('settings.customUrl') || 'Custom API URL'"
                hide-details
                variant="outlined"
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
                @update:model-value="updateTheme"
                class="mt-2"
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
                @update:model-value="updateLanguage"
                variant="outlined"
                class="mt-2"
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
                @update:model-value="updateChatSettings"
                class="mt-2"
              ></v-checkbox>
              <v-checkbox
                v-model="frugalMode"
                :label="$t('settings.frugalMode')"
                density="comfortable"
                hide-details
                @update:model-value="updateChatSettings"
              ></v-checkbox>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
      
      <!-- 添加保存按钮 -->
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="saveSettings">
          {{ t("saveAndClose") || "Save & Close" }}
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
import axios from "axios"; // 如果需要使用axios

// 接口定义
interface ModelConfig {
  id: string | number;
  name: string;
  description?: string;
  logo?: string;
  model_id: string | number;
  model_class: string;
  api_key?: string;
  custom_url?: string;
  usable?: boolean;
}

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
const availableModels = ref<ModelConfig[]>([
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

// 初始化选中的模型为当前状态中的模型
const selectedModel = ref<ModelConfig | null>(stateStore.currentModel || null);
const loadingModels = ref(false);

// API 相关状态
const modelApiKey = ref('');
const modelCustomUrl = ref('');

// 聊天设置
const enableWebSearch = ref(true);
const frugalMode = ref(true);

// 处理模型选择
const handleModelSelect = (model: ModelConfig) => {
  selectedModel.value = model;
  
  // 从模型配置中加载API Key
  const modelConfig = stateStore.modelConfigs?.[model.id];
  if (modelConfig) {
    modelApiKey.value = modelConfig.api_key || '';
    modelCustomUrl.value = modelConfig.custom_url || '';
  } else {
    // 如果没有特定配置，使用默认值
    modelApiKey.value = '';
    modelCustomUrl.value = '';
  }
};

// 获取模型列表
const fetchModels = async () => {
  loadingModels.value = true;
  try {
    const baseUrl = "https://" + import.meta.env.VITE_API_HOST;
    const url = `${baseUrl}/api/v1/models`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 携带cookie
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error !== undefined && data.error !== 0) {
      throw new Error(`API error: ${data.error}`);
    }
    
    // 处理返回的模型列表数据
    if (Array.isArray(data)) {
      // 将后端返回的模型数据映射为前端需要的格式
      const validatedModels: ModelConfig[] = data.map(model => ({
        id: String(model.id),
        name: model.model || 'Unknown Model', // 后端返回的是model字段
        description: getModelDescription(model.model), // 根据模型名称生成描述
        logo: `/models/${getLogo(model.model)}`, // 根据模型名称获取logo
        model_id: model.id, // 使用id作为model_id，保持原始类型
        model_class: getModelClass(model.model), // 根据模型名称推断class
        usable: model.usable, // 保存可用状态
      }));
      
      console.log("Fetched models:", validatedModels);
      availableModels.value = validatedModels;
      
      // 如果当前没有选择的模型，选择第一个可用的模型
      if (!selectedModel.value && validatedModels.length > 0) {
        const firstUsableModel = validatedModels.find(model => model.usable !== false);
        if (firstUsableModel) {
          handleModelSelect(firstUsableModel);
        }
      }
    } else {
      console.error('Unexpected response format: models is not an array', data);
    }
  } catch (err) {
    console.error('Error fetching models:', err);
    // 显示错误消息给用户
    showSnackbar(err.message || '获取模型列表失败');
  } finally {
    loadingModels.value = false;
  }
};

// 辅助函数：根据模型名称获取模型类
function getModelClass(modelName: string): string {
  if (!modelName) return 'unknown';
  
  const name = modelName.toLowerCase();
  if (name.includes('gpt')) return 'openai';
  if (name.includes('claude')) return 'anthropic';
  if (name.includes('gemini')) return 'google';
  if (name.includes('llama')) return 'meta';
  return 'unknown';
}

// 辅助函数：根据模型名称生成描述
function getModelDescription(modelName: string): string {
  if (!modelName) return '';
  
  const name = modelName.toLowerCase();
  if (name.includes('gpt-4')) return 'OpenAI GPT-4';
  if (name.includes('gpt-3.5')) return 'OpenAI GPT-3.5 Turbo';
  if (name.includes('claude')) return 'Anthropic Claude';
  if (name.includes('gemini')) return 'Google Gemini';
  if (name.includes('llama')) return 'Meta LLaMA';
  return modelName;
}

// 保存设置
const saveSettings = () => {
  // 保存当前选中的模型
  if (selectedModel.value) {
    // 创建完整的模型配置对象
    const modelConfig: ModelConfig = {
      ...selectedModel.value,
      api_key: modelApiKey.value,
      custom_url: modelCustomUrl.value
    };
    
    // 更新状态中的当前模型
    stateStore.setCurrentModel(modelConfig);
    
    // 保存模型特定的API密钥和URL
    if (!stateStore.modelConfigs) {
      stateStore.modelConfigs = {};
    }
    
    stateStore.modelConfigs[modelConfig.id] = {
      ...modelConfig
    };
    
    // 保存模型配置到localStorage
    localStorage.setItem("modelConfigs", JSON.stringify(stateStore.modelConfigs));
  }
  
  
  // 保存聊天设置
  updateChatSettings();
  
  // 关闭对话框
  closeDialog();
};

// 更新聊天设置
const updateChatSettings = () => {
  localStorage.setItem('chatSettings', JSON.stringify({
    enableWebSearch: enableWebSearch.value,
    frugalMode: frugalMode.value
  }));
};

// 初始化组件
onMounted(() => {
  // 加载模型配置
  const savedConfigs = localStorage.getItem("modelConfigs");
  if (savedConfigs) {
    try {
      stateStore.modelConfigs = JSON.parse(savedConfigs);
      
      // 如果当前有选中的模型，加载它的API密钥和URL
      if (selectedModel.value && stateStore.modelConfigs[selectedModel.value.id]) {
        const config = stateStore.modelConfigs[selectedModel.value.id];
        modelApiKey.value = config.api_key || '';
        modelCustomUrl.value = config.custom_url || '';
      }
    } catch (e) {
      console.error("Error parsing modelConfigs:", e);
      stateStore.modelConfigs = {};
    }
  } else {
    stateStore.modelConfigs = {};
  }
  
  // 加载保存的聊天设置
  const savedSettings = localStorage.getItem('chatSettings');
  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    enableWebSearch.value = settings.enableWebSearch ?? true;
    frugalMode.value = settings.frugalMode ?? true;
  }
  
  // 获取可用模型列表
  // fetchModels(); // 取消注释如果需要从API获取模型列表
});
</script>

<style scoped>
.w-100 {
  width: 100%;
}
</style>

<style scoped>
.w-100 {
  width: 100%;
}

.disabled-model {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>