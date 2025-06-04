<script setup lang="ts">
import { ref, onUnmounted, nextTick, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useStateStore } from "@/stores/states";
import { storeToRefs } from "pinia";
import { addConversation } from "@/utils/helper";
import ModelSelector from "./ModelSelector.vue";
import type {
  ChatParameters,
  ChatRequestData,
  BrowseMessagesResponse,
  MessageItem,
  FormattedMessage,
  PromptArrayItem,
} from "@/types/types";
import axios from "axios";

// const openaiApiKey = useApiKey();
const { t } = useI18n();
const stateStore = useStateStore();
const { currentModel } = storeToRefs(stateStore);
// TODO: 明确message的内容
const messageQueue: { [key: string]: any } = [];
// 定义标记常量
const START_MARKER = "\u001c\u001c\u001c";
// 前端检测结束的标志，理论上是 content 结束，不会检测 end 标记（虽然二者现在一样）
const END_MARKER = "\u001c\u200c\u001c";
const router = useRouter();

interface Settings {
  enableWebSearch: boolean;
  frugalMode: boolean;
}

const settings = ref<Settings>({
  enableWebSearch: true,
  frugalMode: true,
});
let isProcessingQueue = false;

// 1. 添加保存设置的函数
const loadSavedSettings = () => {
  try {
    const savedSettings = localStorage.getItem("chatSettings");
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      return {
        enableWebSearch: parsed.enableWebSearch ?? true,
        frugalMode: parsed.frugalMode ?? false,
      };
    }
  } catch (e) {
    console.error("Failed to load saved settings:", e);
  }
  return {
    enableWebSearch: true,
    frugalMode: false,
  };
};

// 使用加载的设置初始化变量
const savedSettings = loadSavedSettings();

// 2. 添加保存设置的函数
const saveSettings = () => {
  try {
    localStorage.setItem(
      "chatSettings",
      JSON.stringify({
        enableWebSearch: enableWebSearch.value,
        frugalMode: frugalMode.value,
      })
    );
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
};

const enableWebSearch = ref(savedSettings.enableWebSearch);
const frugalMode = ref(savedSettings.frugalMode);

// 3. 修改设置变化的处理函数
const toggleFrugalMode = () => {
  frugalMode.value = !frugalMode.value;
  saveSettings();
};

const toggleWebSearch = () => {
  enableWebSearch.value = !enableWebSearch.value;
  saveSettings();
};

// 4. 保持与 settings 对象的同步
watch(
  [enableWebSearch, frugalMode],
  ([newEnableWebSearch, newFrugalMode]) => {
    settings.value = {
      enableWebSearch: newEnableWebSearch,
      frugalMode: newFrugalMode,
    };
  },
  { immediate: true }
);

const props = defineProps({
  conversation: {
    type: Object,
    required: true,
  },
});

// 模型选择对话框控制
const showModelSelector = ref(false);

const typewriter = import.meta.env.VITE_TYPEWRITER === "true";
const typewriterDelay = import.meta.env.VITE_TYPEWRITERDELAY as number;
let typewriterIntervalId: ReturnType<typeof setInterval> | null = null;

const processMessageQueue = () => {
  console.log("processMessageQueue 开始");
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

  if (!messageText || messageText.trim() === "") {
    console.log("Empty message in queue, skipping...");
    isProcessingQueue = false;
    processMessageQueue(); // 继续处理队列中的下一条消息
    return;
  }
  // 打字机效果
  if (typewriter && messageText.length > 0 && stateStore.fetchingResponse) {
    let wordIndex = 0;
    if (typewriterIntervalId) clearInterval(typewriterIntervalId);
    typewriterIntervalId = setInterval(() => {
      if (
        wordIndex < messageText.length &&
        props.conversation.messages.length > 0 &&
        stateStore.fetchingResponse
      ) {
        props.conversation.messages[
          props.conversation.messages.length - 1
        ].message += messageText[wordIndex];
        wordIndex++;
      } else {
        if (typewriterIntervalId !== null) {
          clearInterval(typewriterIntervalId);
        }
        typewriterIntervalId = null;
        isProcessingQueue = false;
        // 只有在还在获取响应时才继续处理队列
        if (stateStore.fetchingResponse) {
          processMessageQueue();
        }
      }
    }, typewriterDelay);
  } else {
    if (props.conversation.messages.length > 0) {
      props.conversation.messages[
        props.conversation.messages.length - 1
      ].message += messageText;
    }
    isProcessingQueue = false;
    // 只有在还在获取响应时才继续处理队列
    if (stateStore.fetchingResponse) {
      processMessageQueue();
    }
  }
  console.log("processMessageQueue 结束");
};

const clearTypewriter = () => {
  console.log("clearTypewriter 开始");
  if (typewriterIntervalId) {
    clearInterval(typewriterIntervalId);
    typewriterIntervalId = null;
    console.log("Typewriter interval cleared.");
  }
  console.log("clearTypewriter 结束");
};

// 超时熔断机制
const WEBSOCKET_TIMEOUT_DURATION = 120000; // 60 seconds in milliseconds
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
  if (stateStore.fetchingResponse && wsConnected.value) {
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
      console.log("resetWebsocketTimeout abortFetch 被调用了");
      abortFetch(1001, "WebSocket timeout");
    }, WEBSOCKET_TIMEOUT_DURATION);
  }
};

