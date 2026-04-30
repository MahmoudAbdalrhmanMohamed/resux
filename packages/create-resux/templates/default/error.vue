<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode: number
    statusMessage: string
    message: string
  }
}>()
</script>

<template>
  <main class="page narrow">
    <p class="eyebrow">{{ props.error.statusCode }}</p>
    <h1>{{ props.error.statusMessage }}</h1>
    <p class="lede">{{ props.error.message }}</p>
    <ResuxLink to="/">Back home</ResuxLink>
  </main>
</template>
