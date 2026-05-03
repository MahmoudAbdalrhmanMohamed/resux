export default defineEventHandler((event) => {
  setHeader(event, "cache-control", "no-store")

  return {
    response: "14 ms",
    routes: "2",
    mode: "Resumable"
  }
})
