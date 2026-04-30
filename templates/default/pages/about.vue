<script setup lang="ts">
definePageMeta({
  title: "About"
})
</script>

<template>
  <main class="page narrow">
    <p class="eyebrow">About</p>
    <h1>Built with Resux</h1>
    <p class="lede">This route is rendered from <code>pages/about.vue</code>.</p>
    <ResuxLink to="/">Back home</ResuxLink>
  </main>
</template>
