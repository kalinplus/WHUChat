<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useStateStore } from "@/stores/states";
import { storeToRefs } from "pinia";
import { addConversation } from "@/utils/helper";
import ModelSelector from "./ModelSelector.vue"; // TODO: 稍后创建这个组件
import type {
  PromptMessage,
  ChatParameters,
  ChatRequestData,
  BrowseMessagesResponse,
  MessageItem,
  FormattedMessage,
} from "@/types/types";
import axios from "axios";

// const openaiApiKey = useApiKey();
const { t } = useI18n();
const stateStore = useStateStore();
const { currentModel } = storeToRefs(stateStore);
const fetchingResponse = ref(false);
// TODO: 明确message的内容
const messageQueue: { [key: string]: any } = [];
const frugalMode = ref(false);

interface Settings {
  enableWebSearch: boolean;
  frugalMode: boolean;
}
const settings = ref<Settings>({
  enableWebSearch: true,
  frugalMode: true,
});
let isProcessingQueue = false;

const props = defineProps({
  conversation: {
    type: Object,
    required: true,
  },
});
// 是否允许联网搜索
const enableWebSearch = ref(false);

// 模型选择对话框控制
const showModelSelector = ref(false);

const typewriter = import.meta.env.VITE_TYPEWRITER === "true";
const typewriterDelay = import.meta.env.VITE_TYPEWRITERDELAY as number;

const processMessageQueue = () => {
  // 如果正在处理队列或队列为空，直接返回
  if (isProcessingQueue || messageQueue.length === 0) {
    return;
  }

  // 安全地检查消息数组是否为空
  if (props.conversation.messages.length === 0) {
    // 如果为空，添加一个机器人消息
    props.conversation.messages.push({ id: null, is_bot: true, message: "" });
  }
  // 如果最后一条不是机器人消息，添加新的机器人消息
  else if (
    !props.conversation.messages[props.conversation.messages.length - 1].is_bot
  ) {
    props.conversation.messages.push({ id: null, is_bot: true, message: "" });
  }

  // 标记为正在处理
  isProcessingQueue = true;

  // 安全地获取消息
  const nextMessage = messageQueue.shift();

  // 确保 nextMessage 是字符串
  const messageText =
    typeof nextMessage === "string"
      ? nextMessage
      : nextMessage?.toString() || "";

  // 打字机效果
  if (typewriter && messageText.length > 0) {
    let wordIndex = 0;
    const intervalId = setInterval(() => {
      // 确保索引在有效范围内
      if (
        wordIndex < messageText.length &&
        props.conversation.messages.length > 0
      ) {
        props.conversation.messages[
          props.conversation.messages.length - 1
        ].message += messageText[wordIndex];
        wordIndex++;
      } else {
        // 如果索引超出范围或消息数组为空，清除定时器
        clearInterval(intervalId);
        isProcessingQueue = false;
        processMessageQueue(); // 处理下一条消息
      }
    }, typewriterDelay);
  } else {
    // 确保消息数组不为空
    if (props.conversation.messages.length > 0) {
      props.conversation.messages[
        props.conversation.messages.length - 1
      ].message += messageText;
    }
    isProcessingQueue = false;
    processMessageQueue();
  }
};

// 超时熔断机制
const WEBSOCKET_TIMEOUT_DURATION = 20000; // 20 seconds in milliseconds
let websocketTimeoutId: ReturnType<typeof setTimeout> | null = null;

const clearWebsocketTimeout = () => {
  if (websocketTimeoutId) {
    clearTimeout(websocketTimeoutId);
    websocketTimeoutId = null;
  }
};

const resetWebsocketTimeout = () => {
  clearWebsocketTimeout(); // Clear any existing timer

  // Only set a new timer if the connection is supposed to be active
  if (fetchingResponse.value && wsConnected.value) {
    websocketTimeoutId = setTimeout(() => {
      console.warn("WebSocket timeout reached.");
      showSnackbar("服务器连接超时"); // Show snackbar first

      // Update the last message if it's a bot message
      if (props.conversation.messages.length > 0) {
        const lastMessage =
          props.conversation.messages[props.conversation.messages.length - 1];
        if (lastMessage.is_bot) {
          // Use nextTick to ensure UI updates before potential abort delays
          nextTick(() => {
            lastMessage.message = "服务器繁忙，请稍后重试";
          });
        }
      }

      // Close the connection with a specific reason
      abortFetch(1001, "WebSocket timeout");
    }, WEBSOCKET_TIMEOUT_DURATION);
  }
};

