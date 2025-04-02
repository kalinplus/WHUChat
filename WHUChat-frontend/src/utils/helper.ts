// import { useI18n } from 'vue-i18n'
// const i18n = useI18n()

export interface ConversationData {
  id: null | number;
  topic: null | string;
  messages: any[];
  loadingMessages: boolean;
}

export const getDefaultConversationData = () => {
  return {
    id: null,
    topic: null,
    messages: [],
    loadingMessages: false,
  };
};
