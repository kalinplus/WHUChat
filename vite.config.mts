// Plugins
import fs from "node:fs";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import Fonts from "unplugin-fonts/vite";
import Layouts from "vite-plugin-vue-layouts";
import Vue from "@vitejs/plugin-vue";
import VueRouter from "unplugin-vue-router/vite";
import Vuetify, { transformAssetUrls } from "vite-plugin-vuetify";

// Utilities
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

import { useStateStore } from "./src/stores/states";
import type { UserProfile } from "./src/stores/states";
interface GetChatServer {
  uuid: number;
  username: string;
  addr: string;
  error: number;
  // email?: string; // 根据实际 API 返回添加
  // avatar_url?: string; // 根据实际 API 返回添加
}

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [
    VueRouter({
      dts: "src/typed-router.d.ts",
      routesFolder: "src/pages",
      extendRoute(route: any) {
        // Check if the current route is the one we want to modify
        if (route.name === "/chat" || route.path === "/chat") {
          console.log(
            "vite.config.mts: Extending /chat route with beforeEnter guard."
          );
          // Add or modify the beforeEnter guard
          route.beforeEnter = async (to: any, from: any, next: any) => {
            const stateStore = useStateStore();
            console.log(
              "导航守卫 (vite.config.mts via extendRoute): 尝试获取 get_chatserver 信息..."
            );
            try {
              const response = await fetch(`/api/v1/gate/get_chatserver`, {
                method: "GET",
                credentials: "include",
              });

              if (!response.ok) {
                console.error(
                  `导航守卫：获取会话失败，HTTP 状态: ${response.status}`
                );
                stateStore.setAddr("");
                return next("/login");
              }

              const data: GetChatServer =
                (await response.json()) as GetChatServer;
              console.log("data", data)

              if (data.error === 0 && data.uuid) {
                console.log("导航守卫：成功获取会话信息:", data);
                stateStore.setUser({
                  uuid: data.uuid,
                  username: data.username,
                } as UserProfile);
                stateStore.setAddr(data.addr);
                next();
              } else {
                console.error(
                  "导航守卫：获取会话失败，API 错误或无 UUID:",
                  data.error
                );
                next("/login");
              }
            } catch (error) {
              console.error("导航守卫：获取会话期间发生异常:", error);
              next("/login");
            }
          };
        }
        // IMPORTANT: Always return the route object or a modified version of it
        // If you don't want to modify a route, just return it as is.
        // If you want to remove a route, return undefined.
        return route;
      },
    }),
    Layouts(),
    AutoImport({
      imports: [
        "vue",
        {
          "vue-router/auto": ["useRoute", "useRouter"],
        },
      ],
      dts: "src/auto-imports.d.ts",
      eslintrc: {
        enabled: true,
      },
      vueTemplate: true,
    }),
    Components({
      dts: "src/components.d.ts",
    }),
    Vue({
      template: { transformAssetUrls },
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify({
      autoImport: true,
      styles: {
        configFile: "src/styles/settings.scss",
      },
    }),
    Fonts({
      google: {
        families: [
          {
            name: "Roboto",
            styles: "wght@100;300;400;500;700;900",
          },
        ],
      },
    }),
  ],
  define: { "process.env": {} },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    extensions: [".js", ".json", ".jsx", ".mjs", ".ts", ".tsx", ".vue"],
  },
  server: {
    // port: 3000,
    port: 8091,
    https: {
      key: fs.readFileSync("src/server/server.key"),
      cert: fs.readFileSync("src/server/server.crt"),
    },
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: "modern-compiler",
      },
    },
  },
});
