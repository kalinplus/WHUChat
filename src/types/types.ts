// 定义用户提示消息的类型

/** 聊天请求的参数对象的类型
 *
 */
export interface ChatParameters {
  temperature: number; // 温度参数
  frugalMode?: boolean; // 节俭模式
  reasonable?: boolean; // 推理模式
  online?: boolean; // 是否联网
  ua?: string; // 用户代理
  [key: string]: any; // 其他可能的参数
}

// 定义完整的聊天请求数据类型
export interface ChatRequestData {
  uuid: number | string; // 用户唯一标识
  session_id: number | string | null; // 会话ID（新对话为null）
  sender: string,
  model_id: number; // 模型大类，如"gemini"
  prompt: PromptArrayItem[]; // 用户提示内容数组
  parameters: ChatParameters; // 参数对象
  URL?: string | null; // 可选的自定义模型调用网址
  api_key?: string | null; // 可选的自定义API密钥
}

// 模型接口
export interface Model {
  id: string;
  name: string;
  description: string;
  logo: string;
  model_id: string;
  model_class: string;
}

// 用于侧边栏会话列表的响应类型
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

// /**
//  * browse_messages 中的后端返回的 prompt 对象形式
//  */
// export interface PromptObject {
//   role: "user" | "assistant" | string;
//   content: string;
// }

/**
 * 消息中的 prompt 数组元素
 */
export interface PromptArrayItem {
  type: "text" | "image" | string;
  text: string | { url: string } | any;
}

/**
 * browser_messages 接口，后端返回的一个会话的所有历史对话中，单个历史对话
 */
export interface MessageItem {
  id: number;
  model_id: number;
  sender: "user" | "assistant" | string;
  prompt: PromptArrayItem[];  // 现在只会是 array，只有文本内容则是一个元素的数组
  parameters?: ChatParameters;
  model_class?: string | null;
  URL?: string | null;
  api_key?: string | null;
  session_id?: number;
  uuid?: number;
}

/**
 * 一个会话中的所有历史对话响应
 */
export interface BrowseMessagesResponse {
  error: number;
  messages: MessageItem[];
}

/**
 * 前端格式化后的消息结构
 */
export interface FormattedMessage {
  id: number | number;
  sender: string;
  model_id: number | null;
  is_bot: boolean;
  message: string;
  model_class?: string | null;
  // TODO: 后面考虑是否添加图片支持，现在纯文本
  message_type: "text" | "image" | string;
}
