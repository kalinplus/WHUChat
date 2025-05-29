import { defineStore } from "pinia";
import { getCurrentModel, getStoredApiKey } from "../utils/localStorage";

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

export interface UserProfile {
  uuid: number;
  username: string;
  email?: string; // 可选
  avatar_url?: string; // 可选，头像链接
}

export const useStateStore = defineStore("stateStore", {
  state: () => ({
    currentModel: getCurrentModel() as ModelConfig,
    modelConfigs: {} as Record<string, ModelConfig>, // 存储每个模型的配置，包括API Key
    conversations: [] as any[],
    user: null as UserProfile | null,
    drawer: false,
    fetchingResponse: false,
    addr: null as string | null,
  }),
  actions: {
    setCurrentModel(model: ModelConfig) {
      // 确保模型对象包含所有必要字段
      this.currentModel = {
        ...model,
        model_id: model.model_id || model.id,
        model_class: model.model_class || "anthropic",
      };

      // 保存到本地存储
      localStorage.setItem("currentModel", JSON.stringify(this.currentModel));
    },
    setApiKey(key: string, modelId?: string) {
      if (modelId) {
        // 如果指定了模型ID，则为该模型设置特定的API Key
        const modelConfig = this.modelConfigs[modelId] || {
          ...this.getModelById(modelId),
          api_key: "",
        };

        modelConfig.api_key = key;
        this.modelConfigs[modelId] = modelConfig;

        // 保存所有模型配置到本地存储
        localStorage.setItem("modelConfigs", JSON.stringify(this.modelConfigs));

        // 如果当前模型是被修改的模型，也更新currentModel
        if (this.currentModel && this.currentModel.id === modelId) {
          this.currentModel.api_key = key;
          localStorage.setItem(
            "currentModel",
            JSON.stringify(this.currentModel)
          );
        }
      }
    },
    setModelCustomUrl(url: string, modelId: string) {
      // 为指定模型设置自定义URL
      const modelConfig = this.modelConfigs[modelId] || {
        ...this.getModelById(modelId),
        custom_url: "",
      };

      modelConfig.custom_url = url;
      this.modelConfigs[modelId] = modelConfig;

      // 保存所有模型配置到本地存储
      localStorage.setItem("modelConfigs", JSON.stringify(this.modelConfigs));

      // 如果当前模型是被修改的模型，也更新currentModel
      if (this.currentModel && this.currentModel.id === modelId) {
        this.currentModel.custom_url = url;
        localStorage.setItem("currentModel", JSON.stringify(this.currentModel));
      }
    },
    loadModelConfigs() {
      // 从本地存储加载所有模型配置
      const savedConfigs = localStorage.getItem("modelConfigs");
      if (savedConfigs) {
        try {
          this.modelConfigs = JSON.parse(savedConfigs);
        } catch (e) {
          console.error("Error parsing modelConfigs:", e);
          this.modelConfigs = {};
        }
      }
    },
    getModelById(modelId: string): ModelConfig | null {
      // 辅助方法，用于从可用模型中找到指定ID的模型
      // 这里假设你从某处获取可用模型列表
      // 实际实现可能需要根据你的应用结构调整
      return null;
    },
    getModelApiKey(modelId: string): string {
      // 获取指定模型的API Key，如果没有则返回默认API Key
      return this.modelConfigs[modelId]?.api_key || "";
    },
    addConversation(conversation: any) {
      this.conversations.push(conversation);
    },
    setUser(user: UserProfile | null) {
      this.user = user;
    },
    toggleDrawer() {
      this.drawer = !this.drawer;
    },
    toggleFetchingResponse() {
      this.fetchingResponse = !this.fetchingResponse;
    },
    setConversations(conversations: any[]) {
      this.conversations = conversations;
    },
    getAddr() {
      return this.addr;
    },
    setAddr(addr: string | null) {
      this.addr = addr;
    },
  },
});
