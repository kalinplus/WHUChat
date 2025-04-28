<template>
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-tabs v-model="tab" grow>
              <v-tab value="appearance">{{ $t('settings.appearance') }}</v-tab>
              <v-tab value="account">{{ $t('settings.account') }}</v-tab>
              <v-tab value="notifications">{{ $t('settings.notifications') }}</v-tab>
            </v-tabs>
  
            <v-card-text>
              <v-window v-model="tab">
                <v-window-item value="appearance">
                  <AppearanceSettings />
                </v-window-item>
                
                <v-window-item value="account">
                  <AccountSettings />
                </v-window-item>
                
                <v-window-item value="notifications">
                  <NotificationSettings />
                </v-window-item>
              </v-window>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue'
  import AppearanceSettings from '@AppearanceSettings.vue'
  //import AccountSettings from '@AccountSettings.vue'
  //import NotificationSettings from '@NotificationSettings.vue'
  
  const tab = ref('appearance')
  </script>
  