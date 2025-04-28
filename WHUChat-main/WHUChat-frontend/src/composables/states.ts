// 移除 useState 的使用，改用已有的 store

import { useAppStore } from "@/stores/app";
import { useStateStore } from "@/stores/states";
import { computed } from "vue";

// 获取当前模型和API Key的辅助函数
const getCurrentModel = () =>
  localStorage.getItem("currentModel") || "gpt-3.5-turbo";
const getStoredApiKey = () => localStorage.getItem("apiKey") || "";

// 创建简单的 composable 函数，使用已有的 store
export const useCurrentModel = () => {
  const stateStore = useStateStore();
  // 如果 store 中已有 currentModel，使用它
  if (!stateStore.currentModel) {
    stateStore.setCurrentModel(getCurrentModel());
  }
  return computed(() => stateStore.currentModel);
};

export const useApiKey = () => {
  const stateStore = useStateStore();
  // 如果 store 中已有 apiKey，使用它
  if (!stateStore.apiKey) {
    stateStore.setApiKey(getStoredApiKey());
  }
  return computed(() => stateStore.apiKey);
};

export const useConversations = () => {
  const stateStore = useStateStore();
  return computed(() => stateStore.conversations);
};

export const useUser = () => {
  const stateStore = useStateStore();
  return computed(() => stateStore.user);
};

export const useDrawer = () => {
  const stateStore = useStateStore();
  return computed({
    get: () => stateStore.drawer,
    set: () => stateStore.toggleDrawer(),
  });
};
