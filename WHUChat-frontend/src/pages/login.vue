<template>
  <v-app>
    <v-main>
      <v-sheet class="register" width="300">
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
            <v-btn class="mt-4" color="success" block @click="validate">
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
import { useStateStore } from "@/stores/states";
import { useAuthFetch } from "@/composables/fetch";
const stateStore = useStateStore();
const router = useRouter();

const { t } = useI18n();
const form = ref<InstanceType<typeof VForm>>();
const checkbox = ref(false);

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

// 表单验证方法
const validate = async () => {
  if (!form.value) return;

  // 验证表单
  const { valid } = await form.value.validate();
  if (!valid) return;

  try {
    // 使用 authFetch 发送请求
    const { error } = await useAuthFetch<{ uuid: number }>(
      "/api/v1/gate/login",
      {
        method: "POST",
        data: {
          email: loginForm.value.email,
          password: loginForm.value.password,
        },
        withCredentials: true, // 关键！允许携带cookie
      }
    );

    // 处理错误响应
    if (!error.value) {
      handleLoginSuccess();
    } else {
      // showLoginError(error.value?.data?.code);
    }

    // 登录成功处理（由后端重定向）
  } catch (err) {
    console.error(err);
  }
};

// 成功处理（如果后端未自动重定向）
const handleLoginSuccess = () => {
  // 检查是否已有重定向
  if (!window.location.pathname.startsWith("/")) {
    stateStore.setUser({ email: loginForm.value.email });
    router.push("/");
  }
};

// 错误代码映射
// const showLoginError = (code?: number) => {
//   const errorMap: Record<number, string> = {
//     1009: t("errors.invalidCredentials"),
//     1010: t("errors.accountLocked"),
//     1011: t("errors.emailNotVerified"),
//   };

//   alert(errorMap[code || 0] || t("errors.unknown"));
// };
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
