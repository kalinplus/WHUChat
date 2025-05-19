import { useTheme } from "vuetify";
import { ref, watch } from "vue";
import { useStateStore } from "./states";
import { useI18n } from "vue-i18n";


export function useLanguageManager() {
  const { locale } = useI18n({ useScope: "global" });
  const languageOptions = [
    { code: "zh", name: "中文" },
    { code: "en", name: "English" },
  ];
  const savedLanguage = localStorage.getItem("languagePreference");
  if (savedLanguage) {
    console.log(savedLanguage)
    locale.value = savedLanguage; // 初始化时应用存储值

  }
  const selectedLanguage = ref(locale.value);
  const updateLanguage = (val: string) => {
    locale.value = val;
    localStorage.setItem("languagePreference", val); // 持久化存储
  };

  return {
    languageOptions,
    selectedLanguage,
    updateLanguage
  }

}


export function useThemeManager() {

  const theme = useTheme();
  const savedTheme = localStorage.getItem("themePreference");
  if (savedTheme) {
    console.log(savedTheme)
   theme.global.name.value=savedTheme; // 初始化时应用存储值
  }
  const systemQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemChange = (e: MediaQueryListEvent) => {
    if (selectedTheme.value === "system") {
      theme.global.name.value = e.matches ? "dark" : "light";
    }
  };
  systemQuery.addEventListener("change", handleSystemChange);

  const isSystemDarkTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const selectedTheme = ref(theme.global.name.value);
  const updateTheme = (val: "light" | "dark" | "system") => {
    if (val === "system") {
      theme.global.name.value = isSystemDarkTheme() ? "dark" : "light";
    } else {
      theme.global.name.value = val;
    }
    localStorage.setItem("themePreference", val); // 持久化存储
  };

  return {
    selectedTheme,
    updateTheme
  }
}

export function useModelManager() {
  const stateStore = useStateStore();
  const selectedModel = ref(stateStore.currentModel);
  
  // 监听模型变化并保存
  watch(selectedModel, (newModel) => {
    if (newModel) {
      stateStore.setCurrentModel(newModel);
    }
  });

  const updateModel = (model) => {
    selectedModel.value = model;
  };

  return {
    selectedModel,
    updateModel
  };
}

export function useChatSettingsManager() {
  const enableWebSearch = ref(true);
  const frugalMode = ref(true);
  
  // 初始化
  const init = () => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      enableWebSearch.value = settings.enableWebSearch ?? true;
      frugalMode.value = settings.frugalMode ?? true;
    }
  };
  
  init();

  const updateChatSettings = () => {
    localStorage.setItem('chatSettings', JSON.stringify({
      enableWebSearch: enableWebSearch.value,
      frugalMode: frugalMode.value
    }));
  };

  return {
    enableWebSearch,
    frugalMode,
    updateChatSettings
  };
}