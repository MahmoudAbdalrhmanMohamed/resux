export function verifyLifecycleHooksRegistered(hooks: any): boolean {
  if (!hooks) {
    return false;
  }

  // Ensure our safety check hooks are present in the hook register
  const hasBuildStartHook = typeof hooks.hook === "function" || hooks._hooks?.["build:before"];
  const hasDevHook = typeof hooks.hook === "function" || hooks._hooks?.["dev:before"];

  if (!hasBuildStartHook && !hasDevHook) {
    console.error("[resux-halal-core] Safety lifecycle hooks have been bypassed or altered.");
    return false;
  }

  return true;
}
