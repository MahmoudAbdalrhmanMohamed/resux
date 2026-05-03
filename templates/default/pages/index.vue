<script setup lang="ts">
const count = useState("count", () => 0)
const config = useRuntimeConfig()
const appName = String(config.public.appName ?? "Resux App")
type StarterStats = {
  response: string
  routes: string
  mode: string
}
const { data, pending, error } = await useAsyncData("starter-stats", ({ signal }) => {
  return $fetch<StarterStats>("/api/stats", { signal })
})

useSeoMeta({
  title: appName,
  description: "A Resux application.",
  keywords: [
    "Resux",
    "resumable framework",
    "server-side rendering",
    "Vue-like SFC",
    "TypeScript framework",
    "islands architecture",
    "Nuxt-inspired",
    "Qwik-inspired"
  ],
  ogTitle: appName,
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
      <h1>{{ appName }}</h1>
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
