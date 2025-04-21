<template>
  <v-app>
    <v-main>
      <v-sheet class="register" width="300">
        <MsgAlert
          :visible="showAlert"
          :message="alertMessage"
          :type="alertType"
          @close="showAlert = false"
        />
        <h1 class="title">{{ t("signIn") }}</h1>
        <v-form ref="form">
          <v-text-field
            v-model="loginForm.email"
            :label="t('email')"
            required
            :rules="emailRules"
          />
          <v-text-field
            v-model="loginForm.password"
            :label="t('password')"
            type="password"
            required
          />
          <v-checkbox
            v-model="checkbox"
            :rules="[(v) => !!v || t('You must agree to continue')]"
            :label="t('agreeToThePrivacyPolicyToRegisterOrLogIn')"
            required
          />

          <div class="d-flex flex-column">
            <v-btn class="mt-4" color="success" block @click="handleLogin">
              {{ t("clickToSignIn") }}
            </v-btn>
            <v-btn
              class="mt-4"
              color="grey"
              block
              @click="router.push('/register')"
            >
              {{ t("Create your account") }}
            </v-btn>
          </div>
        </v-form>
      </v-sheet>
    </v-main>
  </v-app>
</template>
<script setup lang="ts">
import { ref } from "vue";
import type { VForm } from "vuetify/components"; // 添加类型声明
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useAuthFetch } from "@/composables/fetch";

const router = useRouter();
const { t } = useI18n();

const form = ref<InstanceType<typeof VForm>>();
const checkbox = ref(false);
const showAlert = ref(false);
const alertMessage = ref("");
const alertType = ref("error");

const emailRules = [
  (v: string) => !!v || t("Please enter your e-mail address"),
  (v: string) => /.+@.+\..+/.test(v) || t("E-mail address must be valid"),
];

interface LoginForm {
  password: string;
  email: string; // 根据实际需求保留
}
const loginForm = ref<LoginForm>({
  password: "",
  email: "",
});

const isLoading = ref(false);
const handleLogin = async () => {
  if (isLoading.value) return;
  if (!form.value) return;
  const { valid } = await form.value.validate();
  if (!valid) return;
  isLoading.value = true;
  try {
    const { data, error } = await useAuthFetch<{ uuid: number }>(
      "/api/v1/gate/login",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginForm.value.email,
          password: loginForm.value.password,
        }),
        withCredentials: true, // 关键！允许携带cookie
      }
    );

    if (!error.value) {
      handleLoginSuccess();
      showAlert.value = true;
      alertMessage.value = t("Your login is successful");
      alertType.value = "success";
    } else {
      console.error("Login uuid:", data.value);
      console.error("Login error:", error.value);
      showAlert.value = true;
      alertMessage.value = t("Your login failed");
      alertType.value = "error";
    }
    // 登录成功处理（由后端重定向）
  } catch (err) {
    showAlert.value = true;
    alertMessage.value = t("Your login failed");
    alertType.value = "error";
    console.error(err);
  } finally {
    isLoading.value = false;
    setTimeout(() => {
      showAlert.value = false;
    }, 1000);
  }
};

// 成功处理（如果后端未自动重定向）
const handleLoginSuccess = async () => {
  // 检查是否已有重定向
  setTimeout(() => {
    const str = window.location.pathname.toString();
    if (str != "/") {
      router.push("/");
    }
  }, 1000);
};
</script>

<style>
.register {
  margin: 0 auto;
  margin-top: 150px;
}
.title {
  text-align: center;
}
</style>
