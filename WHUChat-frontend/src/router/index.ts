import { createRouter, createWebHistory } from "vue-router"; // 使用标准vue-router


// 创建完整的路由数组

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // 自动读取 Vite 的 base
  routes: [
    {
      path: '/',
      redirect: '/login' // 根路径重定向到 /login
    },
    {
      path: '/login',
      component: () => import('@/pages/index.vue')
    }
  ]
})


export default router;
