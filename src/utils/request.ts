import axios from "axios";

// 从环境变量获取配置（需在 .env 文件中配置）
const baseURL = "https://localhost:8091";
const API_TIMEOUT = import.meta.env.VITE_API_TIMEOUT || 10000;

// 创建 axios 实例
const instance = axios.create({
  baseURL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

// 响应拦截器
instance.interceptors.response.use(
  (result) => {
    return result.data;
  },
  (error) => {
    console.error("Request error:", error);

    if (error.response) {
      // 服务器返回了错误状态码
      console.error("Response error:", error.response.status);

      switch (error.response.status) {
        case 401:
          console.error("Unauthorized - redirecting to login");
          // 只在非登录页面时重定向
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
          break;
        case 403:
          console.error("Forbidden");
          break;
        case 404:
          console.error("Resource Not Found");
          break;
        case 500:
          console.error("Internal Server Error");
          break;
        default:
          console.error("Unknown Error");
      }

      // 重要：抛出错误而不是返回 null
      return Promise.reject(error);
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error("No response received");
      return Promise.reject(new Error("No response received"));
    } else {
      // 请求配置错误
      console.error("Request setup error:", error.message);
      return Promise.reject(error);
    }
  }
);

export default instance;
