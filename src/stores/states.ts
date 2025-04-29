import { defineStore } from "pinia";
import { getCurrentModel, getStoredApiKey } from "@/utils/localStorage";

export const useStateStore = defineStore("stateStore", {
  state: () => ({
    currentModel: getCurrentModel() as any, // 替代 useCurrentModel
    apiKey: getStoredApiKey(), // 替代 useApiKey
    conversations: [] as any[], // 替代 useConversations，conversations指会话
    user: null as any, // TODO: 应该至少要有 id 和 name 属性
    drawer: false, // 替代 useDrawer
  }),
  actions: {
    setCurrentModel(model: any) {
      // 确保模型对象包含所有必要字段
      this.currentModel = {
        ...model,
        model_id: model.model_id || model.id,
        model_class: model.model_class || "anthropic", // 默认值
      };
      // 保存到本地存储
      localStorage.setItem("currentModel", JSON.stringify(this.currentModel));
    },
    setApiKey(key: string) {
      this.apiKey = key;
    },
    addConversation(conversation: any) {
      this.conversations.push(conversation);
    },
    setUser(user: any) {
      this.user = user;
    },
    toggleDrawer() {
      // console.log(this.drawer)
      this.drawer = !this.drawer;
    },
    setConversations(conversations: any[]) {
      this.conversations = conversations;
    },
  },
});