// WebSocket 变量
const ws = ref<WebSocket | null>(null);
const wsConnected = ref(false);

const setupWebSocket = (sessionId: number) => {
  console.log("setupWebSocket 开始");

  // 关闭已存在的连接
  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.close(1000, "New connection requested");
  }

  const modelId =
    typeof currentModel.value.model_id === "string"
      ? parseInt(currentModel.value.model_id as string, 10)
      : (currentModel.value.model_id as number);

  const wsUrl = `wss://${
    stateStore.addr
  }/api/v1/ws/trans_ans?uuid=${encodeURIComponent(
    stateStore.user?.uuid || 1
  )}&session_id=${encodeURIComponent(sessionId)}}`;

  console.log("Connecting to WebSocket:", wsUrl);
  ws.value = new WebSocket(wsUrl);
  // 打开连接时
  ws.value.onopen = () => {
    console.log("ws.value.onopen 开始");
    wsConnected.value = true;
    console.log("WebSocket connected");
    resetWebsocketTimeout();

    if (props.conversation.messages.length === 0) {
      props.conversation.messages.push({ id: null, is_bot: true, message: "" });
    } else if (
      !props.conversation.messages[props.conversation.messages.length - 1]
        .is_bot
    ) {
      props.conversation.messages.push({ id: null, is_bot: true, message: "" });
    }

    const hardTimeout = setTimeout(() => {
      if (stateStore.fetchingResponse) {
        console.warn("Hard timeout reached - forcing connection closed");
        console.log("setupWebSocket abortFetch 被调用了");
        abortFetch(1001, "Response never completed");
        showSnackbar("总响应超时，已强制结束连接");
      }
    }, 120000);

    ws.value?.addEventListener("close", () => clearTimeout(hardTimeout));
  };

  // 接收消息时
  ws.value.onmessage = (event) => {
    console.log("ws.value.onmessage 开始");
    resetWebsocketTimeout();

    const messageData =
      typeof event.data === "string" ? event.data : event.data.toString();
    // console.log("WebSocket raw message received:", messageData);

    if (messageData === START_MARKER) {
      // hasReceivedStartMarker = true;
      console.log("Received start marker.");
    } else if (messageData === END_MARKER) {
      // hasReceivedEndMarker = true;
      console.log("Received end marker.");
      // 直接调用 abortFetch，不再等待打字机
      console.log("ws.value.onmessage END_MARKER abortFetch 被调用了");
            // Update the last message if it's a bot message
            if (props.conversation.messages.length > 0) {
        const lastMessage =
          props.conversation.messages[props.conversation.messages.length - 1];
        console.log("lastMessage is: ", lastMessage);
        if (lastMessage.is_bot &&  lastMessage.message === "") {
          // Use nextTick to ensure UI updates before potential abort delays
          nextTick(() => {
            lastMessage.message = "服务器繁忙，请稍后重试";
          });
        }
      }
      abortFetch(1000, "Client received end marker");
    } else {
      if (messageData && messageData.trim() !== "") {
        messageQueue.push(messageData);
        processMessageQueue();
        scrollChatWindow();
      } else {
        console.log("Received empty message data, skipping...");
      }
    }
  };

  // 错误和关闭处理
  ws.value.onerror = (error) => {
    console.log("ws.value.onerror 开始");

    console.error("WebSocket onerror event:", error);
    stateStore.fetchingResponse = false;
    clearWebsocketTimeout();
    wsConnected.value = false;

    clearTypewriter();
    while (messageQueue.length > 0) {
      messageQueue.shift();
    }
    isProcessingQueue = false;

    showSnackbar(t("webSocketConnectionError"));
    // 根据旧代码逻辑，onerror 也会调用 abortFetch 来确保清理
    console.log("ws.value.onerror abortFetch 被调用了");
    abortFetch(1006, "WebSocket error occurred");
  };

  ws.value.onclose = (event) => {
    console.log("ws.value.onclose 开始");
    console.log(
      `WebSocket onclose event. Code: ${event.code}, Reason: ${event.reason}, WasClean: ${event.wasClean}`
    );

    stateStore.fetchingResponse = false;
    clearWebsocketTimeout();
    wsConnected.value = false;

    clearTypewriter();
    while (messageQueue.length > 0) {
      messageQueue.shift();
    }
    isProcessingQueue = false;

    // 清理新会话数据
    // clearNewSessionData();

    ws.value = null;

    console.log(
      `WebSocket connection closed: Code ${event.code}, Reason: ${event.reason}`
    );

    if (event.code !== 1000) {
      if (event.code !== 1001 || event.reason !== "WebSocket timeout") {
        showSnackbar(
          `Connection closed unexpectedly (${event.code}). Please try again.`
        );
      }
    }
  };
};