// WebSocket 变量
const ws = ref<WebSocket | null>(null);
const wsConnected = ref(false);

// 设置WebSocket连接
const setupWebSocket = (sessionId: string) => {
  // 关闭已存在的连接
  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.close();
  }

  // 创建新的WebSocket连接
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  // 参考 API 文档 /api/v1/ws/trans_ans 接口

  // FIXME: encodeURIComponent 由 AI 生成，可能不需要
  // const wsUrl = `${protocol}//${
  //   window.location.host
  // }/api/v1/ws/tran_ans/?uuid=${encodeURIComponent(
  //   stateStore.user?.id
  // )}&session_id=${encodeURIComponent(sessionId)}&model_id=${encodeURIComponent(
  //   currentModel.value.model_id || "claude-3-haiku"
  // )}`;
  // FIXME: 测试用 ws URL
  const wsUrl = `${
    import.meta.env.VITE_WS_PROTOCOL
  }://127.0.0.1:886/api/v1/ws/tran_ans?uuid=${encodeURIComponent(
    stateStore.user?.id
  )}&session_id=${encodeURIComponent(sessionId)}&model_id=${encodeURIComponent(
    currentModel.value.model_id || "claude-3-haiku"
  )}`;

  console.log("Connecting to WebSocket:", wsUrl);

  ws.value = new WebSocket(wsUrl);

  // 确保携带cookie (WebSocket默认会带上同源的cookie)
  // 通过同源策略，应该不会有跨域问题，因为我们使用相同的host

  // 定义标记常量
  const START_MARKER = "Contents:";
  const END_MARKER = "&&&&&&******^^^^^^";

  // WebSocket事件处理
  ws.value.onopen = () => {
    wsConnected.value = true;
    console.log("WebSocket connected");
    resetWebsocketTimeout(); // Start the timer when connection opens

    // 添加空的机器人消息... (rest of onopen)
    if (props.conversation.messages.length === 0) {
      props.conversation.messages.push({ id: null, is_bot: true, message: "" });
    } else if (
      !props.conversation.messages[props.conversation.messages.length - 1]
        .is_bot
    ) {
      props.conversation.messages.push({ id: null, is_bot: true, message: "" });
    }
  };

  ws.value.onmessage = (event) => {
    resetWebsocketTimeout(); // Reset timer on any message received

    const messageData =
      typeof event.data === "string" ? event.data : event.data.toString();
    console.log("WebSocket raw message received:", messageData);

    if (messageData === START_MARKER) {
      console.log("Received start marker.");
    } else if (messageData === END_MARKER) {
      console.log("Received end marker.");
      // Close normally, abortFetch will clear the timer
      abortFetch(1000, "Client received end marker");
    } else {
      messageQueue.push(messageData);
      processMessageQueue();
      scrollChatWindow();
    }
  };

  ws.value.onerror = (error) => {
    clearWebsocketTimeout(); // Clear timer on error
    console.error("WebSocket error:", error);
    wsConnected.value = false;
    showSnackbar("WebSocket connection error");
    abortFetch(1006, "WebSocket error occurred");
  };

  ws.value.onclose = (event) => {
    clearWebsocketTimeout(); // Clear timer on close
    wsConnected.value = false;
    console.log(
      `WebSocket connection closed: Code ${event.code}, Reason: ${event.reason}`
    );

    if (event.code !== 1000) {
      // Avoid showing "unexpectedly closed" if it was due to timeout (code 1001)
      if (event.code !== 1001 || event.reason !== "WebSocket timeout") {
        showSnackbar(
          `Connection closed unexpectedly (${event.code}). Please try again.`
        );
      }
    }
    fetchingResponse.value = false;
  };
};

// 修改终止函数，同时处理HTTP请求和WebSocket
let ctrl: any;
const abortFetch = (
  closeCode: number = 1001,
  closeReason: string = "User aborted"
) => {
  clearWebsocketTimeout(); // Clear timer when aborting

  if (ctrl) {
    ctrl.abort();
    ctrl = null;
  }

  if (ws.value && wsConnected.value) {
    console.log(
      `abortFetch explicitly closing WebSocket with code ${closeCode}.`
    );
    ws.value.close(closeCode, closeReason);
    wsConnected.value = false;
  }

  fetchingResponse.value = false;
};

