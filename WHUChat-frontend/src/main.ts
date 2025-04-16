/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from "@/plugins";

import { createApp } from "vue";
import { createI18n } from "vue-i18n";
import App from "./App.vue";
import router from "./router";
import { createVuetify } from "vuetify";
import enMessages from "./locales/en.json";
import zhMessages from "./locales/zh.json";
import '@mdi/font/css/materialdesignicons.css'

const i18n = createI18n({
  legacy: false, // 使用组合式API
  locale: "zh", // 默认语言
  fallbackLocale: "en",
  messages: {
    en: enMessages,
    zh: zhMessages,
  },
});

const vuetify = createVuetify();
const app = createApp(App);

registerPlugins(app);
app.use(router);
app.use(vuetify);
app.use(i18n);


app.mount("#app");
