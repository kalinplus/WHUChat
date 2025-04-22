// 定义用户提示消息的类型
export interface PromptMessage {
  role: "user" | "system" | "image"; // 消息角色
  content: string; // 消息内容
}

// 定义参数对象的类型
export interface ChatParameters {
  temperature: number; // 温度参数
  frugalMode?: boolean; // 节俭模式
  thinking?: boolean; // 思考模式
  online?: boolean; // 是否联网
  ua?: string; // 用户代理
  [key: string]: any; // 其他可能的参数
}

// 定义完整的聊天请求数据类型
export interface ChatRequestData {
  uuid: number | string; // 用户唯一标识
  session_id: number | string | null; // 会话ID（新对话为null）
  model_class: string; // 模型ID，如"claude-3-haiku"
  model_id: string; // 模型大类，如"gemini"
  prompt: PromptMessage[]; // 用户提示内容数组
  parameters: ChatParameters; // 参数对象
  URL?: string; // 可选的自定义模型调用网址
  api_key?: string; // 可选的自定义API密钥
}

// 定义期望的响应类型
export interface ConversationInfo {
  uuid: number;
  id: number;
  title: string;
  updated_at: string;
}
export interface ConversationsResponse {
  error: number;
  sessions: ConversationInfo[];
}
