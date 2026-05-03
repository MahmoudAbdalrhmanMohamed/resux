export default defineEventHandler((event) => {
  setHeader(event, "x-app", "resux")

  return {
    ok: true,
    framework: "resux",
    mode: "resumable"
  }
})
