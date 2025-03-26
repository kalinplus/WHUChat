<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const i18n = { t: (key:any) => key } // 简化的 i18n 实现，根据需要替换
const drawer = ref(false) // 简单的 drawer 状态
const conversation = ref(getDefaultConversationData())

// 创建一个自定义的默认对话数据函数
function getDefaultConversationData() {
  return {
    id: undefined as number | undefined,
    topic: "",
    messages: [],
    model: "gpt-3.5-turbo",
    loadingMessages: false,
    apiKey: null,
    temperature: 1,
  }
}

// Mock data for conversations and messages
const mockConversations = {
  conv1: {
    id: "conv1",
    topic: "Introduction to AI",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  conv2: {
    id: "conv2",
    topic: "JavaScript Basics",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  conv3: {
    id: "conv3",
    topic: "Vue.js Development",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

const mockMessages = {
  conv1: [
    {
      id: "msg1",
      content: "Hello! How can I help you learn about AI?",
      role: "assistant",
      conversationId: "conv1",
      createdAt: new Date().toISOString(),
    },
    {
      id: "msg2",
      content: "I'd like to understand the basics of machine learning.",
      role: "user",
      conversationId: "conv1",
      createdAt: new Date().toISOString(),
    },
    {
      id: "msg3",
      content:
        "Machine learning is a branch of AI that focuses on building systems that learn from data...",
      role: "assistant",
      conversationId: "conv1",
      createdAt: new Date().toISOString(),
    },
  ],
  conv2: [
    {
      id: "msg4",
      content: "What would you like to know about JavaScript?",
      role: "assistant",
      conversationId: "conv2",
      createdAt: new Date().toISOString(),
    },
    {
      id: "msg5",
      content: "Can you explain promises?",
      role: "user",
      conversationId: "conv2",
      createdAt: new Date().toISOString(),
    },
    {
      id: "msg6",
      content:
        "Promises in JavaScript are objects representing the eventual completion or failure of an asynchronous operation...",
      role: "assistant",
      conversationId: "conv2",
      createdAt: new Date().toISOString(),
    },
  ],
  conv3: [
    {
      id: "msg7",
      content: "Welcome to Vue.js! What would you like to discuss?",
      role: "assistant",
      conversationId: "conv3",
      createdAt: new Date().toISOString(),
    },
    {
      id: "msg8",
      content: "How do I use the Composition API?",
      role: "user",
      conversationId: "conv3",
      createdAt: new Date().toISOString(),
    },
    {
      id: "msg9",
      content:
        "The Composition API is a set of APIs that allows you to write Vue components using imported functions instead of declaring options...",
      role: "assistant",
      conversationId: "conv3",
      createdAt: new Date().toISOString(),
    },
  ],
};

const loadConversation = async () => {
  // 模拟API延迟
  await new Promise((resolve) => setTimeout(resolve, 300));

  if (route.params.id && mockConversations[route.params.id]) {
    conversation.value = Object.assign(
      conversation.value,
      mockConversations[route.params.id]
    );
  }
};

const loadMessage = async () => {
  // 模拟API延迟
  await new Promise((resolve) => setTimeout(resolve, 300));

  if (route.params.id && mockMessages[route.params.id]) {
    conversation.value.messages = mockMessages[route.params.id];
    conversation.value.id = route.params.id;
  }
};

const createNewConversation = () => {
  if (route.path !== "/") {
    router.push("/?new");
    return;
  }
  conversation.value = Object.assign(getDefaultConversationData(), {
    topic: i18n.t("newConversation"),
  });
};

// 计算导航标题
const navTitle = computed(() => {
  return conversation.value.topic || i18n.t("app");
});

onMounted(async () => {
  if (route.params.id) {
    conversation.value.loadingMessages = true;
    await loadConversation();
    await loadMessage();
    conversation.value.loadingMessages = false;
  } else if (!route.query.new) {
    // 默认加载第一个对话
    const firstConvId = Object.keys(mockConversations)[0];
    if (firstConvId) {
      router.push(`/${firstConvId}`);
    }
  }
});
</script>

<template>
  <div class="app-container">
    <!-- 应用栏 -->
    <header class="app-bar">
      <button @click="drawer = !drawer" class="nav-icon">
        <span class="material-icons">menu</span>
      </button>

      <h1 class="toolbar-title">{{ navTitle }}</h1>

      <div class="spacer"></div>

      <button
        :title="i18n.t('newConversation')"
        @click="createNewConversation"
        class="mobile-button"
      >
        <span class="material-icons">add</span>
      </button>
      <button
        class="desktop-button"
        @click="createNewConversation"
      >
        {{ i18n.t("newConversation") }}
      </button>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div v-if="!route.params.id && conversation.messages.length === 0" class="welcome">
        <!-- 欢迎组件 -->
        <h2>Welcome to Chat App</h2>
        <p>Start a new conversation or select an existing one.</p>
      </div>
      <div v-else class="conversation">
        <!-- 对话组件 -->
        <div v-for="message in conversation.messages" :key="message.id"
             :class="['message', message.role]">
          <div class="message-content">{{ message.content }}</div>
        </div>
        <!-- 消息输入框 -->
        <div class="message-input">
          <textarea placeholder="Type a message"></textarea>
          <button>Send</button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-bar {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 64px;
  background-color: #f5f5f5;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-icon {
  background: none;
  border: none;
  cursor: pointer;
  margin-right: 16px;
}

.toolbar-title {
  font-size: 1.2rem;
  margin: 0;
}

.spacer {
  flex-grow: 1;
}

.mobile-button {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
}

.desktop-button {
  padding: 8px 16px;
  border: 1px solid #ccc;
  background: none;
  cursor: pointer;
  border-radius: 4px;
}

.main-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 16px;
}

.message {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  max-width: 80%;
}

.message.user {
  background-color: #e3f2fd;
  margin-left: auto;
}

.message.assistant {
  background-color: #f1f1f1;
  margin-right: auto;
}

.message-input {
  display: flex;
  margin-top: 16px;
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.message-input textarea {
  flex-grow: 1;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: none;
}

.message-input button {
  margin-left: 8px;
  padding: 8px 16px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .mobile-button {
    display: block;
  }

  .desktop-button {
    display: none;
  }
}
</style>
