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
import { ref } from "vue";
import type { VForm } from "vuetify/components";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useAuthFetch } from "@/composables/fetch";
import CryptoJS from "crypto-js";
import axios from "axios";

// 加密配置（需与后端保持一致）
const SECRET_KEY = CryptoJS.enc.Utf8.parse("your-secret-key-123"); // 16位密钥
const IV = CryptoJS.enc.Utf8.parse("your-secret-iv-456"); // 16位初始向量

const router = useRouter();
const { t } = useI18n();

const form = ref<InstanceType<typeof VForm>>();
const checkbox = ref(false);
const showPassword = ref(false);
const loading = ref(false);
const showAlert = ref(false);
const alertMessage = ref("");
const alertType = ref("error");

const countdown = ref(0);
const timer = ref(null);

const errorMessage = ref("");
const showAlertForVrfcode = ref(false);
const loadingForVrfcode = ref(false);
interface formData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  vrfCode: string;
}
const formData = ref<formData>({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  vrfCode: "",
});

// 验证规则
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

//验证码
const buttonText = computed(() =>
  countdown.value > 0 ? `${countdown.value}秒后重发` : "获取验证码"
);
const sendVrfCode = async () => {
  if (!formData.value.email) {
    showAlertForVrfcode.value = true;
    errorMessage.value = "请先填写邮箱地址";
    return;
  }

  loadingForVrfcode.value = true;
  try {
    const response = await axios.post(
      "/api/v1/gate/send_vrf",
      JSON.stringify({
        email: formData.value.email,
      })
    );

    if (response.data.error) {
      handleError(response.data.error);
    } else {
      startCountdown();
    }
  } catch (error) {
    showAlertForVrfcode.value = true;
    errorMessage.value = "请求失败，请检查网络连接";
  } finally {
    loadingForVrfcode.value = false;
    setTimeout(() => {
      showAlertForVrfcode.value = false;
    }, 1000);
  }
};
const startCountdown = () => {
  countdown.value = 60;
  timer.value = setInterval(() => {
    if (countdown.value <= 0) {
      clearInterval(timer.value);
      return;
    }
    countdown.value--;
  }, 1000);
};

const handleError = (code: any) => {
  const errorMap = {
    1006: "该邮箱已注册，请直接登录",
    default: "验证码发送失败，请稍后重试",
  };
  showAlertForVrfcode.value = true;
  errorMessage.value = errorMap[code] || errorMap.default;
};

// 生命周期
onBeforeUnmount(() => {
  clearInterval(timer.value);
});

//密码加密
const encryptPassword = (password: string) => {
  const encrypted = CryptoJS.AES.encrypt(password, SECRET_KEY, {
    iv: IV,
    mode: CryptoJS.mode.CBC,
  });
  return encrypted.toString();
};

function retrunSignIn() {
  router.push("/login");
}
const handleSubmit = async () => {
  if (!form.value) return;

  const { valid } = await form.value.validate();
  if (!valid) return;

  try {
    loading.value = true;

    // 加密敏感数据
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
      body: JSON.stringify(encryptedData),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // 处理成功响应
    if (!error.value && data.value) {
      showAlert.value = true;
      alertMessage.value = t("Your registration is successful");
      alertType.value = "success";
      form.value.reset();
      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } else {
      throw new Error(error.toString());
    }
  } catch (err) {
    console.error(t("Your registration failed"), err);
    showAlert.value = true;
    alertMessage.value =
      err.response?.data?.message || t("Your registration failed");
    alertType.value = "error";
  } finally {
    loading.value = false;
    setTimeout(() => {
      showAlert.value = false;
    }, 1000);
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
