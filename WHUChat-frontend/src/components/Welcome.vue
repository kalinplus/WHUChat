<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="text-center">
          <h2 class="text-h2">
            {{ t("welcomeTo") }}
            <span class="text-primary">{{ appName }}</span>
          </h2>
          <p class="text-caption my-5">
            {{ appName }}
            {{ t("welcomeScreen.introduction1") }}
            <br />
          </p>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="10" offset-md="1">
        <v-row>
          <v-col cols="12" md="4">
            <v-row>
              <v-col>
                <div class="d-flex flex-column align-center">
                  <!-- 修改为 mdi 图标 -->
                  <v-icon>mdi-white-balance-sunny</v-icon>
                  <h3 class="text-h6">
                    {{ t("welcomeScreen.examples.title") }}
                  </h3>
                </div>
              </v-col>
            </v-row>
            <WelcomeCard
              v-for="(example, index) in examples"
              :key="index"
              :content="example"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-row>
              <v-col>
                <div class="d-flex flex-column align-center">
                  <!-- 修改为 mdi 图标 -->
                  <v-icon>mdi-lightning-bolt</v-icon>
                  <h3 class="text-h6">
                    {{ t("welcomeScreen.capabilities.title") }}
                  </h3>
                </div>
              </v-col>
            </v-row>
            <WelcomeCard
              v-for="(capabilitie, index) in capabilities"
              :key="index"
              :content="capabilitie"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-row>
              <v-col>
                <div class="d-flex flex-column align-center">
                  <!-- 修改为 mdi 图标 -->
                  <v-icon>mdi-alert</v-icon>
                  <h3 class="text-h6">
                    {{ t("welcomeScreen.limitations.title") }}
                  </h3>
                </div>
              </v-col>
            </v-row>
            <WelcomeCard
              v-for="(limitation, index) in limitations"
              :key="index"
              :content="limitation"
            />
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
// const runtimeConfig = useRuntimeConfig();
// const { $i18n } = useNuxtApp();
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const appName: string = import.meta.env.VITE_APP_NAME;

const examples = ref([
  t("welcomeScreen.examples.item1"),
  t("welcomeScreen.examples.item2"),
  t("welcomeScreen.examples.item3"),
]);
const capabilities = ref([
  t("welcomeScreen.capabilities.item1"),
  t("welcomeScreen.capabilities.item2"),
  t("welcomeScreen.capabilities.item3"),
]);
const limitations = ref([
  t("welcomeScreen.limitations.item1"),
  t("welcomeScreen.limitations.item2"),
  t("welcomeScreen.limitations.item3"),
]);
</script>

<style scoped>
.v-icon {
  font-size: 32px;
  margin-bottom: 12px;
}
</style>
