<!-- filepath: g:\github\WHUChat\WHUChat-frontend\src\components\UserAvatar.vue -->
<template>
  <div>
    <v-menu>
      <template v-slot:activator="{ props }">
        <v-btn v-bind="props" class="ml-2" variant="text">
          <v-icon v-if="!user" :size="size">mdi-account-circle</v-icon>
          <v-avatar v-else :size="size" color="primary" class="text-white">
            {{ user?.username ? user.username.charAt(0).toUpperCase() : "U" }}
          </v-avatar>
        </v-btn>
      </template>

      <v-card min-width="200">
        <v-list>
          <v-list-item v-if="user">
            <v-list-item-title>{{ user.username }}</v-list-item-title>
            <v-list-item-subtitle>{{ user.email }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>

        <v-divider></v-divider>

        <v-list>
          <v-list-item @click="$emit('openSettings')">
            <template v-slot:prepend>
              <v-icon>mdi-cog</v-icon>
            </template>
            <v-list-item-title>{{ t("settings") }}</v-list-item-title>
          </v-list-item>

          <v-list-item @click="$emit('signOut')">
            <template v-slot:prepend>
              <v-icon>mdi-logout</v-icon>
            </template>
            <v-list-item-title>{{ t("signOut") }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();

defineProps({
  user: {
    type: Object,
    default: null,
  },
  size: {
    type: [Number, String],
    default: 36,
  },
});

defineEmits(["openSettings", "signOut"]);
</script>
