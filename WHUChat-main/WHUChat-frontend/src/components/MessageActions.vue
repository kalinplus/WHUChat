<script setup lang="ts">
import copy from "copy-to-clipboard";
// TODO: 检查这里、fetch.ts、auth.ts 的 useAuthFetch 是否实现正确
import { useAuthFetch } from "@/composables/fetch";

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  messageIndex: {
    type: Number,
    required: true,
  },
  usePrompt: {
    type: Function,
    required: true,
  },
  deleteMessage: {
    type: Function,
    required: true,
  },
  // FIXME：没设计这功能
  // toggleMessage: {
  //   type: Function,
  //   required: true,
  // },
});

const snackbar = ref(false);
const snackbarText = ref("");
const showSnackbar = (text: string) => {
  snackbarText.value = text;
  snackbar.value = true;
};

const copyMessage = () => {
  copy(props.message.message);
  showSnackbar("Copied!");
};

const editMessage = () => {
  props.usePrompt(props.message.message);
};

// TODO： 可能需要适配我们的接口
const deleteMessage = async () => {
  const { data, error } = await useAuthFetch(
    `/api/chat/messages/${props.message.id}/`,
    {
      method: "DELETE",
    }
  );
  if (!error.value) {
    props.deleteMessage(props.messageIndex);
    showSnackbar("Deleted!");
  }
  showSnackbar("Delete failed");
};

// FIXME： 就没这功能
// const toggle_message = async () => {
//   const msg = Object.assign({}, props.message);
//   msg.is_disabled = !msg.is_disabled;
//   const { data, error } = await useAuthFetch(
//     `/api/chat/messages/${props.message.id}/`,
//     {
//       method: "PUT",
//       body: JSON.stringify(msg),
//     }
//   );
//   if (!error.value) {
//     props.toggleMessage(props.messageIndex);
//   }
// };

function selectMessageIcon(message: any) {
  if (message.is_bot) return "";
  // 使用 MDI 图标名称替换
  if (message.message_type == 100) {
    // 'travel_explore' -> 查找 MDI 中类似的图标，例如 'mdi-map-search-outline' 或 'mdi-compass'
    return "mdi-map-search-outline";
  } else if (message.message_type == 110) {
    // 'local_library' -> 'mdi-library'
    return "mdi-library";
  } else if (message.message_type == 120) {
    // 'article' -> 'mdi-text-box-outline' 或 'mdi-file-document-outline'
    return "mdi-text-box-outline";
  }
  return "";
}

const message_icon = selectMessageIcon(props.message);
</script>

<template>
  <!-- <v-menu>
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" v-if="message_icon" variant="text" class="ma-2">
        <v-icon :icon="message_icon"></v-icon>
      </v-btn>
    </template>
    <v-list>
      <v-list-item
        @click="toggle_message()"
        title="toggle"
        :prepend-icon="
          message.is_disabled
            ? 'mdi-toggle-switch-off-outline'
            : 'mdi-toggle-switch'
        "
      >
      </v-list-item>
    </v-list>
  </v-menu> -->
  <v-menu>
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        variant="text"
        class="mx-1 ma-2"
      >
        <v-icon icon="mdi-dots-horizontal" />
      </v-btn>
    </template>
    <v-list>
      <v-list-item
        :title="$t('copy')"
        prepend-icon="mdi-content-copy"
        @click="copyMessage()"
      />
      <v-list-item
        :title="$t('edit')"
        prepend-icon="mdi-pencil"
        @click="editMessage()"
      />
      <v-list-item
        :title="$t('delete')"
        prepend-icon="mdi-delete"
        @click="deleteMessage()"
      />
    </v-list>
  </v-menu>

  <!-- Snackbar 保持不变 -->
  <v-snackbar
    v-model="snackbar"
    location="top"
    timeout="2000"
  >
    {{ snackbarText }}
  </v-snackbar>
</template>

<style scoped></style>
