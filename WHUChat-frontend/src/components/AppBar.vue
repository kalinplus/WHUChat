<!-- filepath: g:\github\WHUChat\WHUChat-frontend\src\components\AppBar.vue -->
<template>
  <div class="custom-app-bar">
    <!-- 左侧按钮组 -->
    <div class="app-bar-left">
      <!-- 仅在侧边栏关闭时显示菜单按钮 -->
      <v-btn
        icon
        @click="toggleDrawer"
        class="menu-icon"
        variant="plain"
        v-if="!stateStore.drawer"
      >
        <v-icon>mdi-menu</v-icon>
      </v-btn>

      <!-- 仅在侧边栏关闭时显示新增对话按钮 -->
      <v-tooltip
        :text="t('newConversation')"
        location="bottom"
        v-if="!stateStore.drawer"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            icon
            variant="text"
            v-bind="props"
            @click="emit('newConversation')"
          >
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <div class="title">{{ title }}</div>
    </div>

    <!-- 右侧 -->
    <div class="app-bar-right">
      <!-- 用户头像和菜单 -->
      <UserAvatar
        :user="user"
        size="36"
        @open-settings="$emit('openSettings')"
        @sign-out="$emit('signOut')"
        @sign-in="$emit('signIn')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useStateStore } from "@/stores/states";
import UserAvatar from "./UserAvatar.vue"; // 导入用户头像组件

const { t } = useI18n();
const stateStore = useStateStore();

// 定义组件属性
const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  user: {
    type: Object,
    default: null,
  },
});

// 定义组件事件
const emit = defineEmits([
  "newConversation",
  "openSettings",
  "signOut",
  "signIn",
]);

// 切换侧边栏方法
const toggleDrawer = () => {
  stateStore.toggleDrawer();
};
</script>

<style scoped>
.custom-app-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  width: 100%;
  padding: 0 16px;
  background-color: var(--v-theme-surface);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05); /* 非常淡的边框 */
}

.app-bar-left {
  display: flex;
  align-items: center;
}

.app-bar-right {
  display: flex;
  align-items: center;
}

.title {
  font-size: 1.25rem;
  font-weight: 500;
  margin-left: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-icon {
  margin-right: 8px;
}

/* 深色模式适配 */
:deep(.v-theme--dark) .custom-app-bar {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
</style>
