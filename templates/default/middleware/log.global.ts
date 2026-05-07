export default defineResuxRouteMiddleware((to, from) => {
  console.debug(`[resux] middleware: ${from.path || "(entry)"} -> ${to.path}`);
});