// 终止函数，同时处理HTTP请求和WebSocket
let ctrl: AbortController | null = null;
let fetchTimeout: ReturnType<typeof setTimeout> | null = null;
const abortFetch = (closeCode: number = 1000, closeReason: string) => {
  console.log("abortFetch 开始");
  console.log(`abortFetch called. Reason: ${closeReason}, Code: ${closeCode}`);

  // clearTypewriter();

  // while (messageQueue.length > 0) {
  //   messageQueue.shift();
  // }
  // isProcessingQueue = false;
  stateStore.fetchingResponse = false;

  if (stateStore.fetchingResponse) {
    stateStore.fetchingResponse = false;
    console.log("fetchingResponse set to false by abortFetch");

    nextTick(() => {
      console.log(
        "fetchingResponse state after nextTick:",
        stateStore.fetchingResponse
      );
    });
  }

  // 清理新会话数据
  // clearNewSessionData();

  clearWebsocketTimeout();

  if (fetchTimeout) {
    clearTimeout(fetchTimeout);
    fetchTimeout = null;
    console.log("HTTP fetchTimeout cleared by abortFetch");
  }

  if (ctrl) {
    try {
      ctrl.abort();
      console.log("HTTP AbortController aborted by abortFetch");
    } catch (e) {
      console.error("Error aborting HTTP controller:", e);
    }
    ctrl = null;
  }

  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    console.log(
      `Closing WebSocket with code: ${closeCode}, reason: ${closeReason}`
    );
    console.log(
      "Conversation.vue abortFetch ws.value.close 被调用了 ！！！！！"
    );
    ws.value.close(closeCode, closeReason);
  } else if (ws.value) {
    console.log(`WebSocket not open, current state: ${ws.value.readyState}`);
  } else {
    console.log("WebSocket instance is null in abortFetch");
  }
  // 这个状态应该由 onclose 控制
  // if (ws.value && ws.value.readyState === WebSocket.CLOSED) {
  //   ws.value = null;
  //   wsConnected.value = false;
  // }
};

// 用于管理新会话的状态
const newSessionData = ref<{
  sessionId: number | null;
  title: string | null;
  needsRouteUpdate: boolean;
  needsTitleUpdate: boolean;
}>({
  sessionId: null,
  title: null,
  needsRouteUpdate: false,
  needsTitleUpdate: false,
});

// 清除新会话数据
const clearNewSessionData = () => {
  console.log("clearNewSessionData 开始");
  newSessionData.value = {
    sessionId: null,
    title: null,
    needsRouteUpdate: false,
    needsTitleUpdate: false,
  };
};

