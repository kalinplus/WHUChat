import axios from "axios";
import { ref } from "vue";
import type { Ref } from "vue";
import {
  useFetch,
  type BeforeFetchContext,
  type AfterFetchContext,
  type OnFetchErrorContext,
} from "@vueuse/core";
import { logout, getToken } from "@/utils/auth";

// 定义返回类型接口
interface FetchReturn<T> {
  data: Ref<T | null>;
  error: Ref<any>;
  loading: Ref<boolean>;
  execute: (throwError?: boolean) => Promise<any>;
}

// 基础 Fetch 封装 (可选，如果非认证请求也需要统一处理 baseURL)
export const useMyFetch = <T>(url: string, options?: any): FetchReturn<T> => {
  const baseUrl = "https://" + import.meta.env.VITE_API_HOST;
  const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

  const defaultOptions: any = {
    immediate: false, // Don't execute immediately
    timeout: 30000, // Default timeout
  };

  const fetchOptions = { ...defaultOptions, ...options };

  const {
    data,
    error,
    isFetching: loading,
    execute,
  } = useFetch<T>(fullUrl, fetchOptions).json<T>();

  return { data, error, loading, execute };
};

// 认证请求封装 (主要修改在这里)
// TODO: 检查这个函数，好像有问题
export const useAuthFetch = <T>(url: string, options?: any): FetchReturn<T> => {
  const baseUrl = "https://" + import.meta.env.VITE_API_HOST;
  const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

  const defaultOptions: any = {
    immediate: false, // Don't execute immediately
    timeout: 30000, // Default timeout

    // --- 认证和错误处理逻辑 ---
    async beforeFetch({ options }: BeforeFetchContext) {
      // 从你的认证逻辑中获取 token
      const token = getToken(); // Implement getToken() in your auth utils
      if (token) {
        // 确保 headers 对象存在
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token}`, // 或者你的认证方案
        };
      }
      ``;
      return { options };
    },

    onFetchError(
      ctx: OnFetchErrorContext
    ): Partial<OnFetchErrorContext> | Promise<Partial<OnFetchErrorContext>> {
      // ctx.data contains the response body if any
      // ctx.error contains the Error object
      // ctx.response contains the Response object
      if (ctx.response?.status === 401) {
        console.warn("Authentication error (401) detected by useAuthFetch.");
        // 触发登出逻辑
        try {
          logout(); // Call your logout function
          console.log("User logged out due to 401 error.");
          // 可选: 重定向到登录页
          // import router from '@/router'; // Assuming you have a router instance
          // router.push('/login');
        } catch (logoutErr) {
          console.error("Logout failed after 401 error:", logoutErr);
        }
        // 可以选择取消进一步的错误处理或修改错误对象
        // ctx.error = new Error('Session expired');
        // 返回修改后的 context 或 null/undefined 来阻止默认错误处理或修改错误状态
        return {
          error: new Error("Authentication failed or session expired."),
        }; // Example: Set a custom error
      }
      // 返回 ctx 继续默认错误处理，或返回 { error: null } 阻止 useFetch 设置 error ref
      // 返回修改后的 ctx 对象以继续处理，或者返回 null/undefined 来跳过 useFetch 的错误处理
      return ctx; // Continue with default error handling for other errors
    },
    // --- 结束认证和错误处理 ---
  };

  // 合并传入的 options，传入的 options 会覆盖 defaultOptions 中的同名配置 (除了 beforeFetch/onFetchError 等钩子，useFetch 会合并它们)
  // 注意：useFetch 会智能合并钩子函数，而不是覆盖
  const fetchOptions = { ...defaultOptions, ...options };

  // 使用 useFetch
  const {
    data,
    error,
    isFetching: loading,
    execute,
  } = useFetch<T>(fullUrl, fetchOptions).json<T>();

  // 返回兼容的结构
  return { data, error, loading, execute };
};
