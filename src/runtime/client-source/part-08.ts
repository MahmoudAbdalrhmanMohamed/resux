// Client runtime source, part 8 of 9. Concatenated by getClientRuntimeSource() in ../index.ts.
export const clientRuntimePart08 = String.raw`);

function normalizeClientTeleportTarget(value) {
  const candidate = String(value || "#teleports").trim();
  return candidate && candidate.length <= 512 ? candidate : "#teleports";
}

function normalizeClientTeleportPatchTarget(value) {
  return isManagedTeleportElementTarget(value)
    ? value
    : normalizeClientTeleportTarget(value);
}

function isClientTeleportBooleanEnabled(value) {
  return value === "" || Boolean(value);
}

function encodeClientTeleportSourceMetadata(value) {
  return encodeURIComponent(JSON.stringify(value)).replaceAll("-", "%2D");
}

function normalizeClientTransitionName(value) {
  const candidate = String(value || "v").trim();
  return /^[A-Za-z0-9_-]+$/.test(candidate) ? candidate : "v";
}

function normalizeTransitionBoundaryTagName(tag) {
  return String(tag || "").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function normalizeClientTransitionTag(value) {
  const candidate = String(value || "").trim().toLowerCase();
  if (!candidate || !/^[a-z][a-z0-9-]*$/.test(candidate) || unsafeClientTransitionContainerTags.has(candidate)) {
    return "span";
  }
  return candidate;
}

function renderElement(node, scope, locals, styleScopeId, scopeId, moduleId) {
  if (node.tag === "component") {
    const isAttr = node.attrs.find((attr) => attr.name === "is");
    const name = isAttr ? (isAttr.kind === "static" ? isAttr.value : evaluateExpression(isAttr.value, scope, locals)) : "";
    const childModuleId = typeof name === "string" && name ? clientBlockComponentModuleId(name) : "";
    if (!childModuleId) {
      if (isClientDevMode()) console.error("[resux] <component :is> needs the name of a registered component as a string, got: " + String(name));
      return "<!--resux-unknown-component-->";
    }
    return renderClientChildPlaceholder({ ...node, tag: name, attrs: node.attrs.filter((attr) => attr !== isAttr) }, childModuleId, scope, locals, styleScopeId, scopeId, moduleId);
  }
  const normalizedTag = String(node.tag || "").toLowerCase();
  if (normalizedTag === "slot") {
    let slotName = "default";
    const slotProps = {};
    for (const attr of node.attrs) {
      const value = attr.kind === "static" ? attr.value : evaluateExpression(attr.value, scope, locals);
      if (attr.name === "name") {
        if (typeof value === "string" && value) slotName = value;
        continue;
      }
      slotProps[normalizeClientPropName(attr.name)] = value;
    }
    const provider = clientSlotProviders.get(scopeId);
    const provided = provider ? provider(slotName, slotProps) : undefined;
    if (provided !== undefined) return provided;
    return node.children.map((child) => renderNode(child, scope, locals, styleScopeId, scopeId, moduleId)).join("");
  }
  if (normalizedTag === "teleport") {
    const find = (name) => node.attrs.find((attr) => attr.name === name);
    const read = (attr, fallback) => attr
      ? (attr.kind === "static" ? attr.value : evaluateExpression(attr.value, scope, locals))
      : fallback;
    const toAttr = find("to");
    const rawTarget = read(toAttr, "#teleports");
    const disabled = isClientTeleportBooleanEnabled(read(find("disabled"), false));
    const bindings = {};
    for (const attr of node.attrs) {
      if (attr.kind === "dynamic" && attr.bindingId && ["to", "disabled", "defer"].includes(attr.name)) {
        bindings[attr.bindingId] = scopeId + ":" + attr.bindingId;
      }
    }
    const children = node.children
      .map((child) => renderNode(child, scope, locals, styleScopeId, scopeId, moduleId))
      .join("");
    const metadata = encodeClientTeleportSourceMetadata({
      to: isManagedTeleportElementTarget(rawTarget) ? "#teleports" : normalizeClientTeleportTarget(rawTarget),
      toBinding: toAttr?.kind === "dynamic" && toAttr.bindingId ? scopeId + ":" + toAttr.bindingId : "",
      liveTargetToken: createManagedTeleportLiveTargetToken(rawTarget),
      disabled,
      defer: isClientTeleportBooleanEnabled(read(find("defer"), false)),
      bindings,
      html: disabled ? "" : children
    });
    const source = "<!--resux-teleport-source:" + metadata + "-->";
    return source + (disabled ? children : "") + "<!--resux-teleport-end-->";
  }
  const transitionBoundaryTagName = normalizeTransitionBoundaryTagName(node.tag);
  if (transitionBoundaryTagName === "transition" || transitionBoundaryTagName === "transition-group") {
    const group = transitionBoundaryTagName === "transition-group";
    const nameAttr = node.attrs.find((attr) => attr.name === "name");
    const rawName = nameAttr
      ? (nameAttr.kind === "static" ? nameAttr.value : evaluateExpression(nameAttr.value, scope, locals))
      : "v";
    const name = normalizeClientTransitionName(rawName);
    const tagAttr = group ? node.attrs.find((attr) => attr.name === "tag") : null;
    const rawTag = tagAttr
      ? (tagAttr.kind === "static" ? tagAttr.value : evaluateExpression(tagAttr.value, scope, locals))
      : "";
    const tag = group ? normalizeClientTransitionTag(rawTag) : "span";
    const attrs = ['data-rx-transition="' + escapeAttribute(name) + '"'];
    if (group) attrs.push('data-rx-transition-group="true"');
    if (nameAttr && nameAttr.kind === "dynamic" && nameAttr.bindingId) {
      attrs.push('data-rx-attr-' + nameAttr.bindingId + '="' + scopeId + ':' + nameAttr.bindingId + '"');
    }

    const blockChild = node.children.length === 1 && node.children[0]?.type === "element"
      && (node.children[0].for || node.children[0].if)
      ? node.children[0]
      : null;
    let children = node.children
      .map((child) => renderNode(child, scope, locals, styleScopeId, scopeId, moduleId))
      .join("");
    if (blockChild) {
      const blockId = blockChild.for?.blockId || blockChild.if?.blockId;
      if (blockId) {
        attrs.push('data-rx-block="' + scopeId + ':' + blockId + '"');
        children = children.replace(/^<span[^>]*>|<\/span>$/g, "");
      }
    }
    if (tag === "span") attrs.push('style="display: contents;"');
    return "<" + tag + " " + attrs.join(" ") + ">" + children + "</" + tag + ">";
  }
  if (node.tag === "ResuxImg") {
    return renderClientResuxImg(node, scope, locals, styleScopeId, scopeId);
  }
  if (node.tag === "ResuxPicture") {
    return renderClientResuxPicture(node, scope, locals, styleScopeId, scopeId);
  }
  if (node.tag === "ResuxVideo") {
    return renderClientResuxVideo(node, scope, locals, styleScopeId, scopeId);
  }
  if (node.tag === "ClientEnhance" || node.tag === "ResuxClientEnhance") {
    return renderClientResuxClientEnhance(node, scope, locals, styleScopeId);
  }
  if (/^[A-Z]/.test(node.tag)) {
    const childModuleId = clientBlockComponentModuleId(node.tag);
    if (childModuleId) {
      return renderClientChildPlaceholder(node, childModuleId, scope, locals, styleScopeId, scopeId, moduleId);
    }
  }
  const tag = nativeElementTag(node);
  const attrs = [];
  let resolvedRef;
  for (const attr of node.attrs) {
    const attrName = nativeAttributeName(node, attr.name);
    if (attr.kind === "static") {
      attrs.push(attrName + '="' + escapeAttribute(attr.value) + '"');
    } else {
      const value = evaluateExpression(attr.value, scope, locals);
      if (attr.bindingId) {
        attrs.push('data-rx-attr-' + attr.bindingId + '="' + scopeId + ':' + attr.bindingId + '"');
      }
      if (attrName === "ref" && typeof value === "string" && value.trim()) {
        resolvedRef = value.trim();
      }
      const isViewTransitionAttr = attrName === "data-view-transition" || attrName === "view-transition";
      if (value !== null && value !== undefined && (value !== false || isViewTransitionAttr)) {
        attrs.push(attrName + '="' + escapeAttribute(stringifyAttributeValue(attrName, value)) + '"');
      }
    }
  }
  const effectiveRef = resolvedRef || node.ref;
  if (effectiveRef) {
    attrs.push('data-rx-ref="' + escapeAttribute(scopeId + ':' + effectiveRef) + '"');
  }
  for (const event of node.events) {
    attrs.push('data-rx-on-' + event.name + '="' + scopeId + ':' + moduleId + ':' + event.handler + '"');
    if (event.locals && event.locals.length) {
      const eventLocals = {};
      for (const name of event.locals) {
        if (!Object.prototype.hasOwnProperty.call(locals, name)) continue;
        if (locals[name] !== undefined) assertJsonSerializableInDev(locals[name], 'event local "' + name + '"');
        eventLocals[name] = locals[name];
      }
      attrs.push('data-rx-locals-' + event.name + '=\"' + escapeAttribute(JSON.stringify(eventLocals)) + '\"');
    }
    if (event.modifiers && event.modifiers.length) {
      attrs.push('data-rx-mod-' + event.name + '="' + escapeAttribute(event.modifiers.join(",")) + '"');
    }
  }
  if (node.html) {
    attrs.push('data-rx-html-' + node.html.bindingId + '="' + scopeId + ':' + node.html.bindingId + '"');
  }
  if (styleScopeId) {
    attrs.push(styleScopeId + '=""');
  }
  const attrText = attrs.length ? " " + attrs.join(" ") : "";
  const children = node.html
    ? sanitizeHtml(evaluateExpression(node.html.expression, scope, locals))
    : node.children.map((child) => renderNode(child, scope, locals, styleScopeId, scopeId, moduleId)).join("");
  return "<" + tag + attrText + ">" + children + "</" + tag + ">";
}

const clientImageReservedProps = new Set([
  "src",
  "alt",
  "provider",
  "cache",
  "modifiers",
  "quality",
  "fit",
  "format",
  "formats",
  "width",
  "height",
  "widths",
  "sizes",
  "densities",
  "priority",
  "preload",
  "lazy",
  "loading",
  "decoding",
  "fetchpriority",
  "fetchPriority",
  "placeholder",
  "placeholderClass",
  "placeholderStyle",
  "fallback",
  "fallbackSrc",
  "sources",
  "rootMargin",
  "threshold"
]);
const RESUX_CLIENT_RESPONSIVE_VIEWPORT_WIDTHS = [320, 640, 768, 1024, 1280, 1536, 1920, 2560];

function readClientRuntimeVideoConfig() {
  try {
    const runtimeConfig = useRuntimeConfig();
    const publicConfig = runtimeConfig && runtimeConfig.public && typeof runtimeConfig.public === "object"
      ? runtimeConfig.public
      : {};
    const candidate = publicConfig.video || publicConfig.resuxVideo;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return {};
    }
    return candidate;
  } catch {
    return {};
  }
}

function resolveClientVideoControlsMode(value, fallback = "custom") {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "custom" || normalized === "native" || normalized === "none") {
    return normalized;
  }
  return fallback;
}

function resolveClientVideoLoadMode(value, fallback = "lazy") {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "lazy" || normalized === "eager") {
    return normalized;
  }
  return fallback;
}

function resolveClientVideoTheme(value, fallback = "dark") {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "dark" || normalized === "light" || normalized === "auto") {
    return normalized;
  }
  return fallback;
}

function resolveClientVideoThemeDefaults(theme) {
  if (theme === "light") {
    return {
      controlsColor: "#0f172a",
      controlsBackground: "rgba(248, 250, 252, 0.84)"
    };
  }
  if (theme === "auto") {
    return {
      controlsColor: "var(--resux-video-theme-fg, #e2e8f0)",
      controlsBackground: "var(--resux-video-theme-bg, rgba(2, 6, 23, 0.74))"
    };
  }
  return {
    controlsColor: "#e2e8f0",
    controlsBackground: "rgba(2, 6, 23, 0.74)"
  };
}

function resolveClientVideoSkipSeconds(value, fallback) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim().length > 0
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(120, Math.max(0.25, Math.round(parsed * 100) / 100));
}

function formatClientVideoSkipDuration(seconds) {
  const normalized = resolveClientVideoSkipSeconds(seconds, 10);
  return Number.isInteger(normalized) ? String(Math.trunc(normalized)) + "s" : String(normalized) + "s";
}

function normalizeClientEnhanceTag(value) {
  const candidate = String(value || "section").trim().toLowerCase();
  if (!candidate || !/^[a-z][a-z0-9-]*$/.test(candidate) || unsafeClientTransitionContainerTags.has(candidate)) {
    return "section";
  }
  return candidate;
}

function renderClientResuxClientEnhance(node, scope, locals, styleScopeId) {
  const props = {};
  for (const attr of node.attrs) {
    const normalizedName = attr.name.replace(/-([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
    props[normalizedName] = attr.kind === "static"
      ? attr.value
      : evaluateExpression(attr.value, scope, locals);
  }
  const name = String(props.name || "").trim();
  if (!name) {
    throw new Error("<ClientEnhance> requires a non-empty name property.");
  }
  const trigger = String(props.trigger || "visible").trim();
  const mode = String(props.mode || "progressive").trim();
  const options = props.options;
  
  if (options !== undefined && options !== null) {
    try {
      assertEnhancementOptionsSerializable(options, "$", new WeakSet());
    } catch (error) {
      throw new Error(
        "[resux] <ClientEnhance name=\"" + name + "\"> received non-serializable options. " + getEnhancementErrorMessage(error)
      );
    }
  }
  
  const serializedOptions = (options !== undefined && options !== null) ? JSON.stringify(options) : undefined;
  const reserveHeight = String(props.reserveHeight || "").trim();
  const reserveWidth = String(props.reserveWidth || "").trim();
  const aspectRatio = String(props.aspectRatio || "").trim();
  const noCls = props.noCls === true || props.noCls === "true" || props.noCls === "";
  const demo = String(props.demo || name).trim();
  const tag = normalizeClientEnhanceTag(props.as);

  const styles = [];
  if (reserveHeight) styles.push("min-height: " + reserveHeight + ";");
  if (reserveWidth) styles.push("min-width: " + reserveWidth + ";");
  if (aspectRatio) styles.push("aspect-ratio: " + aspectRatio + ";");
  const styleAttr = styles.length ? " style=\"" + escapeAttribute(styles.join(" ")) + "\"" : "";

  const attrs = [
    "data-resux-enhancement=\"" + escapeAttribute(name) + "\"",
    "data-resux-trigger=\"" + escapeAttribute(trigger) + "\"",
    "use-client-enhancement=\"" + escapeAttribute(name) + "\"",
    "data-trigger=\"" + escapeAttribute(trigger) + "\"",
    "data-resux-mode=\"" + escapeAttribute(mode) + "\"",
    serializedOptions ? "data-resux-options=\"" + escapeAttribute(serializedOptions) + "\"" : "",
    noCls ? "data-resux-no-cls=\"true\"" : "",
    "data-rx-package-demo=\"" + escapeAttribute(demo) + "\"",
    "data-resux-demo=\"" + escapeAttribute(demo) + "\"",
    "data-resux-enhancement-status=\"idle\"",
  ].filter(Boolean);

  if (styleScopeId) {
    attrs.push(styleScopeId + "=\"\"");
  }

  const specialProps = new Set([
    "name", "trigger", "mode", "options", "reserveHeight", "reserveWidth", "aspectRatio", "noCls", "demo", "as"
  ]);
  for (const [propKey, propVal] of Object.entries(props)) {
    if (specialProps.has(propKey)) continue;
    const attrName = propKey.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    if (propVal !== undefined && propVal !== null && propVal !== false) {
      if (propVal === true) {
        attrs.push(attrName);
      } else {
        attrs.push(attrName + "=\"" + escapeAttribute(String(propVal)) + "\"");
      }
    }
  }

  const children = node.children.map(child => renderNode(child, scope, locals, styleScopeId)).join("");
  return "<" + tag + " " + attrs.join(" ") + styleAttr + ">" + children + "</" + tag + ">";
}

function appendClientDeferredVideoPoster(attrs, placeholderSrc, poster, deferLazy, deferUntilPageReady) {
  if (!deferLazy) return;
  let deferredPoster = placeholderSrc;
  if (!deferredPoster && deferUntilPageReady) {
    deferredPoster = poster;
  }
  if (deferredPoster) {
    attrs.push('poster="' + escapeAttribute(deferredPoster) + '"');
  }
}

function renderClientResuxVideo(node, scope, locals, styleScopeId, scopeId) {
  const props = {};
  for (const attr of node.attrs) {
    const normalizedName = attr.name.replace(/-([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
    props[normalizedName] = attr.kind === "static"
      ? attr.value
      : evaluateExpression(attr.value, scope, locals);
  }
  const hero = readClientBooleanProp(props.hero, false);
  const priority = readClientBooleanProp(props.priority, hero);
  const deferUntilPageReady = readClientBooleanProp(props.deferUntilPageReady, false);
  const revealOnPageReady = readClientBooleanProp(props.revealOnPageReady, priority || hero || deferUntilPageReady);
  const chunkLoading = readClientBooleanProp(props.chunkLoading, false) || readClientBooleanProp(props.chunked, false);
  const fetchPriority = readClientStringProp(props.fetchpriority || props.fetchPriority) || ((priority || hero) ? "high" : "");
  const explicitLoading = readClientStringProp(props.loading);
  const explicitLazy = props.lazy === undefined
    ? undefined
    : readClientBooleanProp(props.lazy, true);
  const lazy = explicitLazy ?? (explicitLoading ? explicitLoading === "lazy" : false);
  const deferLazy = explicitLoading === "lazy" || explicitLazy === true || lazy || deferUntilPageReady;
  const src = readClientStringProp(props.src);
  const poster = readClientStringProp(props.poster);
  const fallbackPoster = readClientStringProp(props.fallbackPoster);
  const width = readClientNumberProp(props.width);
  const height = readClientNumberProp(props.height);
  const placeholderSrc = resolveClientPlaceholderSource(props.placeholder);
  const preload = readClientStringProp(props.preload)
    || ((chunkLoading || deferUntilPageReady) ? "metadata" : ((priority || hero) ? "auto" : "metadata"));
  const ariaLabel = readClientStringProp(props.ariaLabel || props["aria-label"]);
  const rootMargin = readClientStringProp(props.rootMargin) || "320px 0px";
  const thresholdRaw = Number(props.threshold);
  const threshold = Number.isFinite(thresholdRaw)
    ? Math.min(1, Math.max(0, thresholdRaw))
    : 0;
  const forceAutoplay = readClientBooleanProp(props.forceAutoplay, false);
  const autoplay = readClientBooleanProp(props.autoplay, false);
  const runtimeVideoConfig = readClientRuntimeVideoConfig();
  const controlsRequested = readClientBooleanProp(
    props.controls,
    typeof runtimeVideoConfig.controls === "boolean" ? runtimeVideoConfig.controls : true,
  );
  const configuredControlsMode = resolveClientVideoControlsMode(runtimeVideoConfig.controlsMode, "custom");
  const controlsModeProp = readClientStringProp(props.controlsMode);
  let controlsMode = resolveClientVideoControlsMode(controlsModeProp, configuredControlsMode);
  const explicitNativeControls = props.nativeControls === undefined
    ? undefined
    : readClientBooleanProp(props.nativeControls, true);
  const explicitCustomControls = props.customControls === undefined
    ? undefined
    : readClientBooleanProp(props.customControls, false);
  if (explicitNativeControls === true) {
    controlsMode = "native";
  } else if (explicitCustomControls === true) {
    controlsMode = "custom";
  } else if (!controlsRequested) {
    controlsMode = "none";
  }
  const nativeControls = controlsRequested && controlsMode === "native";
  const customControls = controlsRequested && controlsMode === "custom";
  const controlsLoad = resolveClientVideoLoadMode(
    readClientStringProp(props.controlsLoad),
    resolveClientVideoLoadMode(runtimeVideoConfig.controlsLoad, "lazy"),
  );
  const iconsLoad = resolveClientVideoLoadMode(
    readClientStringProp(props.iconsLoad),
    resolveClientVideoLoadMode(runtimeVideoConfig.iconsLoad, "lazy"),
  );
  const showSpeed = readClientBooleanProp(
    props.showSpeed,
    typeof runtimeVideoConfig.showSpeed === "boolean" ? runtimeVideoConfig.showSpeed : true,
  );
  const speedControl = controlsRequested && (
    props.speedControl === undefined
      ? showSpeed
      : readClientBooleanProp(props.speedControl, showSpeed)
  );
  const speeds = resolveClientVideoPlaybackSpeeds(props.speeds);
  const defaultSpeed = resolveClientVideoDefaultSpeed(props.defaultSpeed, speeds);
  const showSpeedIcon = readClientBooleanProp(props.showSpeedIcon, true);
  const speedLabel = readClientStringProp(props.speedLabel) || "Speed";
  const showQuality = readClientBooleanProp(
    props.showQuality,
    typeof runtimeVideoConfig.showQuality === "boolean" ? runtimeVideoConfig.showQuality : true,
  );
  const qualityControl = controlsRequested && (
    props.qualityControl === undefined
      ? showQuality
      : readClientBooleanProp(props.qualityControl, showQuality)
  );
  const showQualityIcon = readClientBooleanProp(props.showQualityIcon, true);
  const qualityLabel = readClientStringProp(props.qualityLabel) || "Quality";
  const showFullscreen = readClientBooleanProp(
    props.showFullscreen,
    typeof runtimeVideoConfig.showFullscreen === "boolean" ? runtimeVideoConfig.showFullscreen : true,
  );
  const showVolume = readClientBooleanProp(
    props.showVolume,
    typeof runtimeVideoConfig.showVolume === "boolean" ? runtimeVideoConfig.showVolume : true,
  );
  const showProgress = readClientBooleanProp(
    props.showProgress,
    typeof runtimeVideoConfig.showProgress === "boolean" ? runtimeVideoConfig.showProgress : true,
  );
  const showTime = readClientBooleanProp(
    props.showTime,
    typeof runtimeVideoConfig.showTime === "boolean" ? runtimeVideoConfig.showTime : true,
  );
  const sideClickSkip = readClientBooleanProp(
    props.sideClickSkip,
    typeof runtimeVideoConfig.sideClickSkip === "boolean" ? runtimeVideoConfig.sideClickSkip : true,
  );
  const skipControls = props.skipControls === undefined
    ? sideClickSkip
    : readClientBooleanProp(props.skipControls, sideClickSkip);
  const clickToPlay = readClientBooleanProp(
    props.clickToPlay,
    typeof runtimeVideoConfig.clickToPlay === "boolean" ? runtimeVideoConfig.clickToPlay : true,
  );
  const doubleClickFullscreen = readClientBooleanProp(
    props.doubleClickFullscreen,
    typeof runtimeVideoConfig.doubleClickFullscreen === "boolean" ? runtimeVideoConfig.doubleClickFullscreen : true,
  );
  const configuredSkipSeconds = typeof runtimeVideoConfig.skipSeconds === "number"
    ? runtimeVideoConfig.skipSeconds
    : 10;
  const skipSeconds = resolveClientVideoSkipSeconds(props.skipSeconds, configuredSkipSeconds);
  const skipBackwardSeconds = resolveClientVideoSkipSeconds(props.skipBackwardSeconds, skipSeconds);
  const skipForwardSeconds = resolveClientVideoSkipSeconds(props.skipForwardSeconds, skipSeconds);
  const showSkipOverlay = readClientBooleanProp(props.showSkipOverlay, true);
  const sideSkipEnabled = (skipControls || sideClickSkip) && showSkipOverlay;
  const interactionZonesEnabled = clickToPlay || doubleClickFullscreen || sideSkipEnabled;
  const skipLabel = readClientStringProp(props.skipLabel) || "Skip";
  const disableSkipOnControls = readClientBooleanProp(props.disableSkipOnControls, true);
  const theme = resolveClientVideoTheme(
    readClientStringProp(props.theme),
    resolveClientVideoTheme(runtimeVideoConfig.theme, "dark"),
  );
  const themeDefaults = resolveClientVideoThemeDefaults(theme);
  const controlsColor = readClientStringProp(props.controlsColor)
    || readClientStringProp(runtimeVideoConfig.controlsColor)
    || themeDefaults.controlsColor;
  const controlsBackground = readClientStringProp(props.controlsBackground)
    || readClientStringProp(runtimeVideoConfig.controlsBackground)
    || themeDefaults.controlsBackground;
  const controlsAccent = readClientStringProp(props.accentColor || props.controlsAccent)
    || readClientStringProp(runtimeVideoConfig.accentColor)
    || "#38bdf8";
  const controlsClass = readClientStringProp(props.controlsClass);
  const controlsStyle = readClientStringProp(props.controlsStyle);
  const rounded = props.rounded === undefined
    ? true
    : readClientBooleanProp(props.rounded, true);
  const shadow = props.shadow === undefined
    ? true
    : readClientBooleanProp(props.shadow, true);
  const iconPlay = readClientStringProp(props.controlsIconPlay || props.iconPlay) || "\u25b6";
  const iconPause = readClientStringProp(props.controlsIconPause || props.iconPause) || "\u275a\u275a";
  const iconMute = readClientStringProp(props.controlsIconMute || props.iconMute) || "\ud83d\udd07";
  const iconUnmute = readClientStringProp(props.controlsIconUnmute || props.iconUnmute) || "\ud83d\udd0a";
  const iconFullscreen = readClientStringProp(props.controlsIconFullscreen || props.iconFullscreen) || "\u26f6";
  const iconExitFullscreen = readClientStringProp(props.controlsIconExitFullscreen || props.iconExitFullscreen) || "\ud83d\uddd7";
  const iconPlayFallback = readClientStringProp(props.iconPlayFallback) || "Play";
  const iconPauseFallback = readClientStringProp(props.iconPauseFallback) || "Pause";
  const iconMuteFallback = readClientStringProp(props.iconMuteFallback) || "Mute";
  const iconUnmuteFallback = readClientStringProp(props.iconUnmuteFallback) || "Sound";
  const iconFullscreenFallback = readClientStringProp(props.iconFullscreenFallback) || "Full";
  const iconExitFullscreenFallback = readClientStringProp(props.iconExitFullscreenFallback) || "Exit";
  const resolvedSources = resolveClientVideoSources(props.sources);
  const resolvedQualities = resolveClientVideoQualityOptions(props.qualities, resolvedSources, src);
  const defaultQuality = resolveClientVideoDefaultQuality(props.defaultQuality, resolvedQualities);
  const qualityControlEnabled = qualityControl && resolvedQualities.length > 1;
  const activeQuality = qualityControlEnabled
    ? resolvedQualities.find((entry) => entry.id === defaultQuality) || resolvedQualities[0]
    : undefined;
  const activeSources = (activeQuality && Array.isArray(activeQuality.sources) && activeQuality.sources.length)
    ? activeQuality.sources
    : resolvedSources;
  const activePrimarySrc = (activeSources[0] && activeSources[0].src) || src;
  const hasSourceChildren = activeSources.length > 0;
  const styleParts = [];
  if (typeof props.style === "string" && props.style.trim()) {
    styleParts.push(props.style.trim().replace(/;+\s*$/, ""));
  }
  if (props.aspectRatio !== undefined && props.aspectRatio !== null && props.aspectRatio !== false) {
    const aspectValue = String(props.aspectRatio).trim();
    if (aspectValue) {
      styleParts.push("aspect-ratio: " + aspectValue);
    }
  } else {
    const ratioStyle = resolveClientAspectRatioStyle(width, height, props.style);
    if (ratioStyle) {
      styleParts.push(ratioStyle);
    }
  }
  styleParts.push("display: block");
  styleParts.push("width: 100%");
  styleParts.push("max-width: 100%");
  if (!styleParts.some((entry) => /(^|;)\s*height\s*:/.test(entry))) {
    styleParts.push("height: auto");
  }
  const attrs = [];
  for (const [name, rawValue] of Object.entries(props)) {
    if (rawValue === undefined || rawValue === null || rawValue === false) {
      continue;
    }
    if (
      name === "aspectRatio"
      || name === "style"
      || name === "lazy"
      || name === "loading"
      || name === "placeholder"
      || name === "fallbackPoster"
      || name === "rootMargin"
      || name === "threshold"
      || name === "sources"
      || name === "format"
      || name === "formats"
      || name === "quality"
      || name === "forceAutoplay"
      || name === "ariaLabel"
      || name === "autoplay"
      || name === "src"
      || name === "poster"
      || name === "preload"
      || name === "fallbackText"
      || name === "controls"
      || name === "controlsMode"
      || name === "controlsLoad"
      || name === "iconsLoad"
      || name === "nativeControls"
      || name === "customControls"
      || name === "theme"
      || name === "accentColor"
      || name === "controlsColor"
      || name === "controlsBackground"
      || name === "controlsAccent"
      || name === "controlsClass"
      || name === "controlsStyle"
      || name === "rounded"
      || name === "shadow"
      || name === "controlsIconPlay"
      || name === "controlsIconPause"
      || name === "controlsIconMute"
      || name === "controlsIconUnmute"
      || name === "controlsIconFullscreen"
      || name === "controlsIconExitFullscreen"
      || name === "iconPlay"
      || name === "iconPause"
      || name === "iconMute"
      || name === "iconUnmute"
      || name === "iconFullscreen"
      || name === "iconExitFullscreen"
      || name === "iconPlayFallback"
      || name === "iconPauseFallback"
      || name === "iconMuteFallback"
      || name === "iconUnmuteFallback"
      || name === "iconFullscreenFallback"
      || name === "iconExitFullscreenFallback"
      || name === "speedControl"
      || name === "showSpeed"
      || name === "speeds"
      || name === "defaultSpeed"
      || name === "showSpeedIcon"
      || name === "speedLabel"
      || name === "qualityControl"
      || name === "showQuality"
      || name === "qualities"
      || name === "defaultQuality"
      || name === "showQualityIcon"
      || name === "qualityLabel"
      || name === "showFullscreen"
      || name === "showVolume"
      || name === "showProgress"
      || name === "showTime"
      || name === "skipControls"
      || name === "skipSeconds"
      || name === "skipBackwardSeconds"
      || name === "skipForwardSeconds"
      || name === "showSkipOverlay"
      || name === "skipLabel"
      || name === "disableSkipOnControls"
      || name === "sideClickSkip"
      || name === "clickToPlay"
      || name === "doubleClickFullscreen"
      || name === "hero"
      || name === "priority"
      || name === "preloadLink"
      || name === "chunkLoading"
      || name === "chunked"
      || name === "deferUntilPageReady"
      || name === "revealOnPageReady"
      || name === "fetchpriority"
      || name === "fetchPriority"
    ) {
      continue;
    }
    const attrName = name === "className"
      ? "class"
      : name === "playsInline"
        ? "playsinline"
        : name === "crossOrigin"
          ? "crossorigin"
          : name === "referrerPolicy"
            ? "referrerpolicy"
            : name;
    attrs.push(attrName + '="' + escapeAttribute(stringifyAttributeValue(attrName, rawValue)) + '"');
  }
  if (!hasSourceChildren && !deferLazy && activePrimarySrc) {
    attrs.push('src="' + escapeAttribute(activePrimarySrc) + '"');
  }
  attrs.push('data-resux-media="video"');
  attrs.push('data-resux-video="' + (deferLazy ? "idle" : "loading") + '"');
  if (!deferLazy) {
    attrs.push('data-resux-loading="true"');
    attrs.push('data-resux-video-loading="true"');
  }
  if (fetchPriority) {
    attrs.push('fetchpriority="' + escapeAttribute(fetchPriority) + '"');
  }
  if (hero || priority) {
    attrs.push('data-rx-video-hero="true"');
  }
  if (chunkLoading) {
    attrs.push('data-rx-video-chunked="true"');
  }
  if (deferLazy && activePrimarySrc) {
    attrs.push('data-rx-lazy-src="' + escapeAttribute(activePrimarySrc) + '"');
    attrs.push('data-src="' + escapeAttribute(activePrimarySrc) + '"');
  }
  if (deferLazy) {
    attrs.push('data-rx-lazy-video="true"');
    attrs.push('data-resux-lazy="true"');
    attrs.push('data-rx-lazy-root-margin="' + escapeAttribute(rootMargin) + '"');
    attrs.push('data-rx-lazy-threshold="' + escapeAttribute(String(threshold)) + '"');
    attrs.push('data-rx-lazy-preload="' + escapeAttribute(preload) + '"');
    if (deferUntilPageReady) {
      attrs.push('data-rx-video-defer-ready="true"');
      if (revealOnPageReady) {
        attrs.push('data-rx-video-ready-reveal="true"');
      }
    }
    attrs.push('preload="none"');
  } else if (preload) {
    attrs.push('preload="' + escapeAttribute(preload) + '"');
  }
  if (poster) {
    attrs.push('data-rx-poster="' + escapeAttribute(poster) + '"');
  }
  if (fallbackPoster) {
    attrs.push('data-rx-fallback-poster="' + escapeAttribute(fallbackPoster) + '"');
  }
  if (placeholderSrc) {
    attrs.push('data-rx-placeholder-src="' + escapeAttribute(placeholderSrc) + '"');
    attrs.push('data-placeholder="' + escapeAttribute(placeholderSrc) + '"');
    attrs.push('data-rx-placeholder-active="true"');
    attrs.push('data-resux-placeholder-active="true"');
  }
  appendClientDeferredVideoPoster(attrs, placeholderSrc, poster, deferLazy, deferUntilPageReady);
  const initialPoster = deferLazy
    ? undefined
    : (placeholderSrc || poster);
  if (initialPoster) {
    attrs.push('poster="' + escapeAttribute(initialPoster) + '"');
  }
  if (autoplay) {
    attrs.push('autoplay="autoplay"');
    attrs.push('data-rx-autoplay-requested="true"');
    if (!forceAutoplay) {
      attrs.push('data-rx-respect-reduced-motion="true"');
    } else {
      attrs.push('data-rx-force-autoplay="true"');
    }
  }
  if (controlsRequested && nativeControls) {
    attrs.push('controls="controls"');
  }
  if (customControls) {
    attrs.push('data-rx-custom-controls="true"');
  }
  attrs.push('data-rx-video-default-speed="' + escapeAttribute(String(defaultSpeed)) + '"');
  if (ariaLabel) {
    attrs.push('aria-label="' + escapeAttribute(ariaLabel) + '"');
  }
  if (styleParts.length > 0) {
    attrs.push('style="' + escapeAttribute(styleParts.join("; ")) + '"');
  }
  const clientVideoRef = readClientStringProp(props.ref) || node.ref;
  if (clientVideoRef && scopeId) {
    attrs.push('data-rx-ref="' + escapeAttribute(scopeId + ':' + clientVideoRef) + '"');
  }
  if (styleScopeId) {
    attrs.push(styleScopeId + '=""');
  }
  const attrText = attrs.length ? " " + attrs.join(" ") : "";
  const sourceTags = hasSourceChildren
    ? activeSources
      .map((source) => {
        const sourceAttrs = deferLazy
          ? ['data-rx-lazy-src="' + escapeAttribute(source.src) + '"', 'data-src="' + escapeAttribute(source.src) + '"']
          : ['src="' + escapeAttribute(source.src) + '"'];
        if (source.type) {
          sourceAttrs.push('type="' + escapeAttribute(source.type) + '"');
        }
        return "<source " + sourceAttrs.join(" ") + ">";
      })
      .join("")
    : "";
  const children = node.children.map((child) => renderNode(child, scope, locals, styleScopeId)).join("");
  const fallbackText = escapeHtml(readClientStringProp(props.fallbackText) || "Your browser does not support the video tag.");
  const videoMarkup = "<video" + attrText + ">" + sourceTags + children + fallbackText + "</video>";
  const renderShell = customControls
    || speedControl
    || qualityControlEnabled
    || interactionZonesEnabled;
  if (!renderShell) {
    return videoMarkup;
  }
  const controlsInset = controlsRequested ? "4.25rem" : "0px";
  const shellClass = mergeClientClassNames(
    "rx-video-shell resux-video",
    "resux-video--theme-" + theme,
    rounded ? "resux-video--rounded" : "",
    shadow ? "resux-video--shadow" : "",
    controlsClass
  );
  const shellStyle = mergeClientInlineStyles(
    "position: relative",
    "display: block",
    "isolation: isolate",
    "--rx-video-controls-hit-area: " + controlsInset,
    "--resux-video-accent: " + controlsAccent,
    "--resux-video-controls-color: " + controlsColor,
    "--resux-video-controls-bg: " + controlsBackground,
    "--resux-video-radius: " + (rounded ? "0.9rem" : "0px"),
    "--rx-video-controls-fg: " + controlsColor,
    "--rx-video-controls-bg: " + controlsBackground,
    "--rx-video-controls-accent: " + controlsAccent,
    controlsStyle
  );
  const controlsActivated = controlsLoad === "eager";
  const iconsReady = iconsLoad === "eager";
  const controlsReady = controlsActivated && !deferLazy;
  const shellAttrs = [
    'data-rx-video-shell="true"',
    'data-rx-video-controls-ready="' + (controlsReady ? "true" : "false") + '"',
    'data-resux-video-controls-ready="' + (controlsReady ? "true" : "false") + '"',
    'data-rx-video-controls-load="' + controlsLoad + '"',
    'data-rx-video-controls-activated="' + (controlsActivated ? "true" : "false") + '"',
    'data-rx-video-icons-load="' + iconsLoad + '"',
    'data-rx-video-icons-ready="' + (iconsReady ? "true" : "false") + '"',
    'data-rx-video-theme="' + theme + '"',
    'data-rx-video-state="' + (deferLazy ? "idle" : "loading") + '"',
    'data-resux-video="' + (deferLazy ? "idle" : "loading") + '"',
    'data-rx-video-icon-play="' + escapeAttribute(iconPlay) + '"',
    'data-rx-video-icon-pause="' + escapeAttribute(iconPause) + '"',
    'data-rx-video-icon-mute="' + escapeAttribute(iconMute) + '"',
    'data-rx-video-icon-unmute="' + escapeAttribute(iconUnmute) + '"',
    'data-rx-video-icon-fullscreen="' + escapeAttribute(iconFullscreen) + '"',
    'data-rx-video-icon-exit-fullscreen="' + escapeAttribute(iconExitFullscreen) + '"',
    'data-rx-video-icon-play-fallback="' + escapeAttribute(iconPlayFallback) + '"',
    'data-rx-video-icon-pause-fallback="' + escapeAttribute(iconPauseFallback) + '"',
    'data-rx-video-icon-mute-fallback="' + escapeAttribute(iconMuteFallback) + '"',
    'data-rx-video-icon-unmute-fallback="' + escapeAttribute(iconUnmuteFallback) + '"',
    'data-rx-video-icon-fullscreen-fallback="' + escapeAttribute(iconFullscreenFallback) + '"',
    'data-rx-video-icon-exit-fullscreen-fallback="' + escapeAttribute(iconExitFullscreenFallback) + '"',
    'data-rx-video-speed-control="' + (speedControl ? "true" : "false") + '"',
    'data-rx-video-speeds="' + escapeAttribute(serializeClientVideoPlaybackSpeeds(speeds)) + '"',
    'data-rx-video-default-speed="' + escapeAttribute(String(defaultSpeed)) + '"',
    'data-rx-video-show-speed-icon="' + (showSpeedIcon ? "true" : "false") + '"',
    'data-rx-video-speed-label="' + escapeAttribute(speedLabel) + '"',
    'data-rx-video-quality-control="' + (qualityControlEnabled ? "true" : "false") + '"',
    'data-rx-video-qualities="' + escapeAttribute(serializeClientVideoQualityOptions(resolvedQualities)) + '"',
    'data-rx-video-default-quality="' + escapeAttribute(defaultQuality || "") + '"',
    'data-rx-video-show-quality-icon="' + (showQualityIcon ? "true" : "false") + '"',
    'data-rx-video-quality-label="' + escapeAttribute(qualityLabel) + '"',
    'data-rx-video-custom-controls="' + (customControls ? "true" : "false") + '"',
    'data-rx-video-native-controls="' + (nativeControls ? "true" : "false") + '"',
    'data-rx-video-show-fullscreen="' + (showFullscreen ? "true" : "false") + '"',
    'data-rx-video-show-volume="' + (showVolume ? "true" : "false") + '"',
    'data-rx-video-show-progress="' + (showProgress ? "true" : "false") + '"',
    'data-rx-video-show-time="' + (showTime ? "true" : "false") + '"',
    'data-rx-video-skip-controls="' + (sideSkipEnabled ? "true" : "false") + '"',
    'data-rx-video-skip-backward="' + escapeAttribute(String(skipBackwardSeconds)) + '"',
    'data-rx-video-skip-forward="' + escapeAttribute(String(skipForwardSeconds)) + '"',
    'data-rx-video-skip-label="' + escapeAttribute(skipLabel) + '"',
    'data-rx-video-show-skip-overlay="' + (sideSkipEnabled ? "true" : "false") + '"',
    'data-rx-video-disable-skip-on-controls="' + (disableSkipOnControls ? "true" : "false") + '"',
    'data-rx-video-side-click-skip="' + (sideSkipEnabled ? "true" : "false") + '"',
    'data-rx-video-click-to-play="' + (clickToPlay ? "true" : "false") + '"',
    'data-rx-video-double-click-fullscreen="' + (doubleClickFullscreen ? "true" : "false") + '"',
    'data-rx-video-has-interaction-zones="' + (interactionZonesEnabled ? "true" : "false") + '"'
  ];
  if (shellClass) {
    shellAttrs.push('class="' + escapeAttribute(shellClass) + '"');
  }
  if (shellStyle) {
    shellAttrs.push('style="' + escapeAttribute(shellStyle) + '"');
  }
  if (styleScopeId) {
    shellAttrs.push(styleScopeId + '=""');
  }
  const speedButtonLabel = formatClientVideoPlaybackRateLabel(defaultSpeed);
  const speedButtonText = ((showSpeedIcon && iconsLoad === "eager") ? ">> " : "") + speedButtonLabel;
  const skipBackwardLabel = skipLabel + " backward " + formatClientVideoSkipDuration(skipBackwardSeconds);
  const skipForwardLabel = skipLabel + " forward " + formatClientVideoSkipDuration(skipForwardSeconds);
  const qualityOptionsMarkup = qualityControlEnabled
    ? resolvedQualities
      .map((entry) => {
        const selected = entry.id === defaultQuality ? " selected" : "";
        return '<option value="' + escapeAttribute(entry.id) + '"' + selected + '>' + escapeHtml(entry.label) + '</option>';
      })
      .join("")
    : "";
  const qualityControlMarkup = qualityControlEnabled
    ? '<label class="rx-video-quality-wrap resux-video__control" data-rx-video-quality-wrap data-resux-video-control="true">'
      + '<span class="rx-video-quality-prefix" aria-hidden="true">' + escapeHtml(showQualityIcon ? "HD" : qualityLabel) + '</span>'
      + '<select class="rx-video-quality-select resux-video__quality-select" data-rx-video-quality data-resux-video-control="true" aria-label="' + escapeAttribute(qualityLabel) + '">' + qualityOptionsMarkup + '</select>'
      + '</label>'
    : "";
  const speedControlsMarkup = speedControl
    ? '<button type="button" class="rx-video-btn rx-video-speed resux-video__speed-button" data-rx-video-speed data-resux-video-control="true" aria-label="' + escapeAttribute(speedLabel) + '">' + escapeHtml(speedButtonText) + '</button>'
    : "";
  const hasOverlayQuickControls = !customControls && (speedControl || qualityControlEnabled);
  const initialPlayIcon = iconsLoad === "lazy" ? iconPlayFallback : iconPlay;
  const initialUnmuteIcon = iconsLoad === "lazy" ? iconUnmuteFallback : iconUnmute;
  const initialFullscreenIcon = iconsLoad === "lazy" ? iconFullscreenFallback : iconFullscreen;
  const timeHiddenAttr = showTime ? "" : " hidden";
  const progressHiddenAttr = showProgress ? "" : " hidden";
  const volumeHiddenAttr = showVolume ? "" : " hidden";
  const fullscreenHiddenAttr = showFullscreen ? "" : " hidden";
  const interactionZonesMarkup = interactionZonesEnabled
    ? '<div class="rx-video-click-zones" data-rx-video-click-zones data-rx-video-skip-overlay-zone aria-hidden="false">'
      + '<button type="button" class="rx-video-zone rx-video-zone-left" data-rx-video-zone="left" data-resux-video-zone="left" data-rx-video-side-action="-' + escapeAttribute(String(skipBackwardSeconds)) + '" data-rx-skip-indicator="' + (sideSkipEnabled ? '-' + escapeAttribute(formatClientVideoSkipDuration(skipBackwardSeconds)) : "") + '" aria-label="' + escapeAttribute(skipBackwardLabel) + '"></button>'
      + '<button type="button" class="rx-video-zone rx-video-zone-center" data-rx-video-zone="center" data-resux-video-zone="center" data-rx-skip-indicator="" aria-label="Toggle play or pause video"></button>'
      + '<button type="button" class="rx-video-zone rx-video-zone-right" data-rx-video-zone="right" data-resux-video-zone="right" data-rx-video-side-action="' + escapeAttribute(String(skipForwardSeconds)) + '" data-rx-skip-indicator="' + (sideSkipEnabled ? '+' + escapeAttribute(formatClientVideoSkipDuration(skipForwardSeconds)) : "") + '" aria-label="' + escapeAttribute(skipForwardLabel) + '"></button>'
      + "</div>"
    : "";
  const controlsMarkup = customControls
    ? '<div class="rx-video-controls resux-video__controls" data-rx-video-controls data-resux-video-control="true" role="group" aria-label="Video controls">'
      + '<button type="button" class="rx-video-btn rx-video-toggle resux-video__control" data-rx-video-toggle data-resux-video-control="true" aria-label="Play video">' + escapeHtml(initialPlayIcon) + '</button>'
      + '<span class="rx-video-time" data-rx-video-current' + timeHiddenAttr + '>0:00</span>'
      + '<input class="rx-video-seek" data-rx-video-seek data-resux-video-control="true" type="range" min="0" max="100" step="0.1" value="0" aria-label="Seek video"' + progressHiddenAttr + '>'
      + '<span class="rx-video-time" data-rx-video-duration' + timeHiddenAttr + '>0:00</span>'
      + '<button type="button" class="rx-video-btn rx-video-mute resux-video__control" data-rx-video-mute data-resux-video-control="true" aria-label="Toggle mute"' + volumeHiddenAttr + '>' + escapeHtml(initialUnmuteIcon) + '</button>'
      + '<input class="rx-video-volume" data-rx-video-volume data-resux-video-control="true" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume"' + volumeHiddenAttr + '>'
      + speedControlsMarkup
      + qualityControlMarkup
      + '<button type="button" class="rx-video-btn rx-video-fullscreen resux-video__control" data-rx-video-fullscreen data-resux-video-control="true" aria-label="Toggle fullscreen"' + fullscreenHiddenAttr + '>' + escapeHtml(initialFullscreenIcon) + '</button>'
      + "</div>"
    : hasOverlayQuickControls
      ? '<div class="rx-video-controls rx-video-controls-compact resux-video__overlay-controls" data-rx-video-controls data-resux-video-control="true" data-rx-video-controls-compact="true" role="group" aria-label="Video quick controls">'
        + speedControlsMarkup
        + qualityControlMarkup
        + "</div>"
      : "";
  return "<div " + shellAttrs.join(" ") + "><div class=\"resux-video__stage\" data-rx-video-stage data-rx-video-custom-controls=\"" + (customControls ? "true" : "false") + "\">" + videoMarkup + interactionZonesMarkup + controlsMarkup + "</div></div>";
}

function renderClientResuxImg(node, scope, locals, styleScopeId, scopeId) {
  const input = resolveClientImageRenderInput(node, scope, locals, scopeId);
  if (!input.src) {
    return "";
  }

  const app = getClientResuxApp();
  const builder = createClientImageBuilder(app.route, app.$config);
  const src = builder(input.src, {
    provider: input.provider,
    cache: input.cache,
    width: input.width,
    height: input.height,
    quality: input.quality,
    fit: input.fit,
    format: input.format,
    modifiers: input.modifiers
  });
  const srcset = buildClientImageSrcset(builder, input);
  return renderClientResuxImgTag(input, src, srcset, styleScopeId);
}

function renderClientResuxPicture(node, scope, locals, styleScopeId, scopeId) {
  const input = resolveClientImageRenderInput(node, scope, locals, scopeId);
  if (!input.src) {
    return "";
  }
  const props = {};
  for (const attr of node.attrs) {
    const normalizedName = attr.name.replace(/-([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
    props[normalizedName] = attr.kind === "static"
      ? attr.value
      : evaluateExpression(attr.value, scope, locals);
  }

  const app = getClientResuxApp();
  const builder = createClientImageBuilder(app.route, app.$config);
  const fallbackSource = input.fallbackSrc || input.src;
  const fallbackSrc = builder(fallbackSource, {
    provider: input.provider,
    cache: input.cache,
    width: input.width,
    height: input.height,
    quality: input.quality,
    fit: input.fit,
    modifiers: input.modifiers
  });
  const fallbackSrcset = buildClientImageSrcset(builder, {
    ...input,
    src: fallbackSource,
    format: undefined
  });
  const manualChildren = node.children.map((child) => renderNode(child, scope, locals, styleScopeId)).join("");
  const explicitSources = resolveClientPictureSourceInputs(props.sources, input);
  const sourceInputs = explicitSources.length
    ? explicitSources
    : input.formats.map((format) => ({
      src: input.src,
      widths: input.widths,
      width: input.width,
      height: input.height,
      quality: input.quality,
      format,
      fit: input.fit,
      sizes: input.sizes,
      modifiers: input.modifiers,
      type: clientImageMimeType(format)
    }));
  const generatedSources = sourceInputs
    .map((entry) => {
      const sourceInput = entry;
      const sourceRenderInput = {
        ...input,
        src: sourceInput.src,
        width: sourceInput.width,
        height: sourceInput.height,
        widths: sourceInput.widths,
        sizes: sourceInput.sizes,
        quality: sourceInput.quality,
        format: sourceInput.format,
        fit: sourceInput.fit,
        modifiers: sourceInput.modifiers,
        placeholderSrc: undefined,
        placeholderClass: undefined,
        placeholderStyle: undefined,
        fallbackSrc: undefined,
        attrs: {},
        preload: false,
        deferLazy: input.deferLazy
      };
      const sourceSrcset = sourceInput.srcset || buildClientImageSrcset(builder, sourceRenderInput);
      const sourceUrl = builder(sourceInput.src, {
        provider: input.provider,
        cache: input.cache,
        width: sourceInput.width,
        height: sourceInput.height,
        quality: sourceInput.quality,
        fit: sourceInput.fit,
        format: sourceInput.format,
        modifiers: sourceInput.modifiers
      });
      const resolvedSrcset = sourceSrcset || sourceUrl;
      if (!resolvedSrcset) {
        return "";
      }
      const sourceAttrs = [];
      const sourceType = sourceInput.type
        || (sourceInput.format ? clientImageMimeType(sourceInput.format) : inferClientImageMimeTypeFromSource(sourceInput.src));
      if (sourceType) {
        sourceAttrs.push('type="' + escapeAttribute(sourceType) + '"');
      }
      if (sourceInput.media) {
        sourceAttrs.push('media="' + escapeAttribute(sourceInput.media) + '"');
      }
      if (input.deferLazy) {
        sourceAttrs.push('data-rx-lazy-srcset="' + escapeAttribute(resolvedSrcset) + '"');
        sourceAttrs.push('data-srcset="' + escapeAttribute(resolvedSrcset) + '"');
        if (sourceInput.sizes) {
          sourceAttrs.push('data-rx-lazy-sizes="' + escapeAttribute(sourceInput.sizes) + '"');
        }
      } else {
        sourceAttrs.push('srcset="' + escapeAttribute(resolvedSrcset) + '"');
        if (sourceInput.sizes) {
          sourceAttrs.push('sizes="' + escapeAttribute(sourceInput.sizes) + '"');
        }
      }
      return "<source " + sourceAttrs.join(" ") + ">";
    })
    .filter(Boolean)
    .join("");
  const img = renderClientResuxImgTag(input, fallbackSrc, fallbackSrcset, undefined);
  const attrs = ['data-resux-media="picture"'];
  if (styleScopeId) {
    attrs.push(styleScopeId + '=""');
  }
  const attrText = attrs.length ? " " + attrs.join(" ") : "";
  return "<picture" + attrText + ">" + manualChildren + generatedSources + img + "</picture>";
}

function resolveClientImageRenderInput(node, scope, locals, scopeId) {
  const props = {};
  for (const attr of node.attrs) {
    const normalizedName = attr.name.replace(/-([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
    props[normalizedName] = attr.kind === "static"
      ? attr.value
      : evaluateExpression(attr.value, scope, locals);
  }
  const imageConfig = readClientImageConfig(getClientResuxApp().$config);
  const explicitFormat = readClientStringProp(props.format);
  const explicitFormats = parseClientImageFormats(
    props.formats || (explicitFormat && explicitFormat.includes(",") ? explicitFormat : undefined)
  );
  const hasExplicitQuality = Object.prototype.hasOwnProperty.call(props, "quality");
  const hasExplicitFormat = Object.prototype.hasOwnProperty.call(props, "format");
  const explicitQuality = readClientNumberProp(props.quality);
  const modifiers = normalizeClientImageModifiers({
    ...normalizeClientImageModifiers(props.modifiers),
    ...(hasExplicitFormat && !explicitFormat ? { format: false } : {}),
    ...(hasExplicitQuality && !explicitQuality ? { quality: false } : {})
  });
  const priority = readClientBooleanProp(props.priority, false);
  const preload = readClientBooleanProp(props.preload, priority);
  const explicitLoading = readClientStringProp(props.loading);
  const explicitLazy = props.lazy === undefined
    ? undefined
    : readClientBooleanProp(props.lazy, true);
  const lazy = explicitLazy ?? (explicitLoading ? explicitLoading === "lazy" : !priority);
  const loading = explicitLoading || (lazy ? "lazy" : "eager");
  const deferLazy = explicitLoading === "lazy" || explicitLazy === true;
  const lazyRootMargin = readClientStringProp(props.rootMargin) || "0px 0px";
  const lazyThresholdRaw = Number(props.threshold);
  const lazyThreshold = Number.isFinite(lazyThresholdRaw)
    ? Math.min(1, Math.max(0, lazyThresholdRaw))
    : 0;
  const quality = hasExplicitQuality
    ? explicitQuality
    : (explicitQuality ?? imageConfig.quality);
  const cache = normalizeClientImageCacheValue(props.cache ?? imageConfig.cache);
  const densities = parseClientImageNumberList(props.densities)
    || imageConfig.densities
    || [1, 2];
  const src = readClientStringProp(props.src)
    || readClientStringProp(props.fallbackSrc ?? props.fallback)
    || "";
  return {
    src,
    alt: readClientStringProp(props.alt) || "",
    width: readClientNumberProp(props.width),
    height: readClientNumberProp(props.height),
    sizes: readClientStringProp(props.sizes),
    widths: parseClientImageNumberList(props.widths) || [],
    densities,
    loading,
    decoding: readClientStringProp(props.decoding) || "async",
    fetchPriority: readClientStringProp(props.fetchpriority || props.fetchPriority) || (priority ? "high" : undefined),
    provider: readClientStringProp(props.provider),
    cache,
    quality,
    fit: readClientStringProp(props.fit),
    format: explicitFormats.length
      ? undefined
      : (hasExplicitFormat ? explicitFormat : (explicitFormat || imageConfig.format)),
    formats: explicitFormats,
    placeholderSrc: resolveClientPlaceholderSource(props.placeholder),
    placeholderClass: readClientStringProp(props.placeholderClass),
    placeholderStyle: readClientStringProp(props.placeholderStyle),
    fallbackSrc: readClientStringProp(props.fallbackSrc ?? props.fallback),
    modifiers,
    attrs: Object.assign(
      collectClientImageAttrs(props),
      (readClientStringProp(props.ref) || node.ref) && scopeId ? { "data-rx-ref": scopeId + ":" + (readClientStringProp(props.ref) || node.ref) } : {}
    ),
    preload,
    deferLazy,
    lazyRootMargin,
    lazyThreshold
  };
}

function collectClientImageAttrs(props) {
  const attrs = {};
  for (const [name, rawValue] of Object.entries(props)) {
    if (clientImageReservedProps.has(name)) {
      continue;
    }
    if (rawValue === undefined || rawValue === null || rawValue === false) {
      continue;
    }
    const attrName = name === "className"
      ? "class"
      : name === "referrerPolicy"
        ? "referrerpolicy"
        : name === "crossOrigin"
          ? "crossorigin"
          : name;
    attrs[attrName] = stringifyAttributeValue(attrName, rawValue);
  }
  return attrs;
}
`;
