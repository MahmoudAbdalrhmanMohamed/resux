<script setup lang="ts">
const count = useState("count", () => 0)
const config = useRuntimeConfig()
const { data, pending } = useAsyncData("starter-stats", async () => {
  await new Promise((resolve) => setTimeout(resolve, 700))
  return {
    response: "14 ms",
    routes: "2",
    mode: "Resumable"
  }
})

useHead({
  title: config.public.appName
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
        <button @click="increment">Count: {{ count.value }}</button>
        <ResuxLink to="/about">About this app</ResuxLink>
      </div>
    </section>

    <section class="stats-panel">
      <div v-if="pending.value" class="stats-grid">
        <div class="stat skeleton"></div>
        <div class="stat skeleton"></div>
        <div class="stat skeleton"></div>
      </div>
      <div v-if="!pending.value" class="stats-grid">
        <article class="stat">
          <span>Response</span>
          <strong>{{ data.value.response }}</strong>
        </article>
        <article class="stat">
          <span>Routes</span>
          <strong>{{ data.value.routes }}</strong>
        </article>
        <article class="stat">
          <span>Mode</span>
          <strong v-text="data.value.mode">Mode</strong>
        </article>
      </div>
    </section>

    <section class="vue-panel">
      <VueIsland name="CounterIsland" :props="{ label: 'Vue island' }" />
    </section>
  </main>
</template>
