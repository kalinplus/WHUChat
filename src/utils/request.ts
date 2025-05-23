
import axios from "axios";

// 从环境变量获取配置（需在 .env 文件中配置）
const baseURL = "http://localhost:8091";
const API_TIMEOUT = import.meta.env.VITE_API_TIMEOUT || 10000;

// 创建 axios 实例
const instance = axios.create({
  baseURL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  }
});


//响应拦截器
instance.interceptors.response.use(
  (result) => {
    return result.data;
  },
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 处理未授权
          window.location.href = "/login";
          break;
        case 403:
          // 处理禁止访问
          console.error("Forbidden");
          break;
        case 404:
          // 处理资源未找到
          console.error("Resource Not Found");
          break;
        case 500:
          // 处理服务器错误
          console.error("Internal Server Error");
          break;
        default:
          console.error("Unknown Error");
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error("No response received");
    } else {
      // 请求配置错误
      console.error("Request setup error");
    }
    return null;
  }
);

export default instance;
