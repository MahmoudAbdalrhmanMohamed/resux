<script setup lang="ts">
definePageMeta({
  title: "About"
})

useSeoMeta({
  title: "About",
  description: "Learn about this Resux application.",
  keywords: ["Resux", "SSR", "resumability", "Vue-like routes", "server API"],
  ogTitle: "About",
  ogDescription: "Learn about this Resux application.",
  twitterCard: "summary"
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
