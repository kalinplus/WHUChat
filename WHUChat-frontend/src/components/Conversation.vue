<script setup lang="ts">
import {
  EventStreamContentType,
  fetchEventSource,
} from "@microsoft/fetch-event-source";

// TODO: 将 fetch-event-source 改为 http 的某个流式传输
// const { $i18n, $settings } = useNuxtApp();
// const runtimeConfig = useRuntimeConfig();
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useStateStore } from "@/stores/states";
import { storeToRefs } from "pinia";
import { addConversation } from "@/utils/helper";
// const stateStore = useStateStore();
const { t } = useI18n();
// const currentModel = useCurrentModel();
// const openaiApiKey = useApiKey();
const { currentModel } = storeToRefs(useStateStore());
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

const typewriter = import.meta.env.VITE_TYPEWRITER === "true";
const typewriterDelay = import.meta.env.VITE_TYPEWRITERDELAY as number;
const processMessageQueue = () => {
  if (isProcessingQueue || messageQueue.length === 0) {
    return;
  }
  if (
    !props.conversation.messages[props.conversation.messages.length - 1].is_bot
  ) {
    props.conversation.messages.push({ id: null, is_bot: true, message: "" });
  }
  isProcessingQueue = true;
  const nextMessage = messageQueue.shift();
  if (typewriter) {
    let wordIndex = 0;
    const intervalId = setInterval(() => {
      props.conversation.messages[
        props.conversation.messages.length - 1
      ].message += nextMessage[wordIndex];
      wordIndex++;
      if (wordIndex === nextMessage.length) {
        clearInterval(intervalId);
        isProcessingQueue = false;
        processMessageQueue();
      }
    }, typewriterDelay);
  } else {
    props.conversation.messages[
      props.conversation.messages.length - 1
    ].message += nextMessage;
    isProcessingQueue = false;
    processMessageQueue();
  }
};

let ctrl: any;
const abortFetch = () => {
  if (ctrl) {
    ctrl.abort();
  }
  fetchingResponse.value = false;
};
const fetchReply = async (message: any) => {
  ctrl = new AbortController();

  let msg = message;
  if (Array.isArray(message)) {
    msg = message[message.length - 1];
  } else {
    message = [message];
  }
  // TODO: 明确params的内容
  let webSearchParams: { [key: string]: any } = {};
  if (enableWebSearch.value || msg.tool == "web_search") {
    webSearchParams["web_search"] = {
      ua: navigator.userAgent,
      default_prompt: t("webSearchDefaultPrompt"),
    };
  }

  if (msg.tool == "web_search") {
    msg.tool_args = webSearchParams["web_search"];
    msg.type = 100;
  } else if (msg.tool == "arxiv") {
    msg.tool_args = null;
    msg.type = 110;
  }

  // TODO: 更改发送数据定义以适应我们的接口
  const data = Object.assign(
    {},
    currentModel.value,
    {
      // openaiApiKey: null,
      // $settings.open_api_key_setting === "True" ? openaiApiKey.value : null,
      message: message,
      conversationId: props.conversation.id,
      frugalMode: frugalMode.value,
    },
    webSearchParams
  );

  try {
    await fetchEventSource("/api/conversation/", {
      signal: ctrl.signal,
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      openWhenHidden: true,
      onopen: async (response) => {
        if (
          response.ok &&
          response.headers.get("content-type") === EventStreamContentType
        ) {
          return;
        }
        throw new Error(
          `Failed to send message. HTTP ${response.status} - ${response.statusText}`
        );
      },
      onclose() {
        if (ctrl.signal.aborted === true) {
          return;
        }
        throw new Error(
          `Failed to send message. Server closed the connection unexpectedly.`
        );
      },
      onerror(err: any) {
        throw err;
      },
      async onmessage(message: any) {
        const event = message.event;
        const data = JSON.parse(message.data);

        if (event === "error") {
          abortFetch();
          showSnackbar(data.error);
          return;
        }

        if (event === "userMessageId") {
          props.conversation.messages[
            props.conversation.messages.length - 1
          ].id = data.userMessageId;
          return;
        }

        if (event === "done") {
          abortFetch();
          props.conversation.messages[
            props.conversation.messages.length - 1
          ].id = data.messageId;
          if (!props.conversation.id) {
            props.conversation.id = data.conversationId;
            // genTitle(props.conversation.id);
          }
          if (data.newDocId) {
            editor.value?.refreshDocList();
          }
          return;
        }

        messageQueue.push(data.content);
        processMessageQueue();

        scrollChatWindow();
      },
    });
  } catch (err: any) {
    console.log(err);
    abortFetch();
    showSnackbar(err.message);
  }
};

const grab = ref<{
  scrollIntoView: (obj: { behavior: string }) => void;
} | null>(null);
const scrollChatWindow = () => {
  if (grab.value === null) {
    return;
  }
  grab.value?.scrollIntoView({ behavior: "smooth" });
};

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

const enableWebSearch = ref(false);

// onMounted(() => {
//   currentModel.value = getCurrentModel();
// });
</script>

<template>
  <v-footer app class="footer">
    <v-card flat width="100%" class="message-control-panel pa-3">
      <div class="d-flex flex-column">
        <!-- 上部分：消息编辑区和停止按钮 -->
        <div class="d-flex align-center">
          <v-btn v-show="fetchingResponse" @click="stop" class="mr-3" icon color="error">
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
          <Prompt v-show="!fetchingResponse" :use-prompt="usePrompt" class="mr-2" />

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
            style="margin-left: 10px"
          >
            {{ t('webSearch') }}
            <template v-slot:append>
              <v-icon size="x-small" :color="enableWebSearch ? 'aliceblue' : ''" class="ml-1">
                {{ enableWebSearch ? 'mdi-check-circle' : 'mdi-circle-outline' }}
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
              {{ t('frugalMode') }}
              <template v-slot:append>
                <v-icon size="x-small" :color="frugalMode ? 'aliceblue' : ''" class="ml-1">
                  {{ frugalMode ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                </v-icon>
              </template>
            </v-btn>

            <v-tooltip :text="t('frugalModeTip')" location="top" max-width="300">
              <template v-slot:activator="{ props }">
                <v-btn
                  icon
                  variant="text"
                  v-bind="props"
                  class="ml-0"
                  density="comfortable"
                  size="small"
                >
                  <v-icon color="grey" size="small">mdi-help-circle-outline</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </div>
        </div>
      </div>
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
