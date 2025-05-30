<template>
  <MsgAlert
    :visible="showAlert"
    :message="alertMessage"
    :type="alertType"
    @close="showAlert = false"
    class="alert-floating"
  />
  <v-container class="login-container" fluid>
    <v-card class="auth-card" elevation="12">
      <!-- 左侧蓝色区域 -->
      <v-sheet
        class="blue-section"
        color="#69aef3"
        :class="{ active: isRegister }"
      >
        <div class="welcome-content">
          <h1 class="welcome-title">{{ t("welcomeTo") }}WHUChat</h1>
          <p class="text-body-1 mb-8">
            {{
              isRegister
                ? t("Already have an account?")
                : t("Don't have an account?")
            }}
          </p>
          <v-btn
            variant="outlined"
            color="white"
            size="large"
            @click="isRegister = !isRegister"
            >{{ isRegister ? t("Sign in instead") : t("createAccount") }}</v-btn
          >
        </div>
      </v-sheet>

      <!-- 右侧登录表单 -->
      <div class="white-section" :class="{ active: isRegister }">
        <transition name="slide" mode="out-in">
          <v-form
            v-if="!isRegister"
            key="login"
            @submit.prevent="handleLogin"
            class="login-form"
            ref="loginform"
          >
            <h1 class="text-h4 text-black mb-8" style="text-align: center">
              {{ t("signIn") }}
            </h1>

            <v-text-field
              v-model="loginForm.email"
              variant="outlined"
              :label="t('email')"
              required
              :rules="emailRules"
              prepend-inner-icon="mdi-email-outline"
              style="margin-bottom: 10px"
              class="mb-2"
            />

            <v-text-field
              v-model="loginForm.password"
              :rules="passwordRules"
              variant="outlined"
              :label="t('password')"
              required
              :type="showPassword[0] ? 'text' : 'password'"
              :append-inner-icon="showPassword[0] ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword[0] = !showPassword[0]"
              prepend-inner-icon="mdi-lock-outline"
              class="mb-2"
            />

            <div class="text-right mb-4">
              <a class="forgot-link text-body-2" style="cursor: pointer">{{
                t("Forgot Password?")
              }}</a>
            </div>

            <v-btn
              type="submit"
              color="primary"
              size="large"
              block
              class="mb-6"
              @click="handleLogin"
            >
              {{ t("clickToSignIn") }}
            </v-btn>
          </v-form>

          <v-form
            v-else
            key="register"
            class="register-form"
            ref="registerform"
          >
            <h1 class="text-h4 text-primary mb-8" style="text-align: center">
              {{ t("signUp") }}
            </h1>

            <v-text-field
              v-model="registerForm.username"
              variant="outlined"
              :label="t('username')"
              :rules="nameRules"
              required
              prepend-inner-icon="mdi-account-outline"
            ></v-text-field>

            <v-text-field
              v-model="registerForm.email"
              variant="outlined"
              type="email"
              :label="t('email')"
              required
              :rules="emailRules"
              prepend-inner-icon="mdi-email-outline"
              class="mb-2"
            ></v-text-field>

            <v-text-field
              v-model="registerForm.password"
              :rules="passwordRules"
              :label="t('password')"
              :type="showPassword[1] ? 'text' : 'password'"
              variant="outlined"
              prepend-inner-icon="mdi-lock-outline"
              @click:append-inner="showPassword[1] = !showPassword[1]"
              :append-inner-icon="showPassword[1] ? 'mdi-eye-off' : 'mdi-eye'"
              class="mb-2"
            ></v-text-field>

            <v-text-field
              v-model="registerForm.confirmPassword"
              variant="outlined"
              :rules="confirmPasswordRules"
              :label="t('Please enter your password')"
              :type="showPassword[2] ? 'text' : 'password'"
              :append-inner-icon="showPassword[2] ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword[2] = !showPassword[2]"
              prepend-inner-icon="mdi-lock-outline"
              class="mb-2"
            ></v-text-field>
            <v-row>
              <!-- 验证码输入框 -->
              <v-col cols="6">
                <v-text-field
                  v-model="registerForm.vrfCode"
                  :rules="vrfCodeRules"
                  :label="t('vrfcode')"
                  type="text"
                  required
                  maxlength="4"
                />
              </v-col>

              <!-- 获取验证码按钮 -->
              <v-col cols="6">
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

            <v-checkbox
              v-model="checkbox"
              :rules="[(v) => !!v || t('You must agree to continue')]"
              :label="t('agreeToThePrivacyPolicyToRegisterOrLogIn')"
              required
            />
            <v-btn
              color="primary"
              size="large"
              block
              class="mb-4"
              @click="handleRegister"
            >
              {{ t("createAccount") }}
            </v-btn>
          </v-form>
        </transition>
      </div>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { VForm } from "vuetify/components";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import request from "@/utils/request";
import CryptoJS from "crypto-js";
import { useStateStore, type UserProfile } from "@/stores/states";

