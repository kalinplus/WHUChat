import {defineStore} from 'pinia'
import { getCurrentModel, getStoredApiKey } from '@/utils/localStorage';

export const useStateStore = defineStore('stateStore', {
  state: () => ({
    currentModel: getCurrentModel(), // 替代 useCurrentModel
    apiKey: getStoredApiKey(), // 替代 useApiKey
    conversations: [] as any[], // 替代 useConversations
    user: null as any, // 替代 useUser
    drawer: false, // 替代 useDrawer
  }),
  actions: {
    setCurrentModel(model: any) {
      this.currentModel = model;
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
      this.drawer = !this.drawer;
    },
  },
})