// 发送对话，获取请求
const fetchReply = async (message: PromptArrayItem[]) => {
  // 创建 AbortController 用于取消 HTTP 请求
  console.log("fetchReply 开始");
  ctrl = new AbortController();

  // 添加请求超时
  fetchTimeout = setTimeout(() => {
    console.log("fetchReply abortFetch1 被调用了");
    abortFetch(1001, "HTTP request timeout");
    showSnackbar("请求超时，请检查网络连接");
  }, Number(import.meta.env.VITE_SEND_TIMEOUT));

  if (!Array.isArray(message)) {
    message = [message];
  }

  // 格式化用户消息为接口需要的格式
  const formattedPrompt: PromptArrayItem[] = message.map(
    (m: PromptArrayItem) => ({
      type: m.type === "image" ? "image" : "text",
      text: m.text,
    })
  );

  const modelId =
    typeof currentModel.value.model_id === "string"
      ? parseInt(currentModel.value.model_id as string, 10)
      : (currentModel.value.model_id as number);

  if (isNaN(modelId)) {
    console.error("Invalid model ID:", currentModel.value.model_id);
    showSnackbar(t("invalidModelId"));
    stateStore.fetchingResponse = false; // 重置状态
    return;
  }

  const requestData: ChatRequestData = {
    uuid: stateStore.user?.uuid || 1,
    session_id: props.conversation.id || null,
    sender: "user",
    model_id: modelId,
    prompt: formattedPrompt,
    parameters: {
      temperature: 0.7,
      frugalMode: frugalMode.value,
      reasonable: false,
      ...(enableWebSearch.value && {
        online: true,
        ua: navigator.userAgent,
      }),
    } as ChatParameters,
  };

  console.log(
    "Sending chat request with model:",
    currentModel.value.name,
    "(ID:",
    requestData.model_id,
    ")"
  );

  if (currentModel.value.api_key) {
    requestData.api_key = currentModel.value.api_key;
    console.log("Using model-specific API key");
  }

  if (currentModel.value.custom_url) {
    requestData.URL = currentModel.value.custom_url;
    console.log("Using custom URL:", currentModel.value.custom_url);
  }

  try {
    stateStore.fetchingResponse = true;

    const response = await fetch(
      `https://${stateStore.addr}/api/v1/chat/send_message`,
      {
        signal: ctrl.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestData),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const responseData = await response.json();

    if (responseData.error !== 0) {
      throw new Error(`API error: ${responseData.error}`);
    }

    // 清除超时
    if (fetchTimeout) {
      clearTimeout(fetchTimeout);
      fetchTimeout = null;
    }

    // 如果是新对话，先保存会话信息，但不立即更新路由和标题
    const isNewConversation = !props.conversation.id && responseData.session_id;

    if (isNewConversation) {
      // 立即更新 conversation ID，这样 WebSocket 可以正确连接
      props.conversation.id = responseData.session_id;

      // // 保存新会话数据，等待消息接收完成后处理
      // newSessionData.value = {
      //   sessionId: responseData.session_id,
      //   title: formattedPrompt[0]?.text?.substring(0, 10) || t("new Chat"),
      //   needsRouteUpdate: true,
      //   needsTitleUpdate: true,
      // };
      props.conversation.title =
        formattedPrompt[0]?.text?.substring(0, 20) || t("new Chat");
      addConversation(props.conversation); // 确保新会话被添加到列表
      router.push(`/chat/${stateStore.user?.uuid}/${responseData.session_id}`);

      // console.log(
      //   "New session created, data saved for post-processing:",
      //   newSessionData.value
      // );
    }
    clearNewSessionData();
    // 建立WebSocket连接
    setupWebSocket(responseData.session_id || props.conversation.id);
  } catch (err: any) {
    stateStore.fetchingResponse = false;
    console.error("Fetch reply error:", err);
    clearNewSessionData(); // 清理新会话数据
    console.log("fetchReply abortFetch2 被调用了");
    abortFetch(1000, "Fetch reply failed");
    showSnackbar(err.message || t("fetchReplyError"));
  }
};

// 消息接收完成后的处理函数
const handleMessageComplete = async () => {
  console.log("Message complete handling (simplified).");
  // 旧代码逻辑下，大部分状态更新和UI操作在WebSocket事件处理器或abortFetch中直接完成
  // 如果新会话的路由和标题更新仍然需要，可以保留简化版本：
  if (newSessionData.value.sessionId && newSessionData.value.needsRouteUpdate) {
    // await router.push(`/chat/${stateStore.user?.uuid}/${newSessionData.value.sessionId}`);
    // console.log("Route updated for new session (simplified).");
  }
  if (
    newSessionData.value.sessionId &&
    newSessionData.value.needsTitleUpdate &&
    newSessionData.value.title
  ) {
    // updateConversationTitleAsync(newSessionData.value.sessionId, newSessionData.value.title);
    // console.log("Title update initiated for new session (simplified).");
  }
  clearNewSessionData(); // 总是清理
};

// 异步标题更新函数
const updateConversationTitleAsync = async (
  sessionId: number,
  title: string
) => {
  try {
    const updateTitleRequestData = {
      new_title: title,
      uuid: stateStore.user?.uuid || 1,
      session_id: sessionId,
    };

    console.log("Updating title with data:", updateTitleRequestData);

    const updateTitleResponse = await fetch(
      `https://${stateStore.addr}/api/v1/chat/update_title`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updateTitleRequestData),
      }
    );

    if (!updateTitleResponse.ok) {
      const errorText = await updateTitleResponse.text();
      console.error(
        `Failed to update title: HTTP ${updateTitleResponse.status}. Response: ${errorText}`
      );
      return;
    }

    const updateTitleResponseData = await updateTitleResponse.json();
    if (updateTitleResponseData.error !== 0) {
      console.error(
        `Failed to update title: API error code ${updateTitleResponseData.error}, Message: ${updateTitleResponseData.message}`
      );
      return;
    }

    console.log("Conversation title updated successfully via API.");

    // 🔧 安全地更新本地标题
    if (props.conversation && typeof props.conversation === "object") {
      (props.conversation as any).title = title;
      await nextTick(); // 确保 UI 更新
    }
  } catch (titleError) {
    console.error("Error in async title update:", titleError);
    // 标题更新失败不影响聊天功能
  }
};

