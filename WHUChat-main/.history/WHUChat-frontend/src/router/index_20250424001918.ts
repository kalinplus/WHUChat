import { setupLayouts } from "virtual:generated-layouts";
import { createRouter, createWebHistory } from "vue-router"; // 使用标准vue-router
import { routes } from "vue-router/auto-routes";

const indexRoute = routes.find((route) => route.name === "/");
const indexComponent = indexRoute?.component;

// 创建完整的路由数组
const allRoutes = [
  ...routes,
  {
    path: "/:user",
    name: "conversation",
    component: indexComponent,
    props: true,
    meta: indexRoute?.meta || {},
  },
  {
    path: "/:user/:session_id",
    name: "session",
    component: indexComponent,
    props: true,
    meta: indexRoute?.meta || {},
  },
  {
    path: '/settings',
    component: () => import('@/components/settings.vue'),
    meta: { requiresAuth: true }
  },
];

console.log(allRoutes);

import type { RouteRecordRaw } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: setupLayouts(allRoutes as RouteRecordRaw[]),
});

// 其余代码不变...

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.("Failed to fetch dynamically imported module")) {
    if (!localStorage.getItem("vuetify:dynamic-reload")) {
      console.log("Reloading page to fix dynamic import error");
      localStorage.setItem("vuetify:dynamic-reload", "true");
      location.assign(to.fullPath);
    } else {
      console.error("Dynamic import error, reloading page did not fix it", err);
    }
  } else {
    console.error(err);
  }
});

router.isReady().then(() => {
  localStorage.removeItem("vuetify:dynamic-reload");
});

export default router;