// 发送对话，获取请求
const fetchReply = async (message: any) => {
  // 创建 AbortController 用于取消 HTTP 请求
  ctrl = new AbortController();

  let msg = message;
  if (Array.isArray(message)) {
    msg = message[message.length - 1];
  } else {
    message = [message];
  }
  // 格式化用户消息为接口需要的格式
  const formattedPrompt: PromptMessage[] = message.map((m: any) => ({
    role: m.message_type === "image" ? "image" : "user",
    content: m.content,
  }));
  // TODO: 对于新页面和首次对话（创建新会话），传给后端的请求有所不同。不知道这里解决没有
  // 构建请求参数
  // const requestData: ChatRequestData = {
  //   uuid: stateStore.user?.id, // 用户ID
  //   session_id: props.conversation.id || null, // 会话ID，如果是新对话则为null
  //   model_id: currentModel.value.model_id || "claude-3-haiku", // 模型ID
  //   model_class: currentModel.value.model_class || "anthropic", // 模型大类
  //   prompt: formattedPrompt,
  //   parameters: {
  //     temperature: 0.7,
  //     frugalMode: frugalMode.value,
  //     // 如果启用了网页搜索
  //     ...(enableWebSearch.value && {
  //       online: true,
  //       ua: navigator.userAgent,
  //     }),
  //   } as ChatParameters,
  // };
  const requestData: ChatRequestData = {
    uuid: 1, // 用户ID
    session_id: 16, // 会话ID，如果是新对话则为null
    model_id: 1, // 模型ID
    model_class: "anthropic", // 模型大类
    prompt: formattedPrompt,
    parameters: {
      temperature: 0.7,
      frugalMode: frugalMode.value,
      // 如果启用了网页搜索
      ...(enableWebSearch.value && {
        online: true,
        ua: navigator.userAgent,
      }),
    } as ChatParameters,
  };
  // 如果用户提供了自定义API URL和Key，则添加到请求中，没有就算了
  // 只有一个没用，所以一定一起添加。虽然一起也不知道有没有用，实现了吗
  if (currentModel.value.custom_url && currentModel.value.api_key) {
    requestData.URL = currentModel.value.custom_url;
    requestData.api_key = currentModel.value.api_key;
  }

  try {
    fetchingResponse.value = true;

    // 发送HTTP POST请求
    // FIXME: 测试用 URL
    const baseUrl = "https://127.0.0.1:8081";
    const response = await fetch(`${baseUrl}/api/v1/chat/send_message`, {
      // const response = await fetch("/api/v1/chat/send_message", {
      signal: ctrl.signal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // 添加这一行来显式携带 cookie
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const responseData = await response.json();

    // 检查是否有错误
    if (responseData.error) {
      throw new Error(`API error: ${responseData.error}`);
    }

    // 准备接收消息 - 建立WebSocket连接
    setupWebSocket(responseData.session_id || props.conversation.id);

    // 如果是新对话，更新对话ID
    if (!props.conversation.id && responseData.session_id) {
      props.conversation.id = responseData.session_id;
    }
  } catch (err: any) {
    console.error(err);
    abortFetch();
    showSnackbar(err.message);
  }
};
// 自动滚动聊天窗口
const grab = ref<{
  scrollIntoView: (obj: { behavior: string }) => void;
} | null>(null);
const scrollChatWindow = () => {
  // @ts-ignore
  const parent = grab.value?.parentElement;
  if (parent) {
    // 滚动到底部并向上调整 64px
    parent.scrollTop = parent.scrollHeight - parent.clientHeight - 64;
  }
};
// 发送prompt
const send = (message: any) => {
  fetchingResponse.value = true;
  if (props.conversation.messages.length === 0) {
    addConversation(props.conversation);
  }
  if (Array.isArray(message)) {
    props.conversation.messages.push(
      ...message.map((i) => ({
        message: i.content,
        message_type: i.message_type,
      }))
    );
  } else {
    props.conversation.messages.push({
      message: message.content,
      message_type: message.message_type,
    });
  }
  fetchReply(message);
  scrollChatWindow();
};
const stop = () => {
  abortFetch();
};
// 提示条
const snackbar = ref(false);
const snackbarText = ref("");
const showSnackbar = (text: string) => {
  snackbarText.value = text;
  snackbar.value = true;
};

const editor = ref<{
  refreshDocList: () => void;
  usePrompt: (prompt: any) => void;
} | null>(null);
const usePrompt = (prompt: string) => {
  editor.value?.usePrompt(prompt);
};

const deleteMessage = (index: number) => {
  props.conversation.messages.splice(index, 1);
};

// 处理模型选择
const handleModelSelect = (model: any) => {
  if (model) {
    // 更新 Pinia store 中的模型
    stateStore.setCurrentModel(model);
  }
  // 关闭模型选择器
  showModelSelector.value = false;
};

onUnmounted(() => {
  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.close();
  }
});

// 加载会话历史消息
const loadConversationHistory = async () => {
  // 如果没有会话ID，则不需要加载历史
  if (!props.conversation?.id) {
    console.log("No conversation ID, skipping history load.");
    // 确保消息被清空
    if (props.conversation) {
      props.conversation.messages = [];
      props.conversation.loadingMessages = false;
    }
    return;
  }

  console.log(`Loading history for session ID: ${props.conversation.id}`);

  try {
    // 设置加载状态
    props.conversation.loadingMessages = true;

    // 清空现有消息，避免污染
    props.conversation.messages = [];

    // 构建请求数据
    // const requestData = {
    //   uuid: stateStore.user?.id || 1,
    //   session_id: props.conversation.id || 16,
    // };
    const requestData = {
      uuid: 1,
      session_id: 16,
    };

    // 使用axios发送请求获取历史消息
    // TODO: 可能要改
    const baseUrl = "https://127.0.0.1:8081";
    const response = await axios.post(
      `${baseUrl}/api/v1/chat/browse_messages`,
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
          // 如果需要认证，添加 Authorization header
          // 'Authorization': `Bearer ${getToken()}`
        },
        withCredentials: true, // 添加这一行来显式携带 cookie
      }
    );

    console.log("History Response Data:", response.data);

    // 检查后端返回的业务错误
    if (response.data.error !== 0) {
      throw new Error(`API error code: ${response.data.error}`);
    }

    // 处理返回的消息，转换为组件需要的格式
    if (response.data.messages && Array.isArray(response.data.messages)) {
      const formattedMessages: FormattedMessage = response.data.messages.map(
        (backendMsg: MessageItem) => {
          // 根据返回数据判断是否为机器人消息
          // 通常 role 为 "assistant" 或 sender 不为 "user" 时为机器人消息
          const isBot =
            backendMsg.prompt?.role === "assistant" ||
            backendMsg.sender === "assistant" ||
            backendMsg.sender !== "user";

          // 获取消息内容
          let messageContent = "";
          let messageType = "text"; // 默认为文本

          // 处理 prompt 中的内容
          if (backendMsg.prompt) {
            if (typeof backendMsg.prompt === "object") {
              // 处理对象形式的 prompt
              if (backendMsg.prompt.content) {
                messageContent = backendMsg.prompt.content;
              }
              // 未来可能会有图片处理逻辑
              // if (backendMsg.prompt.image_url) {...}
            } else if (Array.isArray(backendMsg.prompt)) {
              // 处理数组形式的 prompt (向后兼容)
              for (const part of backendMsg.prompt) {
                if (part.type === "text" && part.content) {
                  messageContent = part.content;
                } else if (part.content) {
                  // 直接取content (适应不同结构)
                  messageContent = part.content;
                }
              }
            }
          }

          // 如果没有找到内容，使用备用值
          if (!messageContent) {
            messageContent = "[无内容]";
          }

          // 创建前端消息对象
          return {
            id: backendMsg.id || `history-${backendMsg.id || Date.now()}`,
            is_bot: isBot,
            message: messageContent,
            message_type: messageType,
            model_id: backendMsg.model_id,
            model_class: backendMsg.model_class,
            timestamp: backendMsg.timestamp || new Date().toISOString(),
          };
        }
      );

      // 更新 conversation 的 messages 数组
      props.conversation.messages = formattedMessages;
      console.log("Formatted Messages:", props.conversation.messages);
    } else {
      console.log("No messages found in the response.");
      props.conversation.messages = []; // 确保消息数组为空
    }

    // 完成加载
    props.conversation.loadingMessages = false;
    console.log("Finished loading history.");

    // 滚动到底部
    nextTick(() => {
      scrollChatWindow();
      console.log("Scrolled chat window after history load.");
    });
  } catch (error: any) {
    console.error("Failed to load conversation history:", error);
    showSnackbar(`加载历史消息失败: ${error.message || error}`);

    if (props.conversation) {
      props.conversation.loadingMessages = false;
      // 确保即使出错也清空消息，避免显示旧会话内容
      props.conversation.messages = [];
    }
  }
};

