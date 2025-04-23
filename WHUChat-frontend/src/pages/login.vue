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
              {{ t("createAccount") }}
            </v-btn>
          </div>
        </v-form>
      </v-sheet>
    </v-main>
  </v-app>
</template>
<script setup lang="ts">
import { ref, computed } from "vue";
import type { VForm } from "vuetify/components";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import request from "@/utils/request";

// ======================
// 依赖注入
// ======================
const router = useRouter();
const { t } = useI18n();

// ======================
// 响应式状态声明
// ======================
const form = ref<InstanceType<typeof VForm>>();
const checkbox = ref(false);
const showAlert = ref(false);
const alertType = ref("error");
const isLoading = ref(false);
const loginResult = ref<LoginResult>();

// ======================
// 类型定义
// ======================
interface LoginResult {
  uuid?: number;
  error: number;
}

interface LoginForm {
  password: string;
  email: string;
}

// ======================
// 表单配置
// ======================
const loginForm = ref<LoginForm>({
  password: "",
  email: "",
});

const emailRules = [
  (v: string) => !!v || t("Please enter your e-mail address"),
  (v: string) => /.+@.+\..+/.test(v) || t("E-mail address must be valid"),
];

// ======================
// 错误处理配置
// ======================
const ERROR_CODES = {
  0: t("Your login is successful"),
  1009: t("Password is wrong"),
  1010: t("The email address is not registered"),
  "-1": t("The network connection is abnormal"),
} as Record<number, string>;

const alertMessage = computed(() => {
  if (!loginResult.value) return "";
  return (
    ERROR_CODES[loginResult.value.error] ||
    `未知错误 (代码: ${loginResult.value.error})`
  );
});

// ======================
// 工具函数
// ======================
const parseCookies = () => {
  return document.cookie
    .split(";")
    .reduce((cookies: Record<string, string>, cookie) => {
      const [name, value] = cookie.trim().split("=");
      cookies[name] = decodeURIComponent(value);
      return cookies;
    }, {});
};

// ======================
// 核心逻辑
// ======================
const handleLogin = async () => {
  if (isLoading.value) return;
  if (!form.value) return;

  const { valid } = await form.value.validate();
  if (!valid) return;

  isLoading.value = true;

  try {
    const result = await request.post(
      "/api/v1/gate/login",
      JSON.stringify({
        email: loginForm.value.email,
        password: loginForm.value.password,
      }),
      { withCredentials: true }
    );

    // 处理响应
    if (!result) {
      loginResult.value = { error: -1 };
      throw new Error();
    } else {
      loginResult.value = { uuid: result.uuid, error: result.error };
      console.log(loginResult.value);
      if (loginResult.value?.error === 0) {
        handleLoginSuccess();
      } else {
        throw new Error();
      }
    }
  } catch (err) {
    showAlert.value = true;
    alertType.value = "error";
    console.error(err);
  } finally {
    isLoading.value = false;
    setTimeout(() => {
      showAlert.value = false;
    }, 1000);
  }
};

// ======================
// 成功处理
// ======================
const handleLoginSuccess = () => {
  // 调试日志
  const cookies = parseCookies();
  console.log("Cookie:", cookies);

  // 展示成功状态
  showAlert.value = true;
  alertType.value = "success";

  // 检查重定向
  setTimeout(() => {
    const path = window.location.pathname.toString();
    if (path !== "/") {
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
