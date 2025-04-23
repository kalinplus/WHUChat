// import { useI18n } from 'vue-i18n'
// const i18n = useI18n()
import { v4 as uuidv4 } from "uuid";
import { useStateStore } from "@/stores/states";
const stateStore = useStateStore();

export interface ConversationData {
  id: null | number;
  topic: null | string;
  messages: any[];
  loadingMessages: boolean;
}

export const getDefaultConversationData = () => {
  return {
    id: null,
    // topic: null,
    messages: [],
    loadingMessages: false,
  };
};

export const addConversation = (conversation: any) => {
  stateStore.conversations = [conversation, ...stateStore.conversations];
};

export const genTitle = async (conversationId: any) => {
  // const { $i18n, $settings } = useNuxtApp()
  // const openaiApiKey = useApiKey()
  // const { data, error } = await useAuthFetch('/api/gen_title/', {
  //     method: 'POST',
  //     body: {
  //         conversationId: conversationId,
  //         prompt: $i18n.t('genTitlePrompt'),
  //         openaiApiKey: $settings.open_api_key_setting === 'True' ? openaiApiKey.value : null,
  //     }
  // })
  // if (!error.value) {
  //     const conversations = useConversations()
  //     let index = conversations.value.findIndex(item => item.id === conversationId)
  //     if (index === -1) {
  //         index = 0
  //     }
  //     conversations.value[index].topic = data.value.title
  //     return data.value.title
  // }
  // return null
  return "测试标题" + uuidv4().toString();
};
