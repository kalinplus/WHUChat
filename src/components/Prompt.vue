<script setup lang="ts">
import { useAuthFetch } from "@/composables/fetch";
import { onMounted, ref } from "vue";
import { useStateStore } from "@/stores/states";

const menu = ref(false);
const prompts = ref<Array<any>>([]);
const editingPrompt = ref<any>(null);
const newTitlePrompt = ref(null);
const newPrompt = ref("");
const submittingNewPrompt = ref(false);
const promptInputErrorMessage = ref("");
const loadingPrompts = ref(false);
const deletingPromptIndex = ref<any>(null);
const stateStore = useStateStore();

const props = defineProps({
  usePrompt: {
    type: Function,
    required: true,
  },
});

const addPrompt = async () => {
  if (!newPrompt.value) {
    promptInputErrorMessage.value = "Please enter a prompt";
    return;
  }
  submittingNewPrompt.value = true;
  const { data, error } = await useAuthFetch("/api/chat/prompts/", {
    method: "POST",
    body: JSON.stringify({
      title: newTitlePrompt.value,
      prompt: newPrompt.value,
    }),
  });
  if (!error.value) {
    prompts.value.push(data.value);
    newTitlePrompt.value = null;
    newPrompt.value = "";
  }
  submittingNewPrompt.value = false;
};

const editPrompt = (index: number) => {
  editingPrompt.value = Object.assign({}, prompts.value[index]);
};

const updatePrompt = async (index: number) => {
  editingPrompt.value.updating = true;
  const { data, error } = await useAuthFetch(
    `/api/chat/prompts/${editingPrompt.value.id}/`,
    {
      method: "PUT",
      body: JSON.stringify({
        title: editingPrompt.value.title,
        prompt: editingPrompt.value.prompt,
      }),
    }
  );
  if (!error.value) {
    prompts.value[index] = editingPrompt.value;
  }
  editingPrompt.value.updating = false;
  editingPrompt.value = null;
};

const cancelEditPrompt = () => {
  editingPrompt.value = null;
};

const deletePrompt = async (index: number) => {
  deletingPromptIndex.value = index;
  const { data, error } = await useAuthFetch(
    `/api/chat/prompts/${prompts.value[index].id}/`,
    {
      method: "DELETE",
    }
  );
  deletingPromptIndex.value = null;
  if (!error.value) {
    prompts.value.splice(index, 1);
  }
};

const loadPrompts = async () => {
  loadingPrompts.value = true;
  // const { data, error } = await useAuthFetch("/api/chat/prompts/");
  // if (!error.value) {
  //   prompts.value = data.value as Array<any>;
  // }

  loadingPrompts.value = false;
};

const selectPrompt = (prompt: any) => {
  props.usePrompt(prompt.prompt);
  menu.value = false;
};

onMounted(async () => {
  console.log("Prompt component mounted");
  await stateStore.fetchAddr(); // 确保地址信息已加载

  loadPrompts();
});
</script>

<template>
  <div class="prompt">
    <v-menu v-model="menu" :close-on-content-click="false">
      <!-- <v-tooltip :text="$t('frequentlyPrompts')"> -->
      <template v-slot:activator="{ props }">
        <v-btn v-bind="props" icon variant="text">
          <v-icon>mdi-comment-text-outline</v-icon>
        </v-btn>
      </template>
      <!-- </v-tooltip> -->
      <v-container>
        <v-card min-width="300" max-width="500">
          <v-card-title>
            <span class="headline">{{ $t("frequentlyPrompts") }}</span>
          </v-card-title>

          <v-divider></v-divider>

          <v-list>
            <v-list-item v-show="loadingPrompts">
              <v-list-item-title class="d-flex justify-center">
                <v-progress-circular indeterminate></v-progress-circular>
              </v-list-item-title>
            </v-list-item>
            <template v-for="(prompt, idx) in prompts" :key="prompt.id">
              <v-list-item
                base-color="primary"
                v-if="editingPrompt && editingPrompt.id === prompt.id"
              >
                <div class="d-flex flex-row" :style="{ marginTop: '5px' }">
                  <div class="flex-grow-1">
                    <v-text-field
                      v-model="editingPrompt.title"
                      :loading="editingPrompt.updating"
                      :label="$t('titlePrompt')"
                      variant="underlined"
                      density="compact"
                      hide-details
                    >
                    </v-text-field>
                    <v-textarea
                      rows="2"
                      v-model="editingPrompt.prompt"
                      :loading="editingPrompt.updating"
                      variant="underlined"
                      density="compact"
                      hide-details
                    >
                    </v-textarea>
                  </div>
                  <div>
                    <div class="d-flex flex-column">
                      <v-btn
                        variant="text"
                        :loading="editingPrompt.updating"
                        @click="updatePrompt(idx)"
                      >
                        <v-icon>mdi-check</v-icon>
                      </v-btn>
                      <v-btn variant="text" @click="cancelEditPrompt()">
                        <v-icon>mdi-close</v-icon>
                      </v-btn>
                    </div>
                  </div>
                </div>
              </v-list-item>
              <v-list-item
                v-if="!editingPrompt || editingPrompt.id !== prompt.id"
                rounded="xl"
                base-color="primary"
                @click="selectPrompt(prompt)"
              >
                <v-list-item-title>{{
                  prompt.title ? prompt.title : prompt.prompt
                }}</v-list-item-title>
                <template v-slot:append>
                  <v-btn size="small" variant="text" @click="editPrompt(idx)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="text"
                    :loading="deletingPromptIndex === idx"
                    @click="deletePrompt(idx)"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </template>

            <v-list-item base-color="primary">
              <div class="pt-3">
                <v-text-field
                  rows="1"
                  v-model="newTitlePrompt"
                  :label="$t('titlePrompt')"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                >
                </v-text-field>
              </div>
            </v-list-item>

            <v-list-item base-color="primary">
              <div class="pt-3">
                <v-textarea
                  rows="2"
                  v-model="newPrompt"
                  :label="$t('addNewPrompt')"
                  variant="outlined"
                  density="compact"
                  :error-messages="promptInputErrorMessage"
                  @update:modelValue="promptInputErrorMessage = ''"
                  clearable
                >
                </v-textarea>
              </div>
            </v-list-item>
            <v-list-item>
              <v-btn
                variant="text"
                block
                :loading="submittingNewPrompt"
                @click="addPrompt()"
              >
                <v-icon>mdi-plus</v-icon>
                {{ $t("addPrompt") }}
              </v-btn>
            </v-list-item>
          </v-list>
        </v-card>
      </v-container>
    </v-menu>
  </div>
</template>

<style scoped>
.prompt {
  margin-left: 8px;
  margin-right: 10px;
}
</style>
