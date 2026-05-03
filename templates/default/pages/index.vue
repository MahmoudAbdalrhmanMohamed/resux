<script setup lang="ts">
const count = useState("count", () => 0)
const config = useRuntimeConfig()
const { data, pending, error } = await useAsyncData("starter-stats", async () => {
  await new Promise((resolve) => setTimeout(resolve, 700))
  return {
    response: "14 ms",
    routes: "2",
    mode: "Resumable"
  }
})

useSeoMeta({
  title: config.public.appName,
  description: "A Resux application.",
  ogTitle: config.public.appName,
  ogDescription: "A Resux application.",
  twitterCard: "summary_large_image",
  themeColor: "#2563eb"
})

function increment() {
  count.value++
}
</script>

<template>
  <main class="page">
    <section class="hero">
      <p class="eyebrow">Resux starter</p>
      <h1>{{ config.public.appName }}</h1>
      <p class="lede">Server-rendered Vue-like files with resumable client handlers.</p>
      <div class="actions">
        <button @click="increment">Count: {{ count }}</button>
        <ResuxLink to="/about">About this app</ResuxLink>
      </div>
    </section>

    <section class="stats-panel">
      <div v-if="pending" class="stats-grid">
        <div class="stat skeleton"></div>
        <div class="stat skeleton"></div>
        <div class="stat skeleton"></div>
      </div>
      <div v-if="error" class="stat error-state">
        <span>Stats unavailable</span>
        <strong>{{ error.message }}</strong>
        <a href="/">Try again</a>
      </div>
      <div v-if="!pending && !error && data" class="stats-grid">
        <article class="stat">
          <span>Response</span>
          <strong>{{ data.response }}</strong>
        </article>
        <article class="stat">
          <span>Routes</span>
          <strong>{{ data.routes }}</strong>
        </article>
        <article class="stat">
          <span>Mode</span>
          <strong v-text="data.mode">Mode</strong>
        </article>
      </div>
    </section>

    <section class="vue-panel">
      <VueIsland name="CounterIsland" :props="{ label: 'Vue island' }" />
    </section>
  </main>
</template>