// 监听会话ID变化
watch(
  () => props.conversation.id,
  (newId, oldId) => {
    console.log(`Conversation ID changed: ${oldId} -> ${newId}`);

    // 如果新ID有效且与旧ID不同，则加载历史
    if (newId && newId !== oldId) {
      loadConversationHistory();
    }
    // 如果新ID为null（创建新对话）
    else if (newId === null) {
      props.conversation.messages = [];
      props.conversation.loadingMessages = false;
    }
    // 如果首次加载时已有ID（处理直接通过URL访问的情况）
    else if (newId && oldId === undefined) {
      loadConversationHistory();
    }
  },
  { immediate: true }
);
</script>

<template>
  <!-- 主容器，添加适当的底部内边距来容纳固定在底部的输入框 -->
  <div class="chat-container">
    <!-- 渲染聊天气泡部分 -->
    <div v-if="conversation" class="messages-area">
      <div v-if="conversation.loadingMessages" class="text-center">
        <v-progress-circular
          indeterminate
          color="primary"
        ></v-progress-circular>
        <div class="mt-2">{{ $t("loadingHistoryMessages") }}</div>
      </div>
      <div v-else class="messages-content">
        <div v-if="conversation.messages" ref="chatWindow">
          <v-container>
            <v-row>
              <v-col
                v-for="(message, index) in conversation.messages"
                :key="index"
                cols="12"
              >
                <div
                  class="d-flex align-center"
                  :class="message.is_bot ? 'justify-start' : 'justify-end'"
                >
                  <MessageActions
                    v-if="!message.is_bot"
                    :message="message"
                    :message-index="index"
                    :use-prompt="usePrompt"
                    :delete-message="deleteMessage"
                  />
                  <MsgContent
                    :message="message"
                    :index="index"
                    :use-prompt="usePrompt"
                    :delete-message="deleteMessage"
                  />
                  <MessageActions
                    v-if="message.is_bot"
                    :message="message"
                    :message-index="index"
                    :use-prompt="usePrompt"
                    :delete-message="deleteMessage"
                  />
                </div>
              </v-col>
            </v-row>
          </v-container>

          <div ref="grab" class="w-100" style="height: 1px"></div>
        </div>
      </div>
    </div>

    <!-- 底部发消息、选配置部分 - 使用固定定位 -->
    <div class="footer-fixed">
      <v-card flat width="100%" class="message-control-panel pa-3">
        <div class="d-flex flex-column">
          <!-- 上部分：消息编辑区和停止按钮 -->
          <div class="d-flex align-center">
            <v-btn
              v-show="fetchingResponse"
              @click="stop"
              class="mr-3"
              color="error"
            >
              <v-icon>mdi-close</v-icon>
            </v-btn>
            <!-- MsgEditor 组件 -->
            <MsgEditor
              ref="editor"
              :send-message="send"
              :disabled="fetchingResponse"
              :loading="fetchingResponse"
            />
          </div>

          <!-- 下部分：功能区域 -->
          <div class="d-flex align-center flex-wrap mt-2">
            <!-- 原有按钮不变... -->
            <Prompt
              v-show="!fetchingResponse"
              :use-prompt="usePrompt"
              class="mr-2"
            />

            <!-- 模型选择按钮 -->
            <v-btn
              variant="outlined"
              rounded="pill"
              size="small"
              class="mr-2 my-1 model-select-btn"
              prepend-icon="mdi-cpu"
              @click="showModelSelector = true"
              style="margin-left: 10px"
            >
              <div class="d-flex align-center">
                <v-avatar
                  size="20"
                  class="mr-1"
                  v-if="stateStore.currentModel?.logo"
                >
                  <v-img
                    :src="stateStore.currentModel.logo"
                    alt="Model logo"
                  ></v-img>
                </v-avatar>
                <span>{{
                  stateStore.currentModel?.name || t("selectModel")
                }}</span>
              </div>
              <template v-slot:append>
                <v-icon size="x-small" class="ml-1">mdi-chevron-down</v-icon>
              </template>
            </v-btn>

            <!-- 网页搜索按钮 -->
            <v-btn
              v-if="settings.enableWebSearch === true"
              :color="enableWebSearch ? 'primary' : ''"
              variant="outlined"
              rounded="pill"
              size="small"
              class="mr-2 my-1"
              prepend-icon="mdi-web"
              @click="enableWebSearch = !enableWebSearch"
            >
              {{ t("webSearch") }}
              <template v-slot:append>
                <v-icon
                  size="x-small"
                  :color="enableWebSearch ? 'aliceblue' : ''"
                  class="ml-1"
                >
                  {{
                    enableWebSearch ? "mdi-check-circle" : "mdi-circle-outline"
                  }}
                </v-icon>
              </template>
            </v-btn>

            <!-- 节俭模式按钮 -->
            <div
              v-if="settings.frugalMode === true"
              class="d-flex align-center"
            >
              <v-btn
                :color="frugalMode ? 'primary' : ''"
                variant="outlined"
                rounded="pill"
                size="small"
                class="mr-2 my-1"
                prepend-icon="mdi-lightning-bolt"
                @click="frugalMode = !frugalMode"
              >
                {{ t("frugalMode") }}
                <template v-slot:append>
                  <v-icon
                    size="x-small"
                    :color="frugalMode ? 'aliceblue' : ''"
                    class="ml-1"
                  >
                    {{ frugalMode ? "mdi-check-circle" : "mdi-circle-outline" }}
                  </v-icon>
                </template>
              </v-btn>

              <v-tooltip
                :text="t('frugalModeTip')"
                location="top"
                max-width="300"
              >
                <template v-slot:activator="{ props }">
                  <v-btn
                    icon
                    variant="text"
                    v-bind="props"
                    class="ml-0"
                    density="comfortable"
                    size="small"
                  >
                    <v-icon color="grey" size="small"
                      >mdi-help-circle-outline</v-icon
                    >
                  </v-btn>
                </template>
              </v-tooltip>
            </div>
          </div>
        </div>
        <!-- 引入模型选择器组件 -->
        <ModelSelector
          v-model="showModelSelector"
          @select="handleModelSelect"
        />
      </v-card>
    </div>
  </div>
  <v-snackbar v-model="snackbar" multi-line location="top">
    {{ snackbarText }}

    <template v-slot:actions>
      <v-btn color="red" variant="text" @click="snackbar = false">
        <v-icon>mdi-close</v-icon>
        Close
      </v-btn>
    </template>
  </v-snackbar>
