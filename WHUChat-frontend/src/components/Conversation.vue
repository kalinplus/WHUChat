<script setup lang="ts">
// import {
//   EventStreamContentType,
//   fetchEventSource,
// } from "@microsoft/fetch-event-source";

// TODO: 将 fetch-event-source 改为 http 的某个流式传输
import { ref, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useStateStore } from "@/stores/states";
import { storeToRefs } from "pinia";
import { addConversation } from "@/utils/helper";
import ModelSelector from "./ModelSelector.vue"; // 稍后创建这个组件
import type {
  PromptMessage,
  ChatParameters,
  ChatRequestData,
} from "@/types/types";

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
  const wsUrl = `ws://localhost:3000/api/v1/ws/tran_ans?uuid=${encodeURIComponent(
    stateStore.user?.id
  )}&session_id=${encodeURIComponent(sessionId)}&model_id=${encodeURIComponent(
    currentModel.value.model_id || "claude-3-haiku"
  )}`;

  console.log("Connecting to WebSocket:", wsUrl);

  ws.value = new WebSocket(wsUrl);

  // 确保携带cookie (WebSocket默认会带上同源的cookie)
  // 通过同源策略，应该不会有跨域问题，因为我们使用相同的host

  // WebSocket事件处理
  ws.value.onopen = () => {
    wsConnected.value = true;
    console.log("WebSocket connected");

    // 添加空的机器人消息，等待填充
    // 安全地检查消息数组
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
    try {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data);

      // 处理不同类型的消息
      if (data.type === "content") {
        // 确保内容是有效的字符串
        const content =
          typeof data.content === "string"
            ? data.content
            : data.content?.toString() || "";

        // 添加内容到消息队列
        messageQueue.push(data.content);
        processMessageQueue();
        scrollChatWindow();
      } else if (data.type === "error") {
        showSnackbar(data.message || "Error occurred");
        abortFetch();
      } else if (data.type === "done") {
        // 消息完成
        abortFetch();
        if (data.message_id) {
          props.conversation.messages[
            props.conversation.messages.length - 1
          ].id = data.message_id;
        }
      }
    } catch (e) {
      console.error("Failed to parse WebSocket message", e);
      // 尝试显示原始消息
      try {
        const rawContent =
          typeof event.data === "string"
            ? event.data
            : event.data?.toString() || "";

        if (rawContent) {
          messageQueue.push(rawContent);
          processMessageQueue();
        }
      } catch (err) {
        console.error("Could not process raw message:", err);
      }
    }
  };

  ws.value.onerror = (error) => {
    console.error("WebSocket error:", error);
    wsConnected.value = false;
    showSnackbar("WebSocket connection error");
    abortFetch();
  };

  ws.value.onclose = (event) => {
    wsConnected.value = false;
    console.log(
      `WebSocket connection closed: Code ${event.code}, Reason: ${event.reason}`
    );

    // 如果是异常关闭，显示提示
    if (event.code !== 1000) {
      showSnackbar(
        `Connection closed unexpectedly (${event.code}). Please try again.`
      );
    }
  };
};

// 修改终止函数，同时处理HTTP请求和WebSocket
let ctrl: any;
const abortFetch = () => {
  if (ctrl) {
    ctrl.abort();
  }

  // 关闭WebSocket连接
  if (ws.value && wsConnected.value) {
    ws.value.close();
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
  // 构建请求参数
  const requestData: ChatRequestData = {
    uuid: stateStore.user?.id, // 用户ID
    session_id: props.conversation.id || null, // 会话ID，如果是新对话则为null
    model_id: currentModel.value.model_id || "claude-3-haiku", // 模型ID
    model_class: currentModel.value.model_class || "anthropic", // 模型大类
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
    const response = await fetch(
      "http://localhost:3000/api/v1/chat/send_message",
      {
        // const response = await fetch("/api/v1/chat/send_message", {
        signal: ctrl.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      }
    );

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
  if (grab.value === null) {
    return;
  }
  grab.value?.scrollIntoView({ behavior: "smooth" });
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

const toggleMessage = (index: number) => {
  props.conversation.messages[index].is_disabled =
    !props.conversation.messages[index].is_disabled;
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

// onMounted(() => {
//   currentModel.value = getCurrentModel();
// });

onUnmounted(() => {
  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.close();
  }
});
</script>

<template>
  <v-footer app class="footer">
    <v-card flat width="100%" class="message-control-panel pa-3">
      <div class="d-flex flex-column">
        <!-- 上部分：消息编辑区和停止按钮 -->
        <div class="d-flex align-center">
          <v-btn
            v-show="fetchingResponse"
            @click="stop"
            class="mr-3"
            icon
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
          <div v-if="settings.frugalMode === true" class="d-flex align-center">
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
      <ModelSelector v-model="showModelSelector" @select="handleModelSelect" />
    </v-card>
  </v-footer>

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
.footer {
  width: 100%;
  padding: 0;
}

.message-control-panel {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  background-color: var(--v-theme-surface);
}

/* 深色主题适配 */
:deep(.v-theme--dark) .message-control-panel {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 确保按钮在小屏幕上合理换行 */
@media (max-width: 600px) {
  .d-flex.align-center.flex-wrap {
    justify-content: space-between;
  }
}
</style>
