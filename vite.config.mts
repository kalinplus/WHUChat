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
      extendRoute(route: any, parent: any | undefined) { // Added parent argument for context
        // Log all route names and paths being processed by extendRoute
        console.log(`[vite.config.mts extendRoute] Processing route: Name='${route.name}', Path='${route.path}'`);

        // Try to match the chat route more reliably
        // For src/pages/chat.vue, the path is typically /chat
        if (route.path === "/chat") {
          console.log(
            "[vite.config.mts extendRoute] Matched /chat. Applying beforeEnter guard."
          );

          route.beforeEnter = async (to: any, from: any, next: any) => {
            // Dynamically import Pinia store to ensure it uses the client-side instance
            const { useStateStore } = await import("./src/stores/states");
            const stateStore = useStateStore();
            // Also dynamically import UserProfile if needed for type casting, or ensure GetChatServer is comprehensive
            const { UserProfile } = await import("./src/stores/states");


            console.log(
              "[Browser Guard /chat] beforeEnter: Attempting get_chatserver..."
            );
            try {
              const response = await fetch(`/api/v1/gate/get_chatserver`, {
                method: "GET",
                credentials: "include", // Important for sending cookies
              });

              if (!response.ok) {
                console.error(
                  `[Browser Guard /chat] Fetch failed: ${response.status}`
                );
                stateStore.setUser(null); // Clear user state
                stateStore.setAddr(null);  // Clear addr state
                // Assuming login route name is '/login'. Verify this.
                // If src/pages/login.vue exists, its name is likely '/login'.
                return next({ name: "/login" }); 
              }

              // Define GetChatServer interface directly here or ensure it's imported if it's complex
              interface GetChatServerResponse {
                uuid: number;
                username: string;
                addr: string;
                error: number;
                // email?: string; 
                // avatar_url?: string; 
              }
              const data: GetChatServerResponse = await response.json();
              console.log("[Browser Guard /chat] Fetched data:", data);

              if (data.error === 0 && data.uuid) {
                console.log("[Browser Guard /chat] Success:", data);
                stateStore.setUser({
                  uuid: data.uuid,
                  username: data.username,
                  // email: data.email, // Uncomment if API provides it
                  // avatar_url: data.avatar_url, // Uncomment if API provides it
                } as InstanceType<typeof UserProfile>); // Or ensure UserProfile fields match data
                stateStore.setAddr(data.addr);
                next();
              } else {
                console.error(
                  `[Browser Guard /chat] API error or no UUID: ${data.error}`
                );
                stateStore.setUser(null);
                stateStore.setAddr(null);
                next({ name: "/login" }); // Assuming login route name is '/login'
              }
            } catch (error) {
              console.error("[Browser Guard /chat] Exception:", error);
              // Ensure store is available for cleanup even in catch block after an await
              const { useStateStore: catchStateStore } = await import("./src/stores/states");
              const storeForCatch = catchStateStore();
              storeForCatch.setUser(null);
              storeForCatch.setAddr(null);
              next({ name: "/login" }); // Assuming login route name is '/login'
            }
          };
        }
        return route;
      }
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
