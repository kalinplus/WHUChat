<route lang="yaml">
meta:
  requiresAuth: true
</route>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
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
const routerParams = route.params as { id?: number };

// 监听路由参数变化
watch(
  () => route.params,
  async (params) => {
    // @ts-ignore
    const userId = params.user;
    // @ts-ignore
    const sessionId = params.session_id;

    console.log(
      `Route params changed: user=${userId}, session_id=${sessionId}`
    );

    if (sessionId) {
      // 有会话ID，加载特定会话
      conversation.value = {
        id: Number(sessionId),
        messages: [],
        loadingMessages: true,
      };
    } else {
      // 无会话ID，创建新会话
      conversation.value = {
        id: null,
        messages: [],
        loadingMessages: false,
      };
    }
  },
  { immediate: true } // 组件创建时立即执行一次
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
  // @ts-ignore
  if (route.params.id) {
    conversation.value.loadingMessages = true;
    // TODO: 后面有空可以重构一下，把分散在 Conversation.vue 和 NavigationDrawer.vue 的初始化集中到这里
    // await loadConversation();
    // await loadMessage();
    conversation.value.loadingMessages = false;
  }
});

// TODO: 缓存相关，先不管
// onActivated(async () => {
//   if (route.path === "/" && route.query.new !== undefined) {
//     createNewConversation();
//   }
// });

const user = useUser(); // 获取用户信息
// 设置对话框控制
const settingsDialogOpen = ref(false);

// 打开设置对话框
const openSettings = () => {
  settingsDialogOpen.value = true;
};

// TODO: 退出登录，需要适配我们的接口和登录页面。注意 NavDrawer 里也有这个，可能重了
const signOut = async () => {
  try {
    // 调用退出登录API
    const { data, error } = await useAuthFetch("/api/account/logout/", {
      method: "POST",
    });

    if (!error.value) {
      // 清除用户状态
      stateStore.setUser(null);

      // 🔧 使用原生页面跳转到登录页
      window.location.href = "/login";
    } else {
      console.error("Logout failed:", error.value);
      // 即使API调用失败，也可以考虑强制跳转到登录页
      // window.location.href = "/login";
    }
  } catch (err) {
    console.error("Logout error:", err);
    // 网络错误时的处理，可以考虑强制跳转
    // window.location.href = "/login";
  }
};
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
            v-if="!routerParams.id && conversation.messages.length === 0"
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
