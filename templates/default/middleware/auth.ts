export default defineResuxRouteMiddleware((to) => {
  if (to.path.startsWith("/admin")) {
    return navigateTo("/");
  }
});
