<route lang="yaml">
meta:
  requiresAuth: false
</route>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { getDefaultConversationData } from "@/utils/helper";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthFetch } from "@/composables/fetch";
import { useStateStore } from "@/stores/states";
import { useUser } from "@/composables/states";

const stateStore = useStateStore();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const conversation = ref<{
  id: number | null; // 当前选择的会话的 id
  messages: any[];
  loadingMessages: boolean;
  [key: string]: any;
}>(getDefaultConversationData());
const routerParams = route.params as { user?: string; session_id?: string };

// 监听 conversation.id 变化进行调试
watch(
  () => conversation.value.id,
  (newId, oldId) => {
    console.log(`[chat.vue] conversation.id changed: ${oldId} -> ${newId}`);
  }
);

// 🔧 修改 watch 逻辑，处理未登录状态
watch(
  () => route.params,
  async (params) => {
    // @ts-ignore
    const userId = stateStore.user?.uuid || null; // 获取当前用户ID
    // @ts-ignore
    const sessionId = params.session_id;
    console.log(
      `Route params changed: user=${
        (params as any).user
      }, session_id=${sessionId}`
    );

    console.log(
      "[chat.vue watch] stateStore.user before check:",
      JSON.stringify(stateStore.user)
    ); 
    
    // 🔧 检查用户是否登录
    if (!stateStore.user) {
      console.log("User not logged in, showing guest mode");
      // 未登录时显示欢迎页面或访客模式
      conversation.value = {
        id: null,
        messages: [],
        loadingMessages: false,
      };
      return;
    }

    if (sessionId) {
      // 有会话ID，加载特定会话
      console.log("Loading conversation for session:", sessionId);
      const newId = Number(sessionId);
      
      // 只有当 conversation.id 真正发生变化时才更新
      if (conversation.value.id !== newId) {
        conversation.value = {
          id: newId,
          messages: [],
          loadingMessages: true,
        };
        console.log(`Conversation ID updated to: ${newId}`);
      } else {
        console.log(`Conversation ID already set to: ${newId}, skipping update`);
      }
    } else {
      // 无会话ID，创建新会话
      console.log("No session ID, creating new conversation");
      conversation.value = {
        id: null,
        messages: [],
        loadingMessages: false,
      };
    }
  },
  { immediate: true }
);

// TODO: 每个对话的标识url存在params的id里
// FIXME：比起在两个子组件（NavDrawer和Conversation里分别请求，这里请求时
// const loadConversation = async () => {
//   const { data, error } = await useAuthFetch(
//     "/api/chat/conversations/" + routerParams.id
//   );
//   if (!error.value) {
//     conversation.value = Object.assign(conversation.value, data.value);
//   }
// };

// const loadMessage = async () => {
//   const { data, error } = await useAuthFetch(
//     "/api/chat/messages/?conversationId=" + routerParams.id
//   );
//   if (!error.value) {
//     conversation.value.messages =
//       data.value as typeof conversation.value.messages;
//     conversation.value.id = routerParams.id ?? null;
//   }
// };

const createNewConversation = () => {
  if (route.path !== "/") {
    return router.push("/?new");
  }
  conversation.value = Object.assign(getDefaultConversationData(), {
    topic: t("newConversation"),
  });
};

const signIn = () => {
  // router.push("/login");
  window.location.href = "/login";
};
const signUp = () => {
  // router.push("/register");
  window.location.href = "/register";
};

// 计算属性：导航标题  当值发生变化，即切换话题时，重新计算并渲染
const navTitle = computed(() => {
  return conversation.value.topic || t("newConversation");
});

