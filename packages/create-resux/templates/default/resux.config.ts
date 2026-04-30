export default defineResuxConfig({
  modules: [
    ["resux:seo", {
      title: "%PROJECT_TITLE%",
      description: "A Resux application.",
      themeColor: "#2563eb"
    }],
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
