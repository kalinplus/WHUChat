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
import { useAuthFetch, useMyFetch } from "@/composables/fetch";
import { useRoute, useRouter } from "vue-router";
import { useStateStore } from "@/stores/states";
import UserFooter from "./UserFooter.vue";
import type { ConversationInfo, ConversationsResponse } from "@/types/types";
import { logout, getToken } from "@/utils/auth";
import axios from "axios";

const emit = defineEmits(["openSettings", "signOut"]);
const stateStore = useStateStore();

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

const editConversation = (index: number) => {
  editingConversation.value = conversations.value[index];
};

const updateConversation = async (index: number) => {
  editingConversation.value.updating = true;
  const { data, error } = await useAuthFetch(
    `/api/chat/conversations/${editingConversation.value.id}/`,
    {
      method: "PUT",
      body: JSON.stringify({
        topic: editingConversation.value.topic,
      }),
    }
  );
  if (!error.value) {
    editingConversation.value.updating = false;
    conversations.value[index] = editingConversation.value;
  }
  conversations.value[index].updating = false;
  editingConversation.value = false;
};

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

// 创建新对话函数
const createNewConversation = () => {
  if (route.path !== "/") {
    return router.push("/");
  }
  // 如果已经在主页面，只关闭抽屉
  drawer.value = false;
};

const snackbar = ref(false);
const snackbarText = ref("");
const showSnackbar = (text: string) => {
  snackbarText.value = text;
  snackbar.value = true;
};

// TODO: 这个的api要换成我们的
const loadMessage = async (conversation_id: number) => {
  const { data, error } = await useAuthFetch(
    `/api/chat/messages/?conversationId=${conversation_id}`
  );
  if (!error.value) {
    return data.value;
  }
  return error.value;
};

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

// FIXME: 导入会话也可以先不考虑
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

const loadConversations = async () => {
  loadingConversations.value = true;

  try {
    const protocol = import.meta.env.VITE_API_PROTOCOL || "https";
    const baseUrl =
      `${protocol}//import.meta.env.VITE_API_HOST` || "https://127.0.0.1:8081";
    const token = getToken();

    const response = await axios.post(
      `${baseUrl}/api/v1/chat/history`,
      { uuid: stateStore.user?.id || 0 },
      {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    // 成功获取数据
    if (response.data && response.data.error === 0) {
      stateStore.setConversations(response.data.sessions || []);
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

onMounted(() => {
  loadConversations();
});

const signOut = async () => {
  const { data, error } = await useMyFetch("/api/account/logout/", {
    method: "POST",
  });
  if (!error.value) {
    await logout();
  }
};

onMounted(async () => {
  loadConversations();
});

const drawer = useDrawer();

const currentThemeName = computed(() => {
  return theme.global.name.value;
});

const userAvatar = ref(null);

const settingDialog = ref(false);
// TODO: 陈致远做设置界面
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
    <!-- 会话列表 TODO: 表项里似乎有什么编辑模式-->
    <div class="px-2">
      <v-list>
        <v-list-item v-show="loadingConversations">
          <v-list-item-title class="d-flex justify-center">
            <v-progress-circular indeterminate></v-progress-circular>
          </v-list-item-title>
        </v-list-item>
      </v-list>

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
                  ? `/${stateStore.user?.id || '0'}/${conversation.id}`
                  : '/'
              "
              v-bind="props"
            >
              <v-list-item-title>{{
                conversation.topic && conversation.topic !== ""
                  ? conversation.topic
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