// ======================
// 依赖注入
// ======================
const router = useRouter();
const { t } = useI18n();
const stateStore = useStateStore();

// ======================
// 加密配置
// ======================
const SECRET_KEY = CryptoJS.enc.Utf8.parse("your-secret-key-123"); // 16字节密钥
const IV = CryptoJS.enc.Utf8.parse("your-secret-iv-456"); // 16字节初始向量

// ======================
// 响应式状态声明
// ======================
const loginform = ref<InstanceType<typeof VForm>>();
const registerform = ref<InstanceType<typeof VForm>>();
const checkbox = ref(false);
const showAlert = ref(false);
const alertType = ref("error");
const isLoading = ref(false);
const loginResult = ref<LoginResult>();
const isRegister = ref(false);
const showPassword = ref([false, false, false]);
const loading = ref(false);
const timer = ref<any>(null);
const errorCode = ref(0);
const loadingForVrfcode = ref(false);
const user = ref<UserProfile>();

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
interface registerForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  vrfCode: string;
}
const registerForm = ref<registerForm>({
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  vrfCode: "",
});
const loginForm = ref<LoginForm>({
  password: "",
  email: "",
});

// ======================
//验证规则
// ======================

const emailRules = [
  (v: string) => !!v || t("Please enter your e-mail address"),
  (v: string) => /.+@.+\..+/.test(v) || t("E-mail address must be valid"),
];
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
    v === registerForm.value.password || t("The passwords do not match"),
];

const vrfCodeRules = [
  (v: string) => !!v || t("Please enter the verification code"),
  (v: string) =>
    /^[a-z0-9]{4}$/.test(v) || t("Verification code must be 4 characters"),
];

// ======================
// 错误处理配置
// ======================
const ERROR_CODES = {
  0: t("Your login is successful"),
  1: t("Please Enter Your Email Address First"),
  2: t("Your registration is successful"),
  3: t("Verification Code Sent to Email"),
  1005: t("Username Already Exists"),
  1006: t("Email Already Registered"),
  1007: t("Passwords Do Not Match"),
  1008: t("Invalid Verification Code"),
  1009: t("Password is wrong"),
  1010: t("The email address is not registered"),
  "-1": t("The network connection is abnormal"),
} as Record<number, string>;

