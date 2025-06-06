<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useStateStore } from "@/stores/states";
import { storeToRefs } from "pinia";

const { t } = useI18n();
const stateStore = useStateStore();

// 先添加接口定义（在 script 标签开头）
interface ModelConfig {
  id: string;
  name: string;
  description: string;
  logo: string;
  model_id: string | number;
  model_class: string;
  usable: boolean;
}

const availableModels = ref<ModelConfig[]>([]);

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue", "select"]);

const closeDialog = () => {
  emit("update:modelValue", false);
};

const selectModel = (model: ModelConfig) => {
  emit("select", model);
};

// 获取模型列表
const fetchModels = async () => {
  try {
    const url = `https://${stateStore.addr}/api/v1/chat/models`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw API response:', data); // 调试日志

    // 修复：正确检查错误码
    if (data.error !== undefined && data.error !== 0) {
      throw new Error(`API error: ${data.error}`);
    }

    // 提取 models 数组
    const modelList = data.models || data; // 兼容两种可能的返回格式
    
    if (Array.isArray(modelList)) {
      availableModels.value = modelList.map(model => ({
        id: String(model.id),
        name: model.name || 'Unknown Model',
        description: model.description || model.name || 'No description',
        logo: `/models/${getLogo(model.name)}`, // 根据模型名称获取logo
        model_id: model.id,
        model_class: getModelClass(model.name), // 添加缺失的 model_class 字段
        usable: model.usable !== false, // 默认为 true，除非明确为 false
      }));
      
      console.log('Parsed models:', availableModels.value);
    } else {
      console.error('Unexpected response format: models is not an array', data);
      throw new Error('Invalid response format: expected models array');
    }
  } catch (error) {
    console.error('Error fetching models:', error);
  }
};

// 辅助函数：根据模型名称获取logo文件名
function getLogo(modelName: string): string {
  if (!modelName) return "unknown.png";

  const name = modelName.toLowerCase();
  if (name.includes("gpt")) return "openai.png";
  if (name.includes("claude")) return "anthropic.png";
  if (name.includes("gemini")) return "google.png";
  if (name.includes("llama")) return "meta.png";
  if (name.includes("deepseek")) return "deepseek.png"; 
  return "unknown.png";
}

// 辅助函数：根据模型名称获取模型类
function getModelClass(modelName: string): string {
  if (!modelName) return "unknown";

  const name = modelName.toLowerCase();
  if (name.includes("gpt")) return "openai";
  if (name.includes("claude")) return "anthropic";
  if (name.includes("gemini")) return "google";
  if (name.includes("llama")) return "meta";
  if (name.includes("deepseek")) return "deepseek"; 
  return "unknown";
}

// 组件挂载时获取模型列表
onMounted(async () => {
  console.log("ModelSelector mounted");
  await stateStore.fetchAddr(); // 确保地址信息已加载
  fetchModels();
});

</script>

<template>
  <v-dialog
    v-model="$props.modelValue"
    max-width="500px"
    transition="dialog-bottom-transition"
  >
    <v-card>
      <v-card-title class="headline">
        {{ t("selectModel") }}
      </v-card-title>
      <v-card-text>
        <v-list lines="two">
          <v-list-item
            v-for="model in availableModels"
            :key="model.id"
            @click="selectModel(model)"
            :title="model.name"
            :subtitle="model.description"
            class="model-item my-2"
          >
            <template v-slot:prepend>
              <v-avatar size="40" class="mr-3" v-if="model.logo">
                <v-img :src="model.logo" alt="Model logo"></v-img>
              </v-avatar>
              <v-icon v-else size="40" class="mr-3">mdi-robot</v-icon>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" @click="closeDialog">
          {{ t("close") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.model-item {
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.model-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.1);
}
</style>
