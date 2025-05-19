<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useStateStore } from "@/stores/states";
import { storeToRefs } from "pinia";
import { addConversation } from "@/utils/helper";
import ModelSelector from "./ModelSelector.vue"; // TODO: 稍后创建这个组件
import type {
  ChatParameters,
  ChatRequestData,
  BrowseMessagesResponse,
  MessageItem,
  FormattedMessage,
  PromptArrayItem,
} from "@/types/types";
import axios from "axios";
import { useChatSettingsManager } from "@/stores/settings";


// const openaiApiKey = useApiKey();
const { t } = useI18n();
const stateStore = useStateStore();
const { currentModel } = storeToRefs(stateStore);
// TODO: 明确message的内容
const messageQueue: { [key: string]: any } = [];
// 定义标记常量
const START_MARKER = "\u001C\u001C\u001C";
// 前端检测结束的标志，理论上是 content 结束，不会检测 end 标记（虽然二者现在一样）
const END_MARKER = "\u001C\u200C\u001C";
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
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      return {
        enableWebSearch: parsed.enableWebSearch ?? true,
        frugalMode: parsed.frugalMode ?? false
      };
    }
  } catch (e) {
    console.error('Failed to load saved settings:', e);
  }
  return {
    enableWebSearch: true,
    frugalMode: false
  };
};

// 使用加载的设置初始化变量
const savedSettings = loadSavedSettings();

// 2. 添加保存设置的函数
const saveSettings = () => {
  try {
    localStorage.setItem('chatSettings', JSON.stringify({
      enableWebSearch: enableWebSearch.value,
      frugalMode: frugalMode.value
    }));
  } catch (e) {
    console.error('Failed to save settings:', e);
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
watch([enableWebSearch, frugalMode], ([newEnableWebSearch, newFrugalMode]) => {
  settings.value = {
    enableWebSearch: newEnableWebSearch,
    frugalMode: newFrugalMode
  };
}, { immediate: true });

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
    if (typewriterIntervalId) clearInterval(typewriterIntervalId);
    typewriterIntervalId = setInterval(() => {
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
        if (typewriterIntervalId !== null) {
          clearInterval(typewriterIntervalId);
        }
        typewriterIntervalId = null;
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

const clearTypewriter = () => {
  if (typewriterIntervalId) {
    clearInterval(typewriterIntervalId);
    typewriterIntervalId = null;
    console.log("Typewriter interval cleared.");
  }
  isProcessingQueue = false; // 确保处理队列也停止
};

// 超时熔断机制
const WEBSOCKET_TIMEOUT_DURATION = 60000; // 60 seconds in milliseconds
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
      abortFetch(1001, "WebSocket timeout");
    }, WEBSOCKET_TIMEOUT_DURATION);
  }
};

// WebSocket 变量
const ws = ref<WebSocket | null>(null);
const wsConnected = ref(false);