const alertMessage = computed(() => {
  return (
    ERROR_CODES[errorCode.value] || t("Unknown Error") + `: ${errorCode.value}`
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

const encryptPassword = (password: string) => {
  return CryptoJS.AES.encrypt(password, SECRET_KEY, {
    iv: IV,
    mode: CryptoJS.mode.CBC,
  }).toString();
};

// ======================
// 核心逻辑
// ======================
const handleLogin = async () => {
  if (isLoading.value) return;
  if (!loginform.value) return;

  const { valid } = await loginform.value.validate();
  if (!valid) return;

  isLoading.value = true;

  try {
    const result = ref<any>();
    result.value = await request.post(
      "/api/v1/gate/login",
      {
        email: loginForm.value.email,
        password: encryptPassword(loginForm.value.password),
      }
      // { withCredentials: true }
    );
    console.log(encryptPassword(loginForm.value.password));
    console.log("[login.vue] Raw response from /api/v1/gate/login:", result.value);

    // const result = await request.get("http://localhost:3000/login");
    // 处理响应
    if (!result.value) {
      console.log("No response from server");
      loginResult.value = { error: -1 };
      errorCode.value = -1;
      throw new Error();
    } else {
      loginResult.value = {
        uuid: result.value.uuid,
        error: result.value.error,
      };
      user.value = {
        uuid: result.value.uuid,
        username: result.value.username,
        email: result.value.email,
      };
      errorCode.value = result.value.error;
      console.log(loginResult.value);
      if (loginResult.value?.error == 0) {
        console.log("Login successful");
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
const handleLoginSuccess = () => {
  // 展示成功状态
  showAlert.value = true;
  alertType.value = "success";
  console.log("[login.vue] User object before setUser:", user.value);
  stateStore.setUser(user.value ?? null);
  // 检查重定向
  setTimeout(() => {
    router.push("/chat");
  }, 1000);
};
//验证码逻辑
const buttonText = computed(() =>
  countdown.value > 0 ? `${countdown.value}S` : t("Get VrfCode")
);
const countdown = ref(0);
const startCountdown = () => {
  showAlert.value = true;
  alertType.value = "success";
  errorCode.value = 3;
  setTimeout(() => {
    showAlert.value = false;
  }, 1000);
  countdown.value = 60;
  timer.value = setInterval(() => {
    countdown.value > 0 ? countdown.value-- : clearInterval(timer.value!);
  }, 1000);
};
const sendVrfCode = async () => {
  if (!registerForm.value.email) {
    showAlert.value = true;
    errorCode.value = 1;
    return;
  }

  loadingForVrfcode.value = true;
  try {
    const response = ref<any>();
    response.value = await request.post("/api/v1/gate/send_vrf", {
      email: registerForm.value.email,
    });
    // const response = await request.get("http://localhost:3000/vrfcode");

    if (response.value) {
      response.value.error
        ? handleError(response.value.error)
        : startCountdown();
    } else {
      throw new Error();
    }
  } catch (error) {
    errorCode.value = -1;
    showAlert.value = true;
    alertType.value = "error";
  } finally {
    loadingForVrfcode.value = false;
    setTimeout(() => (showAlert.value = false), 1000);
  }
};

const handleError = (code: number) => {
  showAlert.value = true;
  alertType.value = "error";
  errorCode.value = code;
};
onBeforeUnmount(() => {
  if (timer.value) clearInterval(timer.value);
});

//注册逻辑

const handleRegister = async () => {
  if (!registerform.value) return;
  console.log("register");

  const { valid } = await registerform.value.validate();
  if (!valid) return;

  try {
    loading.value = true;

    // 构建加密数据
    const encryptedData = {
      username: registerForm.value.username,
      email: registerForm.value.email,
      password: encryptPassword(registerForm.value.password),
      repassword: encryptPassword(registerForm.value.confirmPassword),
      vrf_code: registerForm.value.vrfCode,
    };
    console.log(JSON.stringify(encryptedData));
    // 发送注册请求
    const result = ref<any>();
    result.value = await request.post(
      "/api/v1/gate/register",
      JSON.stringify(encryptedData)
    );

    // const result = await request.get("http://localhost:3000/register");

    // 处理响应
    if (result.value) {
      if (!result.value.error) {
        showAlert.value = true;
        alertType.value = "success";
        errorCode.value = 2;
        // form.value.reset();
        setTimeout(() => (isRegister.value = false), 1000);
      } else {
        errorCode.value = result.value.error;
        throw new Error();
      }
    } else {
      errorCode.value = -1;
      throw new Error();
    }
  } catch (err) {
    alertType.value = "error";
    showAlert.value = true;
  } finally {
    loading.value = false;
    setTimeout(() => (showAlert.value = false), 1000);
  }
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #e3f2fd 50%, #f8f9fa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-card {
  width: 100%;
  width: 900px;
  height: 700px;
  border-radius: 30px;
  overflow: hidden;
  display: flex;
}

.blue-section {
  width: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 150px 150px 0;
  transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 3;
}

.blue-section.active {
  transform: translateX(100%);
  width: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 150px 0 0 150px;
  z-index: 3;
}

.welcome-content {
  color: white;
  text-align: center;
  padding: 0 32px;
}
.welcome-title {
  font-size: 3rem; /* 默认 48px */
  line-height: 3.75rem; /* 1.25倍行高 */
  letter-spacing: -0.0083333333em; /* -0.1px */
  font-family: inherit; /* 继承父级字体 */

  /* 字重 - 匹配 font-weight-bold */
  font-weight: 700; /* 等同于 bold */

  /* 间距 - 匹配 mb-4 */
  margin-bottom: 1rem; /* 16px (基于 Vuetify 间距比例) */
}
.white-section {
  flex: 1;
  padding: 60px 80px;
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.white-section.active {
  transform: translateX(-100%);
  z-index: 1;
}

.login-form {
  max-width: 400px;
  margin: 80px auto;
}
.register-form {
  max-width: 400px;
  margin: 0 auto;
}

.forgot-link {
  color: #666;
  text-decoration: none;
  transition: color 0.3s;
}

.forgot-link:hover {
  color: #4089d2;
}

.social-icons {
  display: flex;
  justify-content: center;
  gap: 12px;
}

@media (max-width: 960px) {
  .auth-card {
    flex-direction: column;
    min-height: auto;
    margin: 24px;
  }

  .blue-section {
    width: 100%;
    height: 20%;
    border-radius: 0 0 20px 20px;
    padding: 40px 0;
    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .welcome-title {
    font-size: 1.7rem; /* 34px (移动端适配) */
    line-height: 1.7rem; /* 调整行高 */
    padding: 0;
    margin: 5px;
  }

  .blue-section.active {
    transform: translateY(400%);
    width: 100%;
    height: 20%;
    padding: 40px 0;
    border-radius: 20px 20px 0 0;
    z-index: 3;
  }

  .blue-section::after {
    display: none;
  }

  .white-section {
    padding: 40px 24px;
    overflow: auto;
  }

  .white-section.active {
    transform: translateY(-25%);
    overflow: auto;
    z-index: 1;
  }
}

.alert-floating {
  /* 基础定位 */
  position: fixed;
  left: 50%;
  top: 10%;
  transform: translate(-50%, -50%);
  z-index: 9999;

  /* 尺寸控制 */
  width: 300px;
  max-height: 80vh;
  overflow-y: auto;

  /* 视觉设计 */
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  background: #fff;

  /* 动画效果 */
  transition: opacity 0.3s, transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
</style>