// 自动滚动聊天窗口
const grab = ref<{
  scrollIntoView: (obj: { behavior: string }) => void;
} | null>(null);

const scrollChatWindow = () => {
  console.log("scrollChatWindow 开始");
  // @ts-ignore
  const parent = grab.value?.parentElement;
  if (parent) {
    parent.scrollTop = parent.scrollHeight; // 简化滚动逻辑，直接到底部
  }
};

// 发送prompt, message 对应 MsgEditor 中 send 方法发送的
const send = (message: any) => {
  console.log("send 开始");
  stateStore.fetchingResponse = true;
  if (props.conversation.messages.length === 0 && !props.conversation.id) {
    // addConversation(props.conversation);
  }
  const userMessage = {
    is_bot: false,
    message: "",
    message_type: "text", // 默认
  };
  if (Array.isArray(message)) {
    props.conversation.messages.push(
      ...message.map((i) => ({
        message: i.content,
        message_type: i.message_type,
      }))
    );
  } else {
    props.conversation.messages.push({
      message: message.text,
      message_type: message.type,
    });
  }
  fetchReply(message);
  scrollChatWindow();
};
const stop = () => {
  console.log("stop 开始");
  console.log("Stop function called");
  // 立即重置状态
  stateStore.fetchingResponse = false;
  // 清除打字机效果
  clearTypewriter();
  // 清空消息队列
  while (messageQueue.length > 0) {
    messageQueue.shift();
  }
  isProcessingQueue = false;
  // 关闭连接
  console.log("stop abortFetch 被调用了");
  abortFetch(1000, "User manually canceled");

  showSnackbar("回答已取消");
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
  console.log("handleModelSelect 开始");
  if (model) {
    // 更新 Pinia store 中的模型
    stateStore.setCurrentModel(model);
  }
  // 关闭模型选择器
  showModelSelector.value = false;
};

