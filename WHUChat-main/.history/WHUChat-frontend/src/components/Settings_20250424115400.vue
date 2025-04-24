<template>
  <v-layout class="settings-layout" full-height>
    <!-- 顶部返回按钮 -->
    <v-app-bar flat color="transparent" density="compact">
      <v-btn
        color="primary"
        variant="text"
        prepend-icon="mdi-arrow-left"
        @click="handleBack"
      >
        返回主页
      </v-btn>
    </v-app-bar>

    <!-- 主内容区 -->
    <v-main class="settings-main">
      <v-container fluid class="fill-height pa-0">
        <v-layout>
          <!-- 左侧导航栏 (固定280px) -->
          <v-navigation-drawer
            permanent
            width="280"
            class="left-sidebar"
            :elevation="1"
          >
            <v-text-field
              v-model="searchQuery"
              prepend-inner-icon="mdi-magnify"
              placeholder="搜索设置项..."
              variant="outlined"
              density="compact"
              class="ma-3"
              hide-details
            />
            <v-list density="compact" nav>
              <v-list-item
                v-for="item in filteredMenuItems"
                :key="item.value"
                :value="item"
                active-color="primary"
                :active="activeTab === item.value"
                @click="activeTab = item.value"
              >
                <template v-slot:prepend>
                  <v-icon :icon="item.icon" />
                </template>
                <v-list-item-title>{{ item.title }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-navigation-drawer>

          <!-- 右侧内容区 (自动填充剩余空间) -->
          <v-main class="right-content">
            <v-window v-model="activeTab" class="window-container">
              <!-- 外观设置 -->
              <v-window-item value="appearance">
                <v-card flat class="content-card">
                  <v-card-text>
                    <v-select
                      label="主题模式"
                      :items="['light', 'dark', 'system']"
                      v-model="theme"
                    />
                  </v-card-text>
                </v-card>
              </v-window-item>
              
              <!-- 模型配置 -->
              <v-window-item value="models">
                <v-card flat class="content-card">
                  <v-card-title class="d-flex justify-space-between">
                    <span>模型API配置</span>
                    <v-btn 
                      color="primary"
                      @click="addNewModel"
                      prepend-icon="mdi-plus"
                    >
                      添加模型
                    </v-btn>
                  </v-card-title>
                  <v-card-text>
                    <!-- 模型配置内容保持不变 -->
                  </v-card-text>
                </v-card>
              </v-window-item>
              
              <!-- 数据设置 -->
              <v-window-item value="data">
                <v-card flat class="content-card">
                  <v-card-title>数据设置</v-card-title>
                  <v-card-text>
                    <v-btn color="primary" class="mr-4">
                      <v-icon start>mdi-cloud-download</v-icon>
                      备份数据
                    </v-btn>
                    <v-btn color="secondary">
                      <v-icon start>mdi-cloud-upload</v-icon>
                      恢复数据
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-window-item>
            </v-window>
          </v-main>
        </v-layout>
      </v-container>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
// 脚本部分保持不变
</script>

<style scoped>
/* Vuetify布局增强 */
.settings-layout {
  height: 100vh;
}

.settings-main {
  height: calc(100vh - 64px); /* 减去app-bar高度 */
}

.left-sidebar {
  height: 100%;
  border-right: thin solid rgba(0, 0, 0, 0.12);
}

.right-content {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
}

.window-container {
  height: 100%;
}

.content-card {
  min-height: 100%;
}

/* 响应式调整 */
@media (max-width: 960px) {
  .left-sidebar {
    width: 100% !important;
    border-right: none;
    border-bottom: thin solid rgba(0, 0, 0, 0.12);
  }
  
  .right-content {
    padding: 16px;
  }
}
</style>
