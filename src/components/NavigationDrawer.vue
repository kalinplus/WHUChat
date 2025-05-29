<script setup lang="ts">
// TODO: 需要新增接口
import { onMounted } from "vue";
import { useDisplay, useTheme } from "vuetify";
import { useI18n } from "vue-i18n";
import {
  useConversations,
  useApiKey,
  useCurrentModel,
  useDrawer,
  useUser,
} from "../composables/states";
import { useAuthFetch } from "@/composables/fetch";
import { useRoute, useRouter } from "vue-router";
import { useStateStore } from "@/stores/states";
import UserFooter from "./UserFooter.vue";
import type { ConversationInfo, ConversationsResponse } from "@/types/types";
import { logout, getToken } from "@/utils/auth";
import axios from "axios";
import { storeToRefs } from "pinia";

const emit = defineEmits(["openSettings", "signOut"]);
const stateStore = useStateStore();
const { drawer } = storeToRefs(stateStore);

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
// const { $i18n, $settings } = useNuxtApp()
// const colorMode = useColorMode()
const theme = useTheme();

const { mdAndUp } = useDisplay();
const drawerPermanent = computed(() => {
  return mdAndUp.value;
});
const user = useUser();

const themes = ref([
  { title: t("lightMode"), value: "light" },
  { title: t("darkMode"), value: "dark" },
  { title: t("followSystem"), value: "system" },
]);
const setTheme = (theme: any) => {
  if (theme === "system") {
    // 系统主题逻辑：检查系统颜色偏好
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    theme.global.name.value = prefersDark ? "dark" : "light";

    // 保存用户选择
    localStorage.setItem("theme", "system");

    // 添加系统主题变化的监听器
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (localStorage.getItem("theme") === "system") {
          theme.global.name.value = e.matches ? "dark" : "light";
        }
      });
  } else {
    // 直接设置明确的主题
    theme.global.name.value = theme;
    localStorage.setItem("theme", theme);
  }
};
const feedback = () => {
  window.open("https://github.com/WongSaang/chatgpt-ui/issues", "_blank");
};

const conversations = useConversations();

const editingConversation = ref();
const deletingConversationIndex = ref();
/**
 *  启动编辑模式
 * @param index 会话id
 */
const editConversation = (index: number) => {
  editingConversation.value = conversations.value[index];
};
// ...existing code...
/**
 *  保存已编辑的对话标题到服务器并更新本地数据
 * @param index 会话在 conversations 数组中的索引
 */
const updateConversation = async (index: number) => {
  // editingConversation.value 是 conversations.value[index] 的引用
  // editingConversation.value.topic 已经通过 v-model 更新为输入框中的新标题
  if (
    !editingConversation.value ||
    typeof editingConversation.value.id === "undefined"
  ) {
    console.error("要编辑的会话或其ID未定义。");
    editingConversation.value = null; // 退出编辑模式
    return;
  }

  // 标记为正在更新，:loading 状态会显示
  editingConversation.value.updating = true;

  const newTitle = editingConversation.value.topic; // 从编辑对象中获取新标题
  const sessionId = editingConversation.value.id;
  const userId = stateStore.user?.uuid || 1; // 从 stateStore 获取用户ID，如果未登录则默认为1

  try {
    const { data, error } = await useAuthFetch(
      `/api/v1/chat/update_title`, // 使用新的API端点
      {
        method: "POST", // 使用 POST 方法
        body: JSON.stringify({
          new_title: newTitle,
          uuid: userId,
          session_id: sessionId,
        }),
      }
    );

    if (!error.value) {
      // API 调用成功
      // 更新 conversations 数组中对应会话的 title 属性，以便UI正确显示
      if (conversations.value[index]) {
        conversations.value[index].title = newTitle;
        // 如果 conversations.value[index].topic 也需要与 title 保持一致，可以取消下面一行的注释
        // conversations.value[index].topic = newTitle;
      }
    } else {
      // API 调用失败
      console.error("通过API更新会话标题失败:", error.value);
      showSnackbar(t("titleUpdateError"));
    }
  } catch (e: any) {
    // 捕获 useAuthFetch 或其他代码可能抛出的异常
    console.error("updateConversation API调用期间发生异常:", e);
    showSnackbar(
      t("titleUpdateError", `标题更新异常: ${e.message || "发生异常"}`)
    );
  } finally {
    // 无论成功或失败，都重置更新状态并退出编辑模式
    if (editingConversation.value) {
      editingConversation.value.updating = false;
    }
    editingConversation.value = null; // 退出编辑模式，将编辑对象置空
  }
};
/**
 *  删除会话
// ...existing code...
/**
 *  删除会话
 * @param index 会话id
 */