</template>

<style scoped>
/* 主容器 */
.chat-container {
  position: relative;
  height: 100vh;
  width: 100%;
  overflow-x: hidden;
  padding-bottom: calc(var(--chat-footer-height) + 16px); /* 底部留出空间 */
  --chat-footer-height: 140px; /* 根据底部控制面板的实际高度调整 */
}

/* 消息区域 */
.messages-area {
  height: 100%;
  width: 100%;
  overflow-y: auto;
  padding-bottom: 20px; /* 额外底部空间，避免最后一条消息太靠近底部 */
}

.messages-content {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

/* 固定在底部的页脚 */
.footer-fixed {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 100;
  background-color: var(--v-theme-surface);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1); /* 添加阴影，增加层次感 */
}

.message-control-panel {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  background-color: var(--v-theme-surface);
  /* 确保面板不会超出屏幕底部 */
  max-height: calc(100vh - 50px);
  overflow-y: auto;
}

/* 深色主题适配 */
:deep(.v-theme--dark) .message-control-panel {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
}

@media (max-width: 600px) {
  .chat-container {
    --chat-footer-height: 160px; /* 在小屏幕上可能需要更多空间 */
  }

  .d-flex.align-center.flex-wrap {
    justify-content: space-between;
  }

  /* 在移动设备上可能需要调整一些间距和大小 */
  .message-control-panel {
    padding: 10px !important;
  }
}

/* 针对小屏幕设备的额外样式 - 当键盘弹出时 */
@media screen and (max-height: 450px) {
  .footer-fixed {
    position: sticky; /* 在键盘弹出时改为sticky定位 */
    bottom: 0;
  }

  .chat-container {
    padding-bottom: 16px; /* 减小底部填充 */
  }
}
</style>
