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

/**
 * 消息中的 prompt 对象形式
 */
export interface PromptObject {
  content: string;
  role: 'user' | 'assistant' | string;
}

/**
 * 消息中的 prompt 数组元素
 */
export interface PromptArrayItem {
  type: 'text' | 'image' | string;
  content: string | { url: string } | any;
}

/**
 * 单条消息数据
 */
export interface MessageItem {
  id: number;
  model_id: number | null;
  model_class?: string | null;
  // prompt 可以是单个对象或数组形式
  prompt: PromptObject | PromptArrayItem[] | any;
  sender?: 'user' | 'assistant' | string;
  session_id: number;
  uuid: number;
  // 可选的时间戳字段
  timestamp?: string;
}

/**
 * 会话历史消息响应
 */
export interface BrowseMessagesResponse {
  error: number;
  messages: MessageItem[];
}

/**
 * 前端格式化后的消息结构
 */
export interface FormattedMessage {
  id: string | number;
  is_bot: boolean;
  message: string;
  message_type: 'text' | 'image' | string;
  model_id?: number | null;
  model_class?: string | null;
  timestamp?: string;
}