const deleteConversation = async (index: number) => {
  deletingConversationIndex.value = index;
  const { data, error } = await useAuthFetch(
    `/api/chat/conversations/${conversations.value[index].id}/`,
    {
      method: "DELETE",
    }
  );
  deletingConversationIndex.value = null;
  if (!error.value) {
    const deletingConversation = conversations.value[index];
    conversations.value.splice(index, 1);
    if (
      // @ts-ignore
      route.params.id &&
      // @ts-ignore
      parseInt(route.params.id) === deletingConversation.id
    ) {
      await router.push("/");
    }
  }
};

const snackbar = ref(false);
const snackbarText = ref("");
const showSnackbar = (text: string) => {
  snackbarText.value = text;
  snackbar.value = true;
};
/**
 * 创建新会话
 */
const createNewConversation = () => {
  // 判断当前是否在回答中
  if (stateStore.fetchingResponse) {
    // 提示用户等待或手动终止
    showSnackbar(t("waitForResponseOrStop"));
    return;
  }

  // 如果不在回答中，则正常创建新会话
  if (route.path !== "/chat") {
    router.push("/chat");
  }
  // 如果已经在主页面，只关闭抽屉
  drawer.value = false;
};

/**
 *  获取指定会话的对话数据，只供 exportConversation 函数使用，用于导出会话数据
 * @param conversation_id 会话id
 */
const loadMessage = async (conversation_id: number) => {
  // TODO: 这个的api要换成我们的
  const { data, error } = await useAuthFetch(
    `/api/chat/messages/?conversationId=${conversation_id}`
  );
  if (!error.value) {
    return data.value;
  }
  return error.value;
};
/**
 *  导出会话中的对话数据
 * @param index 会话id
 */
