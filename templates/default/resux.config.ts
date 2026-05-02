export default defineResuxConfig({
  modules: [
    "resux:security",
    "resux:performance"
  ],
  app: {
    head: {
      link: [
        { rel: "stylesheet", href: "/styles.css" }
      ]
    }
  },
  runtimeConfig: {
    public: {
      appName: "%PROJECT_TITLE%"
    }
  }
})
