<script setup lang="ts">
definePageMeta({
  middleware: "auth"
})

const count = ref(0)
const config = useRuntimeConfig()
const appName = String(config.public.appName ?? "Resux App")
const pluginLabel = String(useResuxApp().provides.starterPlugin ?? "Starter plugin")
type StarterStats = {
  response: string
  routes: string
  mode: string
}
const { data, pending, error } = await useAsyncData("starter-stats", ({ signal }) => {
  return $fetch<StarterStats>("/api/stats", { signal })
})
const stats = reactive<StarterStats>({
  response: "",
  routes: "",
  mode: ""
})
watchEffect(() => {
  if (!data.value) {
    return
  }
  stats.response = data.value.response
  stats.routes = data.value.routes
  stats.mode = data.value.mode
})
const statsError = computed(() => error.value?.message ?? "")
const hasStats = computed(() => Boolean(data.value && !pending.value && !error.value))

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
      <p class="lede">Server-rendered Resux SFCs with resumable client handlers.</p>
      <p class="eyebrow">{{ pluginLabel }}</p>
      <div class="actions">
        <button rx-on:click="increment">Count: {{ count }}</button>
        <ResuxLink to="/about">About this app</ResuxLink>
      </div>
    </section>

    <section class="stats-panel">
      <div rx-if="pending" class="stats-grid">
        <div class="stat skeleton"></div>
        <div class="stat skeleton"></div>
        <div class="stat skeleton"></div>
      </div>
      <div rx-if="error" class="stat error-state">
        <span>Stats unavailable</span>
        <strong>{{ statsError }}</strong>
        <a href="/">Try again</a>
      </div>
      <div rx-if="hasStats" class="stats-grid">
        <article class="stat">
          <span>Response</span>
          <strong>{{ stats.response }}</strong>
        </article>
        <article class="stat">
          <span>Routes</span>
          <strong>{{ stats.routes }}</strong>
        </article>
        <article class="stat">
          <span>Mode</span>
          <strong rx-text="stats.mode">Mode</strong>
        </article>
      </div>
    </section>

    <section class="vue-panel">
      <VueIsland name="CounterIsland" rx-bind:props="{ label: 'Vue island' }" />
    </section>
  </main>
</template>
