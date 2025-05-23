import { useTheme } from "vuetify";
import { ref } from "vue";
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

