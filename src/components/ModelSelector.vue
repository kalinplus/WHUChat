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
    const baseUrl = "https://" + import.meta.env.VITE_API_HOST;
    const url = `${baseUrl}/api/v1/chat/models`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        availableModels.value = data.map(model => ({
          id: String(model.id),
          name: model.model || 'Unknown Model',
          description: model.model,
          logo: "/models/anthropic.png", // 默认logo
          model_id: model.id,
          usable: model.usable,
        }));
      }
    }
  } catch (error) {
    console.error('Error fetching models:', error);
  }
};

// 组件挂载时获取模型列表
onMounted(() => {
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