// 设置WebSocket连接
const setupWebSocket = (sessionId: number) => {
  // 关闭已存在的连接
  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.close();
  }

  const modelId = typeof currentModel.value.model_id === 'string' 
    ? parseInt(currentModel.value.model_id as string, 10) 
    : (currentModel.value.model_id as number);

  // 创建新的WebSocket连接
  // 参考 API 文档 /api/v1/ws/trans_ans 接口

  const wsUrl = `wss://${
    import.meta.env.VITE_API_HOST
  }/api/v1/ws/trans_ans?uuid=${encodeURIComponent(
    stateStore.user?.id || 1
  )}&session_id=${encodeURIComponent(sessionId)}&model_id=${encodeURIComponent(
    modelId
  )}`;

  console.log("Connecting to WebSocket:", wsUrl);

  ws.value = new WebSocket(wsUrl);

  // 确保携带cookie (WebSocket默认会带上同源的cookie)
  // 通过同源策略，应该不会有跨域问题，因为我们使用相同的host

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

    // Add a hard timeout as a safety mechanism in case messages never complete
    const hardTimeout = setTimeout(() => {
      if (stateStore.fetchingResponse) {
        console.warn("Hard timeout reached - forcing connection closed");
        abortFetch(1001, "Response never completed");
        showSnackbar("总响应超时，已强制结束连接");
      }
    }, 60000); // 60 seconds hard timeout

    // Clean up this timeout if websocket closes
    ws.value?.addEventListener("close", () => clearTimeout(hardTimeout));
  };

  ws.value.onmessage = (event) => {
    resetWebsocketTimeout(); // Reset timer on any message received

    const messageData =
      typeof event.data === "string" ? event.data : event.data.toString();
    console.log("WebSocket raw message received:", messageData);

    if (messageData === START_MARKER) {
      console.log("Received start marker.");
    } else if (messageData === END_MARKER) {
      stateStore.fetchingResponse = false;
      console.log("Received end marker.");

      // 检查最后一条消息（应该是机器人的回复）是否为空
      let isEmptyResponse = false;
      if (props.conversation.messages.length > 0) {
        const lastMessage =
          props.conversation.messages[props.conversation.messages.length - 1];
        // 确保是机器人消息且内容为空或仅包含空白字符
        if (
          lastMessage.is_bot &&
          (!lastMessage.message || lastMessage.message.trim() === "")
        ) {
          isEmptyResponse = true;
        }
      } else {
        // 如果消息列表为空，也视为空回复
        isEmptyResponse = true;
      }

      if (isEmptyResponse) {
        console.log(
          "Bot response is empty upon END_MARKER. Setting default message."
        );
        // 获取或创建最后一条机器人消息以更新
        let targetMessage;
        if (
          props.conversation.messages.length > 0 &&
          props.conversation.messages[props.conversation.messages.length - 1]
            .is_bot
        ) {
          targetMessage =
            props.conversation.messages[props.conversation.messages.length - 1];
        } else {
          // 如果最后一条不是机器人消息或列表为空，则添加新的机器人消息
          const newBotMessage = {
            id: null,
            is_bot: true,
            message: "", // 初始为空，下面会设置默认消息
            message_type: "text", // 假设默认为文本类型
          };
          props.conversation.messages.push(newBotMessage);
          targetMessage = newBotMessage;
        }
        targetMessage.message = t("emptyResponseFromServer");

        // 使用 nextTick 确保 UI 更新
        nextTick(() => {
          scrollChatWindow();
        });
      }

      // Close normally, abortFetch will clear the timer
      abortFetch(1000, "Client received end marker");
    } else {
      messageQueue.push(messageData);
      processMessageQueue();
      scrollChatWindow();
    }
  };

  ws.value.onerror = (error) => {
    console.error("WebSocket onerror event:", error);
    clearTypewriter(); // 确保打字机也在这里被清理
    if (stateStore.fetchingResponse) {
      // 再次确认
      stateStore.fetchingResponse = false;
      console.log("fetchingResponse set to false by ws.onerror");
    }
    clearWebsocketTimeout(); // Clear timer on error
    console.error("WebSocket error:", error);
    wsConnected.value = false;
    showSnackbar("WebSocket connection error");
    // abortFetch(1006, "WebSocket error occurred");
  };

  ws.value.onclose = (event) => {
    console.log(
      `WebSocket onclose event. Code: ${event.code}, Reason: ${event.reason}, WasClean: ${event.wasClean}`
    );
    clearTypewriter();
    stateStore.fetchingResponse = false;
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
  };
};

// 修改终止函数，同时处理HTTP请求和WebSocket
let ctrl: AbortController | null = null;
let fetchTimeout: ReturnType<typeof setTimeout> | null = null;

const abortFetch = (
  closeCode: number = 1000,
  closeReason: string = "User manually cancelled"
) => {
  clearTypewriter();
  console.log(`abortFetch called. Reason: ${closeReason}, Code: ${closeCode}`); // 增加日志

  // 立即尝试重置加载状态
  if (stateStore.fetchingResponse) {
    stateStore.fetchingResponse = false;
    console.log("fetchingResponse set to false by abortFetch");
  }
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
    ws.value.close(closeCode, closeReason);
  } else if (ws.value) {
    console.log(`WebSocket not open, current state: ${ws.value.readyState}`);
  } else {
    console.log("WebSocket instance is null in abortFetch");
  }
};

