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
  id: number | null;  // 当前选择的会话的 id
  messages: any[];
  [key: string]: any;
}>(getDefaultConversationData());
const routerParams = route.params as { id?: number };

// TODO: 每个对话的标识url存在params的id里
const loadConversation = async () => {
  const { data, error } = await useAuthFetch(
    "/api/chat/conversations/" + routerParams.id
  );
  if (!error.value) {
    conversation.value = Object.assign(conversation.value, data.value);
  }
};

const loadMessage = async () => {
  const { data, error } = await useAuthFetch(
    "/api/chat/messages/?conversationId=" + routerParams.id
  );
  if (!error.value) {
    conversation.value.messages =
      data.value as typeof conversation.value.messages;
    conversation.value.id = routerParams.id ?? null;
  }
};

const createNewConversation = () => {
  if (route.path !== "/") {
    return router.push("/?new");
  }
  conversation.value = Object.assign(getDefaultConversationData(), {
    topic: t("newConversation"),
  });
};
const signIn = () => {
  router.push("/login");
};
const signUp = () => {
  router.push("/register");
};

// 计算属性：导航标题  当值发生变化，即切换话题时，重新计算并渲染
const navTitle = computed(() => {
  return conversation.value.topic || t("newConversation");
});

onMounted(async () => {
  // @ts-ignore
  if (route.params.id) {
    conversation.value.loadingMessages = true;
    await loadConversation();
    await loadMessage();
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

// 退出登录
const signOut = async () => {
  // 调用退出登录API
  const { data, error } = await useAuthFetch("/api/account/logout/", {
    method: "POST",
  });

  if (!error.value) {
    // 清除用户状态
    stateStore.setUser(null);

    // 跳转到登录页
    router.push("/login");
  }
};
</script>

<template>
  <v-app>
    <AppBar
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
.content-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 16px;
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

@media (max-width: 960px) {
  .with-drawer {
    transform: none; /* 在小屏幕上不做偏移 */
  }
}
</style>
