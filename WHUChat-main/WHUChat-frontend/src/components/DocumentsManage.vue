<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useAuthFetch } from "@/composables/fetch";

const { t } = useI18n();

const props = defineProps({
  sendMessage: {
    type: Function,
    required: false,
  },
  control: {
    type: Object,
    required: true,
  },
});

const ps = toRefs(props);

const loadingDoc = ref(false);
const deletingDocIndex = ref(null);
const embeddingDocs = ref<any[]>([]);
const selectedEmbeddingDocs = ref([]);
const fileInputMessage = ref("");

const uploadDocObject = ref({
  title: "",
  file: null,
});

function fileToBase64(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

const snackbar = ref(false);
const snackbarText = ref("");
const showSnackbar = (text: string) => {
  snackbarText.value = text;
  snackbar.value = true;
};
// TODO: 可能要确定 value 的类型
function fileUploadRules(value: any) {
  const fileSizeLimit = 8;
  return (
    !value ||
    !value.length ||
    value[0].size < fileSizeLimit * 1024 * 1024 ||
    `size no more than ${fileSizeLimit} MB`
  );
}

function onFileChange() {
  const newfile = (document.getElementById("file_upload_input") as any).files[0];
  if (fileUploadRules([newfile])) {
    uploadDocObject.value.file = newfile;
  }
}

async function uploadFile() {
  const file = uploadDocObject.value.file;
  if (!file) return;
  loadingDoc.value = true;
  const base64Data = await fileToBase64(file);
  try {
    const { data, error } = await useAuthFetch(
      "/api/chat/embedding_document/",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: (file as File).name,
          file: base64Data,
        }),
      }
    );
    if (!error.value) {
      embeddingDocs.value.splice(0, 0, data.value);
    } else {
      console.log(error.value);
      showSnackbar(error.value.message || String(error.value));
    }
  } catch (err) {
    console.log(err);
    showSnackbar((err as any).message);
  }
  uploadDocObject.value.file = null;
  loadingDoc.value = false;
}

async function loadDocs() {
  loadingDoc.value = true;
  const { data, error } = await useAuthFetch("/api/chat/embedding_document/");
  if (!error.value) {
    embeddingDocs.value = data.value as any[];
  }
  loadingDoc.value = false;
}

async function deleteDocs(index_list: any[]) {
  const survival = [];
  for (let i = 0; i < index_list.length; i++) {
    const index = index_list[i];
    deletingDocIndex.value = index;
    const { data, error } = await useAuthFetch(
      // TODO: 这个API可能要加上
      `/api/chat/embedding_document/${embeddingDocs.value[index].id}/`,
      {
        method: "DELETE",
      }
    );
    deletingDocIndex.value = null;
    if (!error.value) {
      embeddingDocs.value[index] = 0;
    } else {
      console.log(`${index}: ${error.value}`);
    }
  }
  const l = embeddingDocs.value.length;
  for (let i = 0; i < l; i++) {
    if (embeddingDocs.value[i] != 0) {
      survival.push(embeddingDocs.value[i]);
    }
  }
  embeddingDocs.value.splice(0, l);
  embeddingDocs.value.push(...survival);
}

async function insertSelectedDocs() {
  ps.control.value.dialog = false;
  const messages = selectedEmbeddingDocs.value.map((i) => {
    const doc = embeddingDocs.value[i];
    return {
      content: `${doc.title}\n${doc.created_at}`,
      message_type: 120,
      embedding_message_doc: doc.id,
    };
  });
  if (props.sendMessage) {
    props.sendMessage(messages);
  }
  const l = selectedEmbeddingDocs.value.length;
  selectedEmbeddingDocs.value.splice(0, l);
}

async function deleteSelectedDocs() {
  await deleteDocs(selectedEmbeddingDocs.value);
  const l = selectedEmbeddingDocs.value.length;
  selectedEmbeddingDocs.value.splice(0, l);
}

defineExpose({
  loadDocs,
});

onMounted(() => {
  loadDocs();
});
</script>

<template>
  <v-dialog
    v-model="control.dialog"
    scrollable
  >
    <v-card class="pa-3">
      <v-card-title> Add Documents </v-card-title>
      <v-row
        align="center"
        justify="center"
      >
        <v-col cols="10">
          <v-file-input
            id="file_upload_input"
            label="New Documents"
            :disabled="loadingDoc"
            :loading="loadingDoc"
            :messages="fileInputMessage"
            density="compact"
            variant="solo"
            show-size
            :rules="[fileUploadRules]"
            accept="text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            class="ma-2 pa-2"
            append-icon="upload"
            @change="onFileChange()"
            @click:append="uploadFile()"
          />
        </v-col>
      </v-row>
      <v-divider />
      <v-card-text style="height: 480px">
        <v-item-group
          v-model="selectedEmbeddingDocs"
          multiple
        >
          <v-row
            v-for="(item, i) in embeddingDocs"
            :key="i"
            justify="center"
          >
            <v-col>
              <v-item v-slot="{ isSelected, toggle }">
                <v-list-item
                  :prepend-icon="
                    isSelected ? 'check_box' : 'check_box_outline_blank'
                  "
                  @click="toggle"
                >
                  <v-list-item-title>{{ item.title }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{
                      item.created_at
                    }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-item>
            </v-col>
          </v-row>
        </v-item-group>
      </v-card-text>
      <v-divider />
      <v-row
        justify="center"
        class="pa-2"
      >
        <v-card-actions>
          <v-btn
            elevation="2"
            class="ma-2"
            @click="insertSelectedDocs()"
          >
            Insert
          </v-btn>
          <v-btn
            elevation="2"
            class="ma-2"
            @click="deleteSelectedDocs()"
          >
            Delete
          </v-btn>
          <v-btn
            elevation="2"
            class="ma-2"
            @click="control.dialog = false"
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-row>
    </v-card>
  </v-dialog>
  <v-snackbar
    v-model="snackbar"
    multi-line
    location="top"
  >
    {{ snackbarText }}

    <template #actions>
      <v-btn
        color="red"
        variant="text"
        density="compact"
        size="default"
        @click="snackbar = false"
      >
        Close
      </v-btn>
    </template>
  </v-snackbar>
</template>

<style></style>
