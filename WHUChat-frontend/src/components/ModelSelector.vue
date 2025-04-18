<script setup lang="ts">
import { ref, defineProps, defineEmits } from "vue";
import { useI18n } from "vue-i18n";
import { useStateStore } from "@/stores/states";
import { storeToRefs } from "pinia";

const { t } = useI18n();
const stateStore = useStateStore();
const defaultModel = {
  id: "gpt-4",
  name: "GPT-4",
  description: "OpenAI GPT-4",
  logo: "/models/openai.png", // 简单使用一个占位路径
};
// TODO: 后续通过后端获取
const availableModels = ref([
  defaultModel,
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    description: "OpenAI GPT-3.5 Turbo",
    logo: "/models/openai.png",
  },
  {
    id: "claude-3",
    name: "Claude 3",
    description: "Anthropic Claude 3",
    logo: "/models/anthropic.png",
  },
]);

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

const selectModel = (model: any) => {
  emit("select", model);
};
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
