<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  label: string;
}>();

const count = ref(0);
</script>

<template>
  <div class="vue-island">
    <span>{{ label }}</span>
    <button type="button" @click="count++">Vue count: {{ count }}</button>
  </div>
</template>