// 发送对话，获取请求
const fetchReply = async (message: PromptArrayItem[]) => {
  // 创建 AbortController 用于取消 HTTP 请求
  ctrl = new AbortController();

  // 添加请求超时
  fetchTimeout = setTimeout(() => {
    abortFetch(1001, "HTTP request timeout");
    showSnackbar("请求超时，请检查网络连接");
  }, Number(import.meta.env.VITE_SEND_TIMEOUT));

  if (!Array.isArray(message)) {
    message = [message];
  }
  // 格式化用户消息为接口需要的格式
  const formattedPrompt: PromptArrayItem[] = message.map(
    (m: PromptArrayItem) => ({
      type: m.type === "image" ? "image" : "text", // 默认为text类型
      text: m.text,
    })
  );

  const modelId = typeof currentModel.value.model_id === 'string' 
    ? parseInt(currentModel.value.model_id as string, 10) 
    : (currentModel.value.model_id as number);

  // 使用当前选择的模型，而不是硬编码的ID
  const requestData: ChatRequestData = {
    uuid: stateStore.user?.id || 1, // 用户ID
    session_id: props.conversation.id || null, // 会话ID，如果是新对话则为null
    sender: "user",
    model_id: currentModel.value.model_id || currentModel.value.id || 1, // 使用当前选择的模型ID
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

  console.log("Sending chat request with model:", currentModel.value.name, "(ID:", requestData.model_id, ")");

  // 添加API密钥（如果设置了）
  if (currentModel.value.api_key) {
    requestData.api_key = currentModel.value.api_key;
    console.log("Using model-specific API key");
  }

  // 添加自定义URL（如果设置了）
  if (currentModel.value.custom_url) {
    requestData.URL = currentModel.value.custom_url;
    console.log("Using custom URL:", currentModel.value.custom_url);
  }

  try {
    stateStore.fetchingResponse = true;

    // 发送HTTP POST请求
    const baseUrl = "https://" + import.meta.env.VITE_API_HOST;
    const response = await fetch(`${baseUrl}/api/v1/chat/send_message`, {
      signal: ctrl.signal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // 显式携带cookie
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const responseData = await response.json();

    // 检查是否有错误
    if (responseData.error !== 0) {
      throw new Error(`API error: ${responseData.error}`);
    }

    // 清除超时
    if (fetchTimeout) {
      clearTimeout(fetchTimeout);
      fetchTimeout = null;
    }

    // 准备接收消息 - 建立WebSocket连接
    setupWebSocket(responseData.session_id || props.conversation.id);

    // 如果是新对话，更新对话ID
    if (!props.conversation.id && responseData.session_id) {
      props.conversation.id = responseData.session_id;

      // 路由跳转
      router.push(`/${requestData.uuid}/${responseData.session_id}`);

      const newTitle =
        formattedPrompt[0]?.text?.substring(0, 10) || t("new Chat");
      // 更新标题
      try {
        const updateTitleRequestData = {
          new_title: newTitle,
          uuid: stateStore.user?.id || 1,
          session_id: responseData.session_id,
        };

        console.log("Updating title with data:", updateTitleRequestData);
        // 假设API端点位于/api/v1/
        const updateTitleResponse = await fetch(
          `${baseUrl}/api/v1/chat/update_title`,
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
        } else {
          const updateTitleResponseData = await updateTitleResponse.json();
          if (updateTitleResponseData.error !== 0) {
            console.error(
              `Failed to update title: API error code ${updateTitleResponseData.error}, Message: ${updateTitleResponseData.message}`
            );
          } else {
            console.log("Conversation title updated successfully via API.");
            // 更新本地会话标题以提供即时UI反馈
            if (props.conversation && typeof props.conversation === "object") {
              (props.conversation as any).title = newTitle;
            }
          }
        }
      } catch (titleError) {
        console.error("Error sending update_title request:", titleError);
      }
    }
  } catch (err: any) {
    stateStore.fetchingResponse = false;
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
// 发送prompt, message 对应 MsgEditor 中 send 方法发送的
const send = (message: any) => {
  stateStore.fetchingResponse = true;
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
      message: message.text,
      message_type: message.type,
    });
  }
  fetchReply(message);
  scrollChatWindow();
};
const stop = () => {
  clearTypewriter();
  stateStore.fetchingResponse = false;
  abortFetch(1000, "User manually canceled");

  while (messageQueue.length > 0) {
    messageQueue.shift();
  }
  isProcessingQueue = false;

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

/**
 * 加载当前会话的所有历史对话消息
 */
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

    // TODO: uuid 这里要用正常逻辑，不能硬编码
    const requestData = {
      uuid: 1 || stateStore.user.id,
      session_id: props.conversation.id,
    };

    // 使用axios发送请求获取历史消息
    const baseUrl = "https://" + import.meta.env.VITE_API_HOST;
    const response = await axios.post(
      `${baseUrl}/api/v1/chat/browse_messages`,
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
                  // TODO: 暂时用这个逻辑，后面需要添加检测 type，等后端的返回值更改
                  // FIXME: 现在（和以后）只考虑文本
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
    console.log(`Conversation ID changed (watch): ${oldId} -> ${newId}`);

    if (newId !== null && newId !== undefined) {
      // 条件1: ID 确实发生了变化 (newId !== oldId)
      // 条件2: 或者 oldId 是 undefined (表示组件首次加载或页面刷新时，newId 已有值)
      //        并且当前没有消息 (避免在某些情况下重复加载)
      if (
        newId !== oldId ||
        (oldId === undefined &&
          (!props.conversation.messages ||
            props.conversation.messages.length === 0))
      ) {
        loadConversationHistory();
      }
    } else if (newId === null) {
      // newId 是 null，表示切换到新对话
      if (props.conversation) {
        // 确保 props.conversation 存在
        props.conversation.messages = [];
        props.conversation.loadingMessages = false;
      }
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
              v-if="settings.enableWebSearch === true"
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
            <div
              v-if="settings.frugalMode === true"
              class="d-flex align-center"
            >
              <v-btn
                v-if="settings.frugalMode === true"
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