const exportConversation = async (index: number) => {
  let conversation = conversations.value[index];
  let data = {};
  // @ts-ignore
  data.conversation_topic = conversation.topic;
  // @ts-ignore
  data.messages = [];
  let messages = await loadMessage(conversation.id);
  for (let message of messages as any[]) {
    let msg = {};
    // @ts-ignore
    msg.role = message.is_bot ? "assistant" : "user";
    // @ts-ignore
    msg.content = message.message;
    // @ts-ignore
    data.messages.push(msg);
  }
  let file_content = JSON.stringify(data);
  let file_name = `${conversation.topic}_${new Date()}`.replace(
    /[\/\\:*?"<>]/g,
    "_"
  );
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(file_content)
  );
  element.setAttribute("download", file_name);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

// FIXME: 导入会话可以先不考虑
// const openImportFileChooser = async () => {
//   let input_element = document.getElementById("import_conversation_input");
//   input_element?.click();
// };

// const importConversation = async () => {
//   let input_element = document.getElementById(
//     "import_conversation_input"
//   ) as HTMLInputElement;
//   let fileHandles = input_element?.files;
//   let imports = [];
//   const reader = new FileReader();
//   for (let handle of fileHandles as any) {
//     let content = await new Promise((resolve, reject) => {
//       reader.readAsText(handle);
//       reader.onload = () => resolve(reader.result);
//       reader.onerror = (error) => reject(error);
//     });
//     let json = JSON.parse(content as string);
//     imports.push(json);
//   }
//   let new_conversation_ids = [];
//   try {
//     const { data, error } = await useAuthFetch("/api/upload_conversations/", {
//       method: "POST",
//       headers: {
//         accept: "application/json",
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         imports: imports,
//       }),
//     });
//     if (!error.value) {
//       new_conversation_ids = data.value as any[];
//       loadConversations();
//     } else {
//       console.log(error.value);
//       showSnackbar(error.value.message);
//     }
//   } catch (err: any) {
//     console.log(err.message);
//     showSnackbar(err.message);
//   }
// };

const deletingConversations = ref(false);
const loadingConversations = ref(false);
/**
 * 加载所有历史会话的简单信息，用于显示在侧边栏
 */
const loadConversations = async () => {
  loadingConversations.value = true;

  try {
    const token = getToken();

    const response = await axios.post(
      `/api/v1/chat/history`,
      // TODO: uuid 要和登录注册联动好，现在 1 是测试
      { uuid: stateStore.user?.uuid || 1 },
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        withCredentials: true,
      }
    );

    // 成功获取数据
    if (response.data && response.data.error === 0) {
      // 按更新时间降序排序（最新的在最前面）
      const sessions = response.data.sessions || [];
      const sortedSessions = [...sessions].sort((a, b) => {
        const dateA = new Date(a.updated_at);
        const dateB = new Date(b.updated_at);
        return dateB.getTime() - dateA.getTime();
      });

      stateStore.setConversations(sortedSessions);
    } else {
      // 业务逻辑错误
      console.error("API Error:", response.data?.error);
      stateStore.setConversations([]);
    }
  } catch (err) {
    // HTTP错误或网络错误
    console.error("Error fetching conversations:", err);
    // 处理401未授权错误
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      console.warn("Authentication error (401). Logging out...");
      try {
        await logout();
      } catch (logoutErr) {
        console.error("Logout failed:", logoutErr);
      }
    }
    stateStore.setConversations([]);
  } finally {
    loadingConversations.value = false;
  }
};
const signOut = async () => {
  try {
    // TODO: 确认后端登出接口是否需要传递 token 或其他认证信息
    // 如果后端登出接口需要认证，确保 axios 请求中包含了必要的 headers (e.g., Authorization)
    const response = await axios.post("/api/account/logout/"); // 假设登出接口不需要额外参数

    // 根据后端实际返回的成功状态进行判断，这里假设 HTTP 2xx 状态码表示成功
    if (response.status >= 200 && response.status < 300) {
      await logout(); // 调用 utils/auth.ts 中的 logout 清理本地状态
      // 登出成功后，可以考虑跳转到登录页或首页
      router.push("/login"); // 示例：跳转到登录页
    } else {
      // 处理后端返回的错误，例如显示一个提示
      console.error(
        "Logout failed with status:",
        response.status,
        response.data
      );
      showSnackbar(t("signOutError"));
    }
  } catch (error) {
    console.error("Error during sign out:", error);
    // 处理请求发送失败等网络错误
    showSnackbar(t("signOutError"));
  }
};

onMounted(async () => {
  loadConversations();
});

// TODO: 陈致远做设置界面
const currentThemeName = computed(() => {
  return theme.global.name.value;
});
const userAvatar = ref(null);
const settingDialog = ref(false);
</script>