onMounted(async () => {
  console.log("Chat page mounted");
  
  // 确保用户已登录
  if (!stateStore.user) {
    console.log("User not authenticated in chat mount, waiting for route guard...");
    // Wait a short time for route guard to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 确保地址信息已加载
  try {
    await stateStore.fetchAddr();
    console.log("Address fetched successfully:", stateStore.addr);
  } catch (error) {
    console.error("Failed to fetch address in chat mount:", error);
  }

  // 检查是否有 session_id 参数
  const params = route.params as { user?: string; session_id?: string };
  console.log("Chat mount params:", params);
  
  if (params.session_id && stateStore.user) {
    console.log("Setting up conversation with session_id:", params.session_id);
    conversation.value = {
      id: Number(params.session_id),
      messages: [],
      loadingMessages: true,
    };
  } else {
    console.log("No session_id or user not authenticated, setting up new conversation");
    conversation.value = {
      id: null,
      messages: [],
      loadingMessages: false,
    };
  }
});

// TODO: 缓存相关，先不管
// onActivated(async () => {
//   if (route.path === "/" && route.query.new !== undefined) {
//     createNewConversation();
//   }
// });

const user = stateStore.getUser(); // 获取用户信息
// 设置对话框控制
const settingsDialogOpen = ref(false);

// 打开设置对话框
const openSettings = () => {
  settingsDialogOpen.value = true;
};

// TODO: 退出登录，需要适配我们的接口和登录页面。注意 NavDrawer 里也有这个，可能重了
// 🔧 修改退出登录逻辑
const signOut = async () => {
  try {
    // 如果用户已登录，调用退出API
    if (stateStore.user) {
      const { data, error } = await useAuthFetch("/api/account/logout/", {
        method: "POST",
      });

      if (!error.value) {
        console.log("Logout successful");
      } else {
        console.error("Logout failed:", error.value);
      }
    }

    // 清除用户状态
    stateStore.setUser(null);

    // 🔧 不跳转到登录页，而是重新加载当前页面或重置状态
    // 重置会话状态，显示访客模式
    conversation.value = {
      id: null,
      messages: [],
      loadingMessages: false,
    };

    // 可选：跳转到首页
    if (route.path !== "/chat") {
      router.push("/chat");
    }
  } catch (err) {
    console.error("Logout error:", err);
    // 即使出错也清除用户状态
    stateStore.setUser(null);
  }
};

// 监听用户状态变化，确保认证完成后正确初始化会话
watch(
  () => stateStore.user,
  (newUser, oldUser) => {
    console.log("[chat.vue] User state changed:", { oldUser, newUser });
    
    if (newUser && !oldUser) {
      // 用户刚刚登录，重新处理路由参数
      console.log("User just authenticated, re-processing route params");
      const params = route.params as { user?: string; session_id?: string };
      
      if (params.session_id) {
        console.log("Setting up authenticated conversation with session_id:", params.session_id);
        const newId = Number(params.session_id);
        conversation.value = {
          id: newId,
          messages: [],
          loadingMessages: true,
        };
      }
    } else if (!newUser && oldUser) {
      // 用户登出，重置会话
      console.log("User logged out, resetting conversation");
      conversation.value = {
        id: null,
        messages: [],
        loadingMessages: false,
      };
    }
  }
);
</script>

<template>
  <v-app>
    <AppBar
      class="appbar"
      @open-settings="openSettings"
      @sign-in="signIn"
      @sign-out="signOut"
      :user="user"
    />
    <NavigationDrawer
      @open-settings="openSettings"
      @sign-in="signIn"
      @sign-out="signOut"
      :user="user"
    />
    <v-main>
      <div class="content-wrapper">
        <div
          class="content-inner"
          :class="{ 'with-drawer': stateStore.drawer }"
        >
          <Welcome
            :class="{ loading: conversation.loadingMessages }"
            v-if="
              !routerParams.session_id && conversation.messages.length === 0
            "
          />
          <Conversation :conversation="conversation" />
        </div>
      </div>
    </v-main>
    <SettingsDialog v-model="settingsDialogOpen" />
  </v-app>
</template>

<style scoped>
.appbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
}
.content-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 16px;
  margin-top: 64px;
  background-color: rgb(var(--v-theme-background)); /* Add a background color */
}

.content-inner {
  width: 100%;
  max-width: 900px; /* 内容固定最大宽度 */
  transition: transform 0.3s ease;
}

/* 当抽屉打开时，调整内容位置以保持中心对齐 */
.with-drawer {
  transform: translateX(150px / 2); /* 侧边栏宽度的一半 */
}

.loading {
  position: relative; /* Needed to position the overlay */
  min-height: 100px; /* Ensure the loading container has some height */
}

.loading::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* Option 1: Solid color background */
  /* background-color: rgba(255, 255, 255, 0.8); */ /* Example: Semi-transparent white */

  /* Option 2: Blurred background */
  background-color: rgba(
    255,
    255,
    255,
    0.5
  ); /* Light overlay helps blur visibility */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); /* Safari support */

  z-index: 1; /* Place overlay above the content behind, but below the spinner */
}

/* Ensure your actual loading indicator (spinner, text) is visible above the overlay */
/* Example: If you have a spinner element inside the .loading container */
/*
.loading > .spinner-element {
  position: relative; /* Or absolute, depending on your layout */
/*  z-index: 2; /* Make sure spinner is on top of the overlay */
/* }
*/

@media (max-width: 960px) {
  .with-drawer {
    transform: none; /* 在小屏幕上不做偏移 */
  }
}
</style>
