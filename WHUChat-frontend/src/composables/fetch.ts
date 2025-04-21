import axios from 'axios';
import { ref } from 'vue';
import type { Ref } from 'vue';

// 定义返回类型接口
interface FetchReturn<T> {
  data: Ref<T | null>;
  error: Ref<Error | null>;
  loading: Ref<boolean>;
  execute: () => Promise<void>;
}

// 替代 useFetch 的自定义 hook
export const useMyFetch = <T>(url: string, options: any = {}): FetchReturn<T> => {
  const data = ref<T | null>(null) as Ref<T | null>;
  const error = ref<Error | null>(null);
  const loading = ref<boolean>(false);

  // 默认选项
  const defaultOptions = {
    headers: {
      Accept: 'application/json'
    }
  };

  // 合并选项
  const requestOptions = Object.assign({}, defaultOptions, options);

  // 根据环境设置基础URL
  const baseURL = import.meta.env.VITE_SERVER_DOMAIN || '';

  // 执行请求的函数
  const execute = async (): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios({
        url,
        baseURL,
        ...requestOptions
      });
      data.value = response.data
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      console.error('Request error:', err);
    } finally {
      loading.value = false;
    }
  };

  // 立即执行请求（可选，取决于你的需求）
  execute();

  return { data, error, loading, execute };
};

// 认证请求封装
export const useAuthFetch = async <T>(url: string, options: any = {}): Promise<FetchReturn<T>> => {
  const result = await useMyFetch<T>(url, options);

  // 检查认证错误
  if (result.error.value && axios.isAxiosError(result.error.value) && result.error.value.response?.status === 401) {
    // 调用登出函数
    // 假设你有一个 auth.ts 文件导出了 logout 函数
    try {
      const { logout } = await import('@/utils/auth');
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  return result;
};