<template>
  <v-navigation-drawer
    v-model="drawer"
    :permanent="drawerPermanent"
    width="300"
  >
    <!-- 左上角 Logo 部分 -->
    <div class="drawer-header d-flex align-center justify-space-between pa-2">
      <div class="logo-container">
        <!-- 修复图片路径问题 -->
        <v-icon color="primary" size="24" class="mr-2">mdi-chat</v-icon>
        <span class="logo-text">WHUChat</span>
      </div>
      <!-- 关闭侧边栏按钮 -->
      <v-btn
        icon
        variant="text"
        @click="drawer = false"
        class="close-drawer-btn"
      >
        <v-icon>mdi-chevron-left</v-icon>
      </v-btn>
    </div>

    <!-- 新建对话按钮 - 修改为宽按钮 -->
    <div class="new-chat-container px-3 mt-2 mb-2">
      <v-btn
        block
        prepend-icon="mdi-plus"
        color="primary"
        variant="outlined"
        @click="createNewConversation"
        class="new-chat-btn"
      >
        {{ $t("newConversation") }}
      </v-btn>
    </div>
    <v-divider></v-divider>
    <!-- 历史会话列表 -->
    <div class="px-2">
      <v-list>
        <!-- 加载动画指示器 -->
        <v-list-item v-show="loadingConversations">
          <v-list-item-title class="d-flex justify-center">
            <v-progress-circular indeterminate></v-progress-circular>
          </v-list-item-title>
        </v-list-item>
      </v-list>
      <!-- 历史会话列表 -->
      <!-- v-for 中循环渲染，为每个会话项绑定了 conversation.id 可以使用 -->
      <v-list>
        <template
          v-for="(conversation, cIdx) in conversations"
          :key="conversation.id"
        >
          <v-list-item
            base-color="primary"
            rounded="xl"
            v-if="
              editingConversation && editingConversation.id === conversation.id
            "
          >
            <!-- TODO: updateConversation 要和后端对接 -->
            <v-text-field
              v-model="editingConversation.topic"
              :loading="editingConversation.updating"
              variant="underlined"
              append-icon="done"
              hide-details
              density="compact"
              autofocus
              @keyup.enter="updateConversation(cIdx)"
              @click:append="updateConversation(cIdx)"
            ></v-text-field>
          </v-list-item>
          <v-hover
            v-if="
              !editingConversation || editingConversation.id !== conversation.id
            "
            v-slot="{ isHovering, props }"
          >
            <v-list-item
              rounded="xl"
              base-color="primary"
              :to="
                conversation.id
                  ? `/${stateStore.user?.uuid || 0}/${conversation.id}`
                  : '/'
              "
              v-bind="props"
            >
              <!-- TODO: editConversation 要和后端对接 -->
              <!-- 这里是会话的标题 -->
              <v-list-item-title>{{
                conversation.title && conversation.title !== ""
                  ? conversation.title
                  : $t("defaultConversationTitle")
              }}</v-list-item-title>
              <template v-slot:append>
                <div v-show="isHovering && conversation.id">
                  <v-btn
                    size="small"
                    variant="text"
                    @click.prevent="editConversation(cIdx)"
                  >
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="text"
                    :loading="deletingConversationIndex === cIdx"
                    @click.prevent="deleteConversation(cIdx)"
                    ><v-icon>mdi-trash-can</v-icon>
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="text"
                    @click.prevent="exportConversation(cIdx)"
                    ><v-icon>mdi-cloud-download</v-icon>
                  </v-btn>
                </div>
              </template>
            </v-list-item>
          </v-hover>
        </template>
      </v-list>
    </div>
    <!-- 用户信息 -->
    <template v-slot:prepend v-if="user">
      <v-list>
        <v-list-item :title="user.username" :subtitle="user.email">
          <template v-slot:prepend>
            <v-icon icon="face" size="x-large"></v-icon>
          </template>
          <template v-slot:append>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  size="small"
                  variant="text"
                  icon="expand_more"
                ></v-btn>
              </template>
              <v-list>
                <v-list-item
                  :title="$t('resetPassword')"
                  to="/account/resetPassword"
                >
                </v-list-item>
                <v-list-item :title="$t('signOut')" @click="signOut">
                </v-list-item>
              </v-list>
            </v-menu>
          </template>
        </v-list-item>
      </v-list>

      <v-divider></v-divider>
    </template>
    <!-- 底部 -->
    <template v-slot:append>
      <v-divider></v-divider>
      <UserFooter
        :user="user"
        size="36"
        @open-settings="$emit('openSettings')"
        @sign-out="$emit('signOut')"
      />
    </template>
  </v-navigation-drawer>
  <!-- 一个临时的消息提示，不管也行 -->
  <v-snackbar v-model="snackbar" multi-line location="top">
    {{ snackbarText }}
    <template v-slot:actions>
      <v-btn
        color="red"
        variant="text"
        @click="snackbar = false"
        density="compact"
        size="default"
      >
        Close
      </v-btn>
    </template>
  </v-snackbar>
  <!-- 导入对话，可以暂时不管 -->
  <!-- <input
    type="file"
    id="import_conversation_input"
    style="display: none"
    accept="text/plain, text/json"
    multiple
    @change="importConversation"
  /> -->
</template>

<style scoped>
/* 修改的样式 */
.drawer-header {
  min-height: 48px;
}

.logo-container {
  display: flex;
  align-items: center;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--v-theme-on-surface);
  letter-spacing: 0.5px;
}

.new-chat-container {
  width: 100%;
}

.new-chat-btn {
  height: 44px;
  border-radius: 8px;
  text-transform: none;
  font-size: 14px;
  font-weight: 500;
}

.close-drawer-btn {
  margin-right: 8px;
}

/* 原来的样式保持不变 */
.v-navigation-drawer__content::-webkit-scrollbar {
  width: 0;
}
.v-navigation-drawer__content:hover::-webkit-scrollbar {
  width: 6px;
}
.v-navigation-drawer__content:hover::-webkit-scrollbar-thumb {
  background-color: #999;
  border-radius: 3px;
}
</style>