// 组件卸载时的清理
onUnmounted(() => {
  console.log("onUnmounted 开始");
  console.log("Conversation component unmounting, cleaning up...");

  // clearNewSessionData();

  // abortFetch 会处理 ws.value.close()
  // 但如果组件卸载时仍在 fetchingResponse，可能需要主动调用
  if (stateStore.fetchingResponse) {
    abortFetch(1000, "Component unmounted");
  } else if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.close(1000, "Component unmounted");
  }

  clearTypewriter();
  clearWebsocketTimeout();
  // stateStore.fetchingResponse = false;

  while (messageQueue.length > 0) {
    messageQueue.shift();
  }
  isProcessingQueue = false;
});

/**
 * 加载当前会话的所有历史对话消息
 */
const loadConversationHistory = async () => {
  console.log("loadConversationHistory 开始");
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

  // 检查用户是否已认证
  if (!stateStore.user) {
    console.log(
      "User not authenticated, cannot load history for session ID:",
      props.conversation.id
    );
    if (props.conversation) {
      props.conversation.loadingMessages = false;
    }
    return;
  }

  // 检查服务器地址是否可用
  if (!stateStore.addr) {
    console.log("Server address not available, cannot load history");
    if (props.conversation) {
      props.conversation.loadingMessages = false;
    }
    return;
  }

  console.log(
    `Loading history for session ID: ${props.conversation.id}, user: ${stateStore.user.uuid}`
  );

  try {
    // 设置加载状态
    props.conversation.loadingMessages = true;

    // 清空现有消息，避免污染
    props.conversation.messages = [];

    const requestData = {
      uuid: stateStore.user.uuid,
      session_id: props.conversation.id,
    };

    console.log("Sending browse_messages request with data:", requestData);

    // 使用axios发送请求获取历史消息
    const response = await axios.post(
      `https://${stateStore.addr}/api/v1/chat/browse_messages`,
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true, // 添加这一行来显式携带 cookie
      }
    );

    const data: BrowseMessagesResponse = response.data;
    console.log("History Response Data:", data);

    // 检查后端返回的业务错误
    if (response.data.error !== 0) {
      throw new Error(`API error code: ${data.error}`);
    }

    // 处理返回的消息，转换为组件需要的格式
    if (data.messages) {
      const formattedMessages: FormattedMessage[] = data.messages.map(
        (backendMsg: MessageItem) => {
          const isBot = backendMsg.sender === "assistant";

          // 获取消息内容
          let messageContent;
          let messageType = "text"; // 默认为文本

          // 处理 prompt 中的内容
          if (backendMsg.prompt) {
            if (Array.isArray(backendMsg.prompt)) {
              // 处理数组形式的 prompt (向后兼容)
              const prompt_array: PromptArrayItem[] =
                backendMsg.prompt as PromptArrayItem[];
              for (const part of prompt_array) {
                if (part.text) {
                  // 只考虑文本
                  messageContent = part.text;
                }
              }
            }
          }

          // 清理 messageContent 中的 START_MARKER 和 END_MARKER
          if (typeof messageContent === "string") {
            messageContent = messageContent
              .replace(new RegExp(START_MARKER, "g"), "")
              .replace(new RegExp(END_MARKER, "g"), "");
          }

          // 如果没有找到内容，使用备用值
          if (!messageContent) {
            messageContent = "Gemini 2.5 Pro 是世界上最好的模型";
          }

          // 创建前端消息对象
          return {
            id: backendMsg.id,
            sender: backendMsg.sender, // sender 和 message_type 在 message 是数组时不一样，都要
            is_bot: isBot,
            message: messageContent,
            message_type: messageType,
            model_id: backendMsg.model_id,
            model_class: backendMsg.model_class,
          } as FormattedMessage;
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
    console.log(`[CONV_WATCH] ID changed: ${oldId} -> ${newId}`);
    clearNewSessionData(); // 切换会话时，清除旧的新会话数据

    if (newId !== null && newId !== undefined) {
      if (!stateStore.user) {
        console.log(
          "[CONV_WATCH] User not authenticated yet, skipping history load for ID:",
          newId
        );
        return;
      }
      if (
        newId !== oldId ||
        (oldId === undefined &&
          (!props.conversation.messages ||
            props.conversation.messages.length === 0))
      ) {
        console.log(
          "[CONV_WATCH] Triggering loadConversationHistory for ID:",
          newId
        );
        loadConversationHistory();
      }
    } else if (newId === null) {
      // 新建会话，清空消息
      if (props.conversation) {
        props.conversation.messages = [];
        props.conversation.loadingMessages = false;
      }
      // 如果 ws 仍然连接，关闭它
      if (ws.value && ws.value.readyState === WebSocket.OPEN) {
        ws.value.close(1000, "Switched to new unsaved conversation");
      }
      clearTypewriter();
      isProcessingQueue = false;
      while (messageQueue.length > 0) messageQueue.shift();
    }
  },
  { immediate: true }
);

// 判断是否有历史消息
const hasMessages = computed(
  () =>
    props.conversation &&
    props.conversation.messages &&
    props.conversation.messages.length > 0
);

// 监听用户状态变化，确保用户认证后能够加载历史消息
watch(
  () => stateStore.user,
  (newUser, oldUser) => {
    console.log(
      `[Conversation] User state changed: ${oldUser?.uuid} -> ${newUser?.uuid}`
    );

    if (newUser && !oldUser && props.conversation?.id) {
      // 用户刚刚认证完成，且有会话ID，立即加载历史消息
      console.log(
        "User authenticated, loading conversation history for ID:",
        props.conversation.id
      );
      loadConversationHistory();
    }
  }
);
</script>

<template>
  <!-- 主容器，添加适当的底部内边距来容纳固定在底部的输入框 -->
  <div class="chat-container">
    <!-- 渲染聊天气泡部分 -->
    <div v-if="hasMessages" class="messages-area">
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
    <div class="footer-fixed" :class="{ 'with-drawer': stateStore.drawer }">
      <v-card flat width="100%" class="message-control-panel pa-3">
        <div class="d-flex flex-column">
          <!-- 上部分：消息编辑区和停止按钮 -->
          <div class="d-flex align-center">
            <v-btn
              v-show="stateStore.fetchingResponse"
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
              :disabled="stateStore.fetchingResponse"
              :loading="stateStore.fetchingResponse"
            />
          </div>

          <!-- 下部分：功能区域 -->
          <div class="d-flex align-center flex-wrap mt-2">
            <!-- 原有按钮不变... -->
            <Prompt
              v-show="!stateStore.fetchingResponse"
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
              :color="enableWebSearch ? 'primary' : ''"
              variant="outlined"
              rounded="pill"
              size="small"
              class="mr-2 my-1"
              prepend-icon="mdi-web"
              @click="toggleWebSearch"
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
            <div class="d-flex align-center">
              <v-btn
                :color="frugalMode ? 'primary' : ''"
                variant="outlined"
                rounded="pill"
                size="small"
                class="mr-2 my-1"
                prepend-icon="mdi-lightning-bolt"
                @click="toggleFrugalMode"
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
        <!-- 模型选择器组件 -->
        <ModelSelector
          v-model="showModelSelector"
          @select="handleModelSelect"
        />
      </v-card>
    </div>
  </div>
  <!-- 临时提示组件 -->
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
  min-height: 0;
  width: 100%;
  overflow-x: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(var(--chat-footer-height) + 16px); /* 底部留出空间 */
  --chat-footer-height: 140px; /* 根据底部控制面板的实际高度调整 */
  transition: padding-left 0.5s ease;
}

.chat-container.with-drawer {
  padding-left: 300px;
}

/* 在小屏幕上，侧边栏可能是临时的覆盖模式，不需要调整宽度 */
@media (max-width: 960px) {
  .footer-fixed.with-drawer {
    left: 0;
    width: 100%;
  }
  .chat-container.with-drawer {
    padding-left: 0;
  }
}

/* 添加一个占位区域，仅当没有消息时显示 */
.empty-chat-placeholder {
  flex: 1;
  min-height: 0;
  margin-bottom: auto;
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
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1); /* 添加阴影，增加层次感 */
}
/* 侧边栏打开时的样式调整 */
.footer-fixed.with-drawer {
  left: 300px;
  width: calc(100% - 300px);
}

.message-control-panel {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  background-color: var(--v-theme-surface, white);
  backdrop-filter: blur(100px);
  -webkit-backdrop-filter: blur(100px);
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
