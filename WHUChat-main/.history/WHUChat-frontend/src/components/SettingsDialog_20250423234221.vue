<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    @update:model-value="(val) => emit('update:modelValue', val)"
  >
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h5">{{ t("settings.title") }}</span>
        <v-btn
          icon
          @click="closeDialog"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="pa-4">
        <v-list lines="two">
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
                @update:model-value="updateTheme"
              >
                <v-btn value="light">
                  {{ t("settings.lightMode") }}
                </v-btn>
                <v-btn value="dark">
                  {{ t("settings.darkMode") }}
                </v-btn>
                <v-btn value="system">
                  {{ t("settings.followSystem") }}
                </v-btn>
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
              />
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useThemeManager } from "@/stores/settings";
import { useLanguageManager } from "@/stores/settings";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
defineProps(["modelValue"]);
const emit = defineEmits(["update:modelValue"]);
const closeDialog = () => {
  emit("update:modelValue", false); // 与 v-model 配合使用
};
defineExpose({ closeDialog });

// 语言切换逻辑
const { selectedLanguage, updateLanguage, languageOptions } =
  useLanguageManager();
// 主题切换逻辑
const { selectedTheme, updateTheme } = useThemeManager();
</script>
