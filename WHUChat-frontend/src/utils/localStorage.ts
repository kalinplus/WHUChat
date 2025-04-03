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

export const getCurrentModel = () => {
  let model: string = get(STORAGE_KEY.CURRENT_MODEL) || MODELS[DEFAULT_MODEL_NAME]
  // if (!model) {
  //   model = MODELS[DEFAULT_MODEL_NAME];
  // }
  return model;
};

export const setApiKey = (val: any) => {
  const apiKey: any = getStoredApiKey();
  set(STORAGE_KEY.OPENAI_API_KEY, val);
  apiKey.value = val;
};

export const getStoredApiKey = () => {
  return get(STORAGE_KEY.OPENAI_API_KEY);
};
