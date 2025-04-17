<template>
  <v-sheet class="register" width="300">
    <h1 class="title">{{ t("signUp") }}</h1>
    <v-form ref="form">
      <v-text-field
        v-model="user.username"
        :rules="nameRules"
        :label="t('username')"
        required
      />
      <v-text-field
        v-model="user.password"
        :rules="passwordRules"
        :label="t('password')"
        type="password"
        required
      />
      <v-text-field
        v-model="user.email"
        :rules="emailRules"
        :label="t('email')"
        required
      />
      <v-text-field
        v-model="confirmPassword"
        :rules="confirmPasswordRules"
        :label="t('Please enter your password')"
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
          {{ t("createAccount") }}
        </v-btn>

        <v-btn class="mt-4" color="success" block @click="retrunSignIn">
          {{ t("Sign in instead") }}
        </v-btn>
      </div>
    </v-form>
  </v-sheet>
</template>
<script setup lang="ts">
import { ref } from "vue";
import type { VForm } from "vuetify/components"; // 添加类型声明
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
const router = useRouter();

const { t } = useI18n();
const form = ref<InstanceType<typeof VForm>>();
const checkbox = ref(false);
const confirmPassword = ref("");

const user = ref<{
  id: number | null;
  username: string;
  password: string;
  email: string;
}>({
  id: null,
  username: "",
  password: "",
  email: "",
});

// 验证规则（无需使用ref）
const nameRules = [
  (v: string) => !!v || t("Username is required"),
  (v: string) => v.length >= 4 || t("Username must be at least 4 characters"),
];

const passwordRules = [
  (v: string) => !!v || t("Password is required"),
  (v: string) => v.length >= 8 || t("Password must be at least 8 characters"),
  (v: string) => /[a-zA-Z]/.test(v) || t("This password is entirely numeric."),
];

const confirmPasswordRules = [
  (v: string) => !!v || t("Please enter your password"),
  (v: string) => v === user.value.password || t("The passwords do not match"),
];

const emailRules = [
  (v: string) => !!v || t("Please enter your e-mail address"),
  (v: string) => /.+@.+\..+/.test(v) || t("E-mail address must be valid"),
];

// 表单验证方法
async function validate() {
  if (!form.value) return; // 安全校验

  const { valid } = await form.value.validate();
  valid && alert(t("Your registration is successful"));
  console.log(user.value.email);
  user.value.username = "";
  user.value.password = "";
  confirmPassword.value = "";
  checkbox.value = false;
  user.value.email = "";
  if (valid) {
    router.push("/login"); // 注册成功后跳转到登录页面
  }
}

// 重置表单
function retrunSignIn() {
  router.push("/login");
}
</script>

<style>
.register {
  margin: 0 auto;
  margin-top: 200px;
}
.title {
  text-align: center;
}
</style>
