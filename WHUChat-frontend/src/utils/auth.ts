import { useStateStore } from "@/stores/states";

// 登出函数
export const logout = async () => {
  const stateStore = useStateStore();

  // 清除用户信息
  stateStore.setUser(null);

  // 清除 token（如果有存储在本地）
  localStorage.removeItem("auth_token");

  // 可能需要的其他清理操作

  // 重定向到登录页面
  window.location.href = "/login";
};

// 其他认证相关函数可以在这里添加
export const isAuthenticated = () => {
  const stateStore = useStateStore();
  return !!stateStore.user;
};
