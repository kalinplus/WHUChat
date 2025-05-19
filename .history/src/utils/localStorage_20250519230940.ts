import { STORAGE_KEY, MODELS, DEFAULT_MODEL_NAME } from "./enums";

const get = (key: string) => {
  // process.server是检测代码运行是在浏览器还是服务器
  // TODO: 如果确认代码只会在浏览器端运行，则不用检查运行时环境
  // if (process.server) return
  let val = localStorage.getItem(key);
  if (val) {
    val = JSON.parse(val);
  }
  return val;
};

const set = (key: string, val: any) => {
  // if (process.server) return;
  localStorage.setItem(key, JSON.stringify(val));
};

// TODO: 确认这个有没有用，会报错，先注释掉了
// export const setModels = (val: any) => {
//   const models = useModels();
//   set(STORAGE_KEY.MODELS, val);
//   models.value = val;
// };

// export const getStoredModels = () => {
//     let models = get(STORAGE_KEY.MODELS)
//     if (!models) {
//         models = [DEFAULT_MODEL]
//     }
//     return models
// }

export const saveCurrentModel = (val: any) => {
  set(STORAGE_KEY.CURRENT_MODEL, val);
};

export function getCurrentModel() {
  const defaultModel = {
    id: "claude-3-haiku",
    name: "Claude 3 Haiku",
    description: "Anthropic Claude 3 Haiku",
    logo: "/models/anthropic.png",
    model_id: "claude-3-haiku",
    model_class: "anthropic",
    api_key: "", // 添加API Key字段
    custom_url: "", // 添加自定义URL字段
  };

  try {
    const storedModel = localStorage.getItem('currentModel');
    return storedModel ? JSON.parse(storedModel) : defaultModel;
  } catch (e) {
    console.error('Error loading current model', e);
    return defaultModel;
  }
}

export const setApiKey = (val: any) => {
  const apiKey: any = getStoredApiKey();
  set(STORAGE_KEY.OPENAI_API_KEY, val);
  apiKey.value = val;
};

export const getStoredApiKey = () => {
  return get(STORAGE_KEY.OPENAI_API_KEY);
};
