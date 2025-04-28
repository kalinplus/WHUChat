/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";

// Composables
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { aliases, mdi } from "vuetify/iconsets/mdi";
import { md3 } from 'vuetify/blueprints'
const lightTheme = {
  dark: false,
  colors: {
    primary: '#2196F3',      // 主蓝色
    secondary: '#4CAF50',    // 辅助绿色
    background: '#FFFFFF',   // 背景白
    surface: '#F5F5F5'       // 卡片背景
  }
}

const darkTheme = {
  dark: true,
  colors: {
    primary: '#BB86FC',      // Material暗色主色
    secondary: '#03DAC6',
    background: '#121212',   // 深灰背景
    surface: '#1E1E1E'
  }
}


// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: "light",
     themes: { light: lightTheme, dark: darkTheme },
  },
  components,
  directives,
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: {
      mdi,
    },
  },
});
