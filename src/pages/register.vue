<template>
  <v-app>
    <v-main>
      <v-sheet class="register" width="300">
        <MsgAlert
          :message="alertMessage"
          :visible="showAlert"
          :type="alertType"
          @close="showAlert = false"
        />

        <h1 class="title">{{ t("signUp") }}</h1>
        <v-form ref="form">
          <v-text-field
            v-model="formData.username"
            :rules="nameRules"
            :label="t('username')"
            required
          />

          <v-text-field
            v-model="formData.email"
            :rules="emailRules"
            :label="t('email')"
            required
          />
          <v-text-field
            v-model="formData.password"
            :rules="passwordRules"
            :label="t('password')"
            :type="showPassword ? 'text' : 'password'"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassword = !showPassword"
            required
          />

          <v-text-field
            v-model="formData.confirmPassword"
            :rules="confirmPasswordRules"
            :label="t('Please enter your password')"
            :type="showPassword ? 'text' : 'password'"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassword = !showPassword"
            required
          />
          <v-row>
            <!-- 验证码输入框 -->
            <v-col cols="8">
              <v-text-field
                v-model="formData.vrfCode"
                :rules="vrfCodeRules"
                :label="t('vrfcode')"
                type="text"
                required
                maxlength="4"
              />
            </v-col>

            <!-- 获取验证码按钮 -->
            <v-col cols="4">
              <v-btn
                color="primary"
                :loading="loading"
                :disabled="countdown > 0"
                @click="sendVrfCode"
                block
              >
                {{ buttonText }}
              </v-btn>
            </v-col>
          </v-row>
          <MsgAlert
            :message="errorMessage"
            :visible="showAlertForVrfcode"
            type="error"
            @close="showAlertForVrfcode = false"
          />

          <v-checkbox
            v-model="checkbox"
            :rules="[(v) => !!v || t('You must agree to continue')]"
            :label="t('agreeToThePrivacyPolicyToRegisterOrLogIn')"
            required
          />

          <div class="d-flex flex-column">
            <v-btn class="mt-4" color="success" block @click="handleSubmit">
              {{ t("createAccount") }}
            </v-btn>

            <v-btn class="mt-4" color="success" block @click="retrunSignIn">
              {{ t("Sign in instead") }}
            </v-btn>
          </div>
        </v-form>
      </v-sheet>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
// ======================
// 依赖引入
// ======================
import { ref, computed, onBeforeUnmount } from "vue";
import type { VForm } from "vuetify/components";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useAuthFetch } from "@/composables/fetch";
import CryptoJS from "crypto-js";
import axios from "axios";

// ======================
// 依赖注入
// ======================
const router = useRouter();
const { t } = useI18n();

// ======================
// 加密配置
// ======================
const SECRET_KEY = CryptoJS.enc.Utf8.parse("your-secret-key-123"); // 16字节密钥
const IV = CryptoJS.enc.Utf8.parse("your-secret-iv-456"); // 16字节初始向量

// ======================
// 响应式状态
// ======================
const form = ref<InstanceType<typeof VForm>>();
const loading = ref(false);
const showAlert = ref(false);
const alertMessage = ref("");
const alertType = ref("error");
const showPassword = ref(false);
const checkbox = ref(false);

// 验证码相关状态
const countdown = ref(0);
const timer = ref<any>(null);
const showAlertForVrfcode = ref(false);
const loadingForVrfcode = ref(false);
const errorMessage = ref("");

// ======================
// 类型定义
// ======================
interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  vrfCode: string;
}

// ======================
// 表单数据
// ======================
const formData = ref<FormData>({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  vrfCode: "",
});

// ======================
// 验证规则
// ======================
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
  (v: string) =>
    v === formData.value.password || t("The passwords do not match"),
];

const emailRules = [
  (v: string) => !!v || t("Please enter your e-mail address"),
  (v: string) => /.+@.+\..+/.test(v) || t("E-mail address must be valid"),
];

const vrfCodeRules = [
  (v: string) => !!v || t("Please enter the verification code"),
  (v: string) =>
    /^[a-z0-9]{4}$/.test(v) || t("Verification code must be 4 characters"),
];

// ======================
// 计算属性
// ======================
const buttonText = computed(() =>
  countdown.value > 0 ? `${countdown.value}秒后重发` : "获取验证码"
);

// ======================
// 验证码处理
// ======================
const sendVrfCode = async () => {
  if (!formData.value.email) {
    showAlertForVrfcode.value = true;
    errorMessage.value = "请先填写邮箱地址";
    return;
  }

  loadingForVrfcode.value = true;
  try {
    const response = await axios.post("/api/v1/gate/send_vrf", {
      email: formData.value.email,
    });

    response.data.error ? handleError(response.data.error) : startCountdown();
  } catch (error) {
    showAlertForVrfcode.value = true;
    errorMessage.value = t("The network connection is abnormal");
  } finally {
    loadingForVrfcode.value = false;
    setTimeout(() => (showAlertForVrfcode.value = false), 1000);
  }
};

const handleError = (code: number) => {
  const errorMap: Record<number, string> = {
    1006: "该邮箱已注册，请直接登录",
  };
  showAlertForVrfcode.value = true;
  errorMessage.value = errorMap[code] || "验证码发送失败，请稍后重试";
};

const startCountdown = () => {
  countdown.value = 60;
  timer.value = setInterval(() => {
    countdown.value > 0 ? countdown.value-- : clearInterval(timer.value!);
  }, 1000);
};

// ======================
// 工具函数
// ======================
const encryptPassword = (password: string) => {
  return CryptoJS.AES.encrypt(password, SECRET_KEY, {
    iv: IV,
    mode: CryptoJS.mode.CBC,
  }).toString();
};

// ======================
// 生命周期
// ======================
onBeforeUnmount(() => {
  if (timer.value) clearInterval(timer.value);
});

// ======================
// 界面交互
// ======================
const retrunSignIn = () => router.push("/login");

// ======================
// 表单提交处理
// ======================
const handleSubmit = async () => {
  if (!form.value) return;

  const { valid } = await form.value.validate();
  if (!valid) return;

  try {
    loading.value = true;

    // 构建加密数据
    const encryptedData = {
      username: formData.value.username,
      email: formData.value.email,
      password: encryptPassword(formData.value.password),
      repassword: encryptPassword(formData.value.confirmPassword),
      vrf_code: formData.value.vrfCode,
    };
    console.log(JSON.stringify(encryptedData));
    // 发送注册请求
    const { data, error } = await useAuthFetch("/api/v1/gate/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      withCredentials: true, // 添加这一行来显式携带 cookie
      body: JSON.stringify(encryptedData),
    });

    // 处理响应
    if (!error.value && data.value) {
      showAlert.value = true;
      alertType.value = "success";
      alertMessage.value = t("Your registration is successful");
      form.value.reset();
      setTimeout(() => router.push("/login"), 1000);
    } else {
      throw error.value;
    }
  } catch (err: any) {
    console.error(t("Your registration failed"));
    alertType.value = "error";
    alertMessage.value =
      err?.response?.data?.message || t("Your registration failed");
    showAlert.value = true;
  } finally {
    loading.value = false;
    setTimeout(() => (showAlert.value = false), 1000);
  }
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
