/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { registerPlugins } from "@/plugins";
import "@mdi/font/css/materialdesignicons.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
registerPlugins(app);
app.mount("#app");
