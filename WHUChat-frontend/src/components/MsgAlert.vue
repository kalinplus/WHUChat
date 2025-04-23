<!-- components/AlertAlert.vue -->
<template>
  <v-alert
    v-if="visible"
    :type="type"
    class="mt-4 text-center animated fadeIn"
    dismissible
    @click:dismissible="handleClose"
  >
    {{ message }}
    <template #append>
      <v-btn
        class="close"
        background-color="transparent"
        variant="text"
        @click="handleClose"
      >
        CLOSE
      </v-btn>
    </template>
  </v-alert>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: "info",
    validator: (value) =>
      ["info", "success", "warning", "error"].includes(value),
  },
  message: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["close"]);

const handleClose = () => {
  emit("close");
};
</script>

<style scoped>
/* 添加动画效果 */
.animated {
  animation-duration: 0.3s;
}
.fadeIn {
  animation-name: fadeIn;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
