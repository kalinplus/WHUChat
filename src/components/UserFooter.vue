<template>
  <div class="user-footer">
    <v-menu location="top">
      <template v-slot:activator="{ props }">
        <v-list-item rounded="xl" v-bind="props" class="user-profile-item pa-2">
          <!-- 左侧头像 -->
          <template v-slot:prepend>
            <v-icon v-if="!user" :size="size">mdi-account-circle</v-icon>
            <v-avatar v-else :size="size" color="primary" class="text-white">
              {{ user?.username ? user.username.charAt(0).toUpperCase() : "U" }}
            </v-avatar>
          </template>

          <!-- 右侧用户名 -->
          <v-list-item-title class="user-name">
            {{ user?.username || t("guest") }}
          </v-list-item-title>
        </v-list-item>
      </template>

      <!-- 菜单内容 -->
      <v-card min-width="200">
        <v-list>
          <v-list-item v-if="user">
            <v-list-item-title>{{ user.username }}</v-list-item-title>
            <v-list-item-subtitle>{{ user.email }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>

        <v-divider v-if="user"></v-divider>

        <v-list>
          <v-list-item @click="$emit('openSettings')">
            <template v-slot:prepend>
              <v-icon>mdi-cog</v-icon>
            </template>
            <v-list-item-title>{{ t("settings.title") }}</v-list-item-title>
          </v-list-item>

          <v-list-item @click="$emit('signOut')">
            <template v-slot:prepend>
              <v-icon>mdi-logout</v-icon>
            </template>
            <v-list-item-title>{{ t("signOut") }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { UserProfile } from "@/stores/states";
import { usePrevious } from "@vueuse/core";
const { t } = useI18n();

defineProps({
  user: {
    type: Object as PropType<UserProfile | null>,
    default: null,
  },
  size: {
    type: [Number, String],
    default: 36,
  },
});

defineEmits(["openSettings", "signOut"]);
</script>

<style scoped>
.user-footer {
  /* background-color: rgba(var(--v-theme-surface-variant), 0.1); */
  margin: 8px;
  border-radius: 12px;
}

.user-profile-item {
  min-height: 48px;
  cursor: pointer;
}

.user-profile-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.user-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 深色模式适配 */
:deep(.v-theme--dark) .user-footer {
  background-color: rgba(255, 255, 255, 0.05);
}

:deep(.v-theme--dark) .user-profile-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
