// Client runtime source, part 4 of 9. Concatenated by getClientRuntimeSource() in ../index.ts.
export const clientRuntimePart04 = String.raw`
function resolveDeferredActivationTarget(targetOrSelector) {
  if (typeof targetOrSelector === "string") {
    return document.querySelector(targetOrSelector);
  }
  return targetOrSelector && targetOrSelector.nodeType === 1 ? targetOrSelector : null;
}

async function activateDeferredClientTarget(target) {
  if (!target || !target.isConnected) {
    return false;
  }
  if (target.hasAttribute("data-rx-vue-island")) {
    const payload = globalThis.__RESUX__;
    const islands = payload && payload.vueIslands ? payload.vueIslands : {};
    await mountVueIslandElement(target, islands);
    return mountedVueIslands.has(target);
  }
  if (target.matches && target.matches("[data-resux-enhancement], [use-client-enhancement]")) {
    await activateDeclaredClientEnhancement(target, true);
    return true;
  }
  return false;
}

function installResux() {
  globalThis.__RESUX_DISPATCH_RESUMED_EVENT__ = (eventName, event) => handleDelegatedEvent(eventName, event);
  globalThis.__RESUX_ACTIVATE_DEFERRED_TARGET__ = (target) => activateDeferredClientTarget(target);
  globalThis.__RESUX_ACTIVATE_DEFERRED__ = (targetOrSelector) => {
    const target = resolveDeferredActivationTarget(targetOrSelector);
    return target ? activateDeferredClientTarget(target) : Promise.resolve(false);
  };
  globalThis.__RESUX_USE_I18N__ = () => useClientI18n();
  globalThis.__RESUX_USE_LOCALE_PATH__ = () => useClientI18n().localePath;
  globalThis.__RESUX_USE_SWITCH_LOCALE_PATH__ = () => useClientI18n().switchLocalePath;
  if (globalThis.__RESUX_INSTALLED__) {
    return;
  }
  globalThis.__RESUX_INSTALLED__ = true;
  document.addEventListener("click", (event) => {
    if (handleNavigationClick(event)) {
      return;
    }
    void handleDelegatedEvent("click", event);
  });
  document.addEventListener("pointerover", (event) => {
    void prefetchNavigationTarget(event);
  });
  document.addEventListener("focusin", (event) => {
    void prefetchNavigationTarget(event);
  });
  document.addEventListener("load", handleManagedMediaLoad, true);
  document.addEventListener("error", handleManagedMediaError, true);
  document.addEventListener("loadedmetadata", handleManagedVideoReady, true);
  document.addEventListener("loadeddata", handleManagedVideoReady, true);
  document.addEventListener("canplay", handleManagedVideoReady, true);
  document.addEventListener("play", handleManagedVideoPlaybackState, true);
  document.addEventListener("pause", handleManagedVideoPlaybackState, true);
  registerDelegatedEventsFromDom(document);
  document.addEventListener("resux:page:finish", () => {
    if (!collectDeclaredClientEnhancementElements(document).length) {
      return;
    }
    void scanClientEnhancements(document);
  });
  if (typeof window !== "undefined" && typeof history !== "undefined" && typeof location !== "undefined") {
    if (!globalThis.__RESUX_ROUTER__) {
      globalThis.__RESUX_ROUTER__ = createClientRouter();
    }
    if (managedPageLoadReady) {
      managedPageLoadReady = true;
    } else {
      const installedDoc = document;
      window.addEventListener("load", () => {
        managedPageLoadReady = true;
        activateDeferredLazyMedia(installedDoc);
      }, { once: true });
    }
    window.addEventListener("popstate", (event) => {
      const eventViewTransition = event?.viewTransition;
      void navigateTo(location.pathname + location.search + location.hash, {
        replace: true,
        force: true,
        preserveScroll: true,
        ...(typeof eventViewTransition === "boolean" ? { viewTransition: eventViewTransition } : {}),
      });
    });
    if (!history.state || !history.state.__resux) {
      history.replaceState({ __resux: true, path: location.pathname + location.search }, "", location.href);
    }
  }
  if (typeof window !== "undefined") {
    window.__RESUX_APPLY_DEV_UPDATE__ = applyDevUpdate;
  }
  void initializeClientRuntime();
}

async function initializeClientRuntime() {
  const payload = globalThis.__RESUX__;
  if (!payload) {
    return;
  }
  reconcileDefaultTeleportTarget();
  mountManagedTeleports(document, { deferMissingTarget: true });
  await ensureClientPlugins(payload);
  reconcileDefaultTeleportTarget();
  mountManagedTeleports(document, { deferMissingTarget: true });
  const middlewareResult = await runClientRouteMiddleware(payload, { path: "", params: {}, query: {} });
  if (middlewareResult?.type === "redirect") {
    await navigateTo(middlewareResult.to, { replace: true });
    return;
  }
  if (middlewareResult?.type === "abort") {
    return;
  }
  void resumePendingAsyncData();
  initializeManagedRuntimeContent(document);
}

function activateDeferredLazyMedia(root = document, options = {}) {
  cleanupDetachedLazyMedia();
  activateDeferredLazyImages(root);
  activateDeferredLazyVideos(root);
  if (isManagedMediaDebugEnabled()) {
    const lazyImages = root?.querySelectorAll ? root.querySelectorAll("img[data-rx-lazy-image='true']").length : 0;
    const lazyVideos = root?.querySelectorAll ? root.querySelectorAll("video[data-rx-lazy-video='true']").length : 0;
    logManagedMediaDebug("media-activation", { lazyImages, lazyVideos });
  }
  if (options.dispatchPageEvents !== false) {
    dispatchPageReadyEvent(root);
  }
}

function applyManagedVideoDefaultSpeeds(root = document) {
  const videos = root.querySelectorAll ? root.querySelectorAll("video[data-rx-video-default-speed]") : [];
  videos.forEach((video) => ensureManagedVideoElementDefaultSpeed(video));
}

function activateDeferredLazyImages(root = document) {
  const images = root.querySelectorAll ? root.querySelectorAll("img[data-rx-lazy-image='true']") : [];
  if (!images.length) {
    return;
  }
  for (const image of images) {
    if (!isManagedMediaConnected(image)) {
      continue;
    }
    if (
      image.getAttribute("data-rx-lazy-ready") === "true"
      || image.getAttribute("data-resux-revealed") === "true"
      || image.getAttribute("data-resux-loaded") === "true"
      || image.getAttribute("data-resux-error-handled") === "true"
      || observedLazyImages.has(image)
    ) {
      continue;
    }
    const observer = getLazyImageObserver(image);
    if (!observer) {
      revealDeferredLazyImage(image);
      continue;
    }
    observedLazyImages.add(image);
    lazyImageObserverByElement.set(image, observer);
    image.setAttribute("data-rx-lazy-observed", "true");
    image.setAttribute("data-resux-observed", "true");
    observer.observe(image);
  }
}

function getLazyImageObserver(image) {
  if (typeof IntersectionObserver !== "function") {
    return null;
  }
  const rootMargin = image.getAttribute("data-rx-lazy-root-margin") || "0px 0px";
  const thresholdRaw = Number(image.getAttribute("data-rx-lazy-threshold"));
  const threshold = Number.isFinite(thresholdRaw) ? Math.min(1, Math.max(0, thresholdRaw)) : 0;
  const key = rootMargin + "|" + String(threshold);
  if (lazyImageObservers.has(key)) {
    return lazyImageObservers.get(key);
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting && entry.intersectionRatio <= 0) {
        continue;
      }
      const target = entry.target;
      observer.unobserve(target);
      revealDeferredLazyImage(target);
    }
  }, { rootMargin, threshold });
  lazyImageObservers.set(key, observer);
  return observer;
}

function revealDeferredLazyImage(image) {
  if (!image || !isManagedMediaConnected(image)) {
    return;
  }
  unobserveLazyImage(image);

  if (
    image.getAttribute("data-rx-lazy-ready") === "true"
    || image.getAttribute("data-resux-revealed") === "true"
    || image.getAttribute("data-resux-loaded") === "true"
    || image.getAttribute("data-resux-error-handled") === "true"
  ) {
    return;
  }

  const targetSrc = image.getAttribute("data-rx-lazy-src") || image.getAttribute("data-src") || "";
  if (targetSrc && mediaSourceWasFailed(image, targetSrc)) {
    applyKnownImageFailure(image, targetSrc);
    return;
  }
  if (
    targetSrc
    && image.getAttribute("data-resux-loading") === "true"
    && mediaUrlsEqual(getCurrentMediaUrl(image), targetSrc, image)
  ) {
    return;
  }

  dispatchManagedEvent(image, "lazy-load-start");
  image.setAttribute("data-resux-revealed", "true");
  image.setAttribute("data-rx-lazy-pending", "true");
  image.setAttribute("data-rx-lazy-ready", "true");
  image.setAttribute("data-resux-loading", "true");
  image.setAttribute("data-resux-img", "loading");

  const picture = image.closest ? image.closest("picture") : null;
  if (picture && picture.querySelectorAll) {
    picture.setAttribute("data-resux-loading", "true");
    picture.querySelectorAll("source[data-rx-lazy-srcset]").forEach((source) => {
      const nextSrcset = source.getAttribute("data-rx-lazy-srcset");
      if (nextSrcset && !mediaSourceWasFailed(image, nextSrcset)) {
        source.setAttribute("srcset", nextSrcset);
      } else if (nextSrcset) {
        source.setAttribute("data-rx-failed-srcset", nextSrcset);
      }
      source.removeAttribute("data-rx-lazy-srcset");
      source.removeAttribute("data-srcset");
      const nextSizes = source.getAttribute("data-rx-lazy-sizes");
      if (nextSizes) {
        source.setAttribute("sizes", nextSizes);
      }
      source.removeAttribute("data-rx-lazy-sizes");
    });
  }

  const srcset = image.getAttribute("data-rx-lazy-srcset");
  if (srcset && !mediaSourceWasFailed(image, srcset)) {
    image.setAttribute("srcset", srcset);
  }
  image.removeAttribute("data-rx-lazy-srcset");
  image.removeAttribute("data-srcset");
  const sizes = image.getAttribute("data-rx-lazy-sizes");
  if (sizes) {
    image.setAttribute("sizes", sizes);
  }
  image.removeAttribute("data-rx-lazy-sizes");

  if (targetSrc && shouldAssignMediaSource(image, targetSrc)) {
    image.setAttribute("src", targetSrc);
  } else if (image.getAttribute("src") === RESUX_LAZY_PLACEHOLDER_SRC) {
    image.removeAttribute("src");
  }
  image.removeAttribute("data-rx-lazy-src");
  image.removeAttribute("data-src");
}

function activateDeferredLazyVideos(root = document) {
  const videos = root.querySelectorAll ? root.querySelectorAll("video[data-rx-lazy-video='true']") : [];
  if (!videos.length) {
    return;
  }
  const pageReady = managedPageLoadReady && (!root?.readyState || root.readyState === "complete");
  for (const video of videos) {
    if (!isManagedMediaConnected(video)) {
      continue;
    }
    if (
      video.getAttribute("data-rx-lazy-ready") === "true"
      || video.getAttribute("data-resux-revealed") === "true"
      || video.getAttribute("data-resux-loaded") === "true"
      || video.getAttribute("data-resux-error-handled") === "true"
      || observedLazyVideos.has(video)
    ) {
      continue;
    }
    const deferUntilReady = video.getAttribute("data-rx-video-defer-ready") === "true";
    const revealOnReady = video.getAttribute("data-rx-video-ready-reveal") === "true";
    if (deferUntilReady && !pageReady) {
      continue;
    }
    if (deferUntilReady && revealOnReady) {
      scheduleManagedVideoReveal(video);
      continue;
    }
    const observer = getLazyVideoObserver(video);
    if (!observer) {
      revealDeferredLazyVideo(video);
      continue;
    }
    observedLazyVideos.add(video);
    lazyVideoObserverByElement.set(video, observer);
    video.setAttribute("data-rx-lazy-observed", "true");
    video.setAttribute("data-resux-observed", "true");
    observer.observe(video);
  }
}

function getLazyVideoObserver(video) {
  if (typeof IntersectionObserver !== "function") {
    return null;
  }
  const rootMargin = video.getAttribute("data-rx-lazy-root-margin") || "320px 0px";
  const thresholdRaw = Number(video.getAttribute("data-rx-lazy-threshold"));
  const threshold = Number.isFinite(thresholdRaw) ? Math.min(1, Math.max(0, thresholdRaw)) : 0;
  const key = rootMargin + "|" + String(threshold);
  if (lazyVideoObservers.has(key)) {
    return lazyVideoObservers.get(key);
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting && entry.intersectionRatio <= 0) {
        continue;
      }
      const target = entry.target;
      observer.unobserve(target);
      revealDeferredLazyVideo(target);
    }
  }, { rootMargin, threshold });
  lazyVideoObservers.set(key, observer);
  return observer;
}

function scheduleManagedVideoReveal(video) {
  if (!video || !isManagedMediaConnected(video)) {
    return;
  }
  if (video.getAttribute("data-rx-video-reveal-scheduled") === "true") {
    return;
  }
  video.setAttribute("data-rx-video-reveal-scheduled", "true");
  const run = () => {
    video.removeAttribute("data-rx-video-reveal-scheduled");
    revealDeferredLazyVideo(video);
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout: 1200 });
    return;
  }
  setTimeout(run, 0);
}

function revealDeferredLazyVideo(video) {
  if (!video || !isManagedMediaConnected(video)) {
    return;
  }
  unobserveLazyVideo(video);

  const sourceNodes = video.querySelectorAll
    ? video.querySelectorAll("source[data-rx-lazy-src]")
    : [];
  const targetSrc = video.getAttribute("data-rx-lazy-src") || video.getAttribute("data-src") || "";
  const firstSourceTarget = sourceNodes.length
    ? (sourceNodes[0].getAttribute("data-rx-lazy-src") || sourceNodes[0].getAttribute("data-src") || "")
    : "";
  const revealTarget = targetSrc || firstSourceTarget;
  const loadingTarget = video.getAttribute("data-rx-video-loading-src") || "";

  if (
    video.getAttribute("data-rx-lazy-ready") === "true"
    || video.getAttribute("data-resux-revealed") === "true"
    || video.getAttribute("data-resux-loaded") === "true"
    || video.getAttribute("data-resux-error-handled") === "true"
  ) {
    return;
  }
  if (video.getAttribute("data-resux-video-loading") === "true") {
    if (!loadingTarget || !revealTarget || mediaUrlsEqual(loadingTarget, revealTarget, video)) {
      logManagedMediaDebug("video-reveal-skip-loading", { revealTarget, loadingTarget });
      return;
    }
  }
  if (revealTarget && mediaSourceWasFailed(video, revealTarget)) {
    applyKnownVideoFailure(video, revealTarget);
    return;
  }
  const knownFailedTarget = video.getAttribute("data-resux-failed-src") || video.getAttribute("data-rx-failed-src") || "";
  if (knownFailedTarget && revealTarget && mediaUrlsEqual(knownFailedTarget, revealTarget, video)) {
    logManagedMediaDebug("video-reveal-skip-failed", { revealTarget });
    return;
  }

  logManagedMediaDebug("video-reveal-start", {
    revealTarget,
    lazySrc: targetSrc,
    sourceCount: sourceNodes.length
  });
  dispatchManagedEvent(video, "lazy-load-start");
  video.setAttribute("data-resux-revealed", "true");

  const preload = video.getAttribute("data-rx-lazy-preload") || "metadata";
  video.setAttribute("preload", preload);
  ensureManagedVideoElementDefaultSpeed(video);
  const revealPoster = video.getAttribute("data-rx-poster") || video.getAttribute("data-rx-placeholder-src");
  if (revealPoster) {
    video.setAttribute("poster", revealPoster);
  }
  let assignedSource = false;
  let assignedPrimarySrc = "";
  let firstFailedSource = "";
  sourceNodes.forEach((source) => {
    const nextSrc = source.getAttribute("data-rx-lazy-src");
    if (nextSrc && !mediaSourceWasFailed(video, nextSrc)) {
      source.setAttribute("src", nextSrc);
      if (!assignedPrimarySrc) {
        assignedPrimarySrc = nextSrc;
      }
      assignedSource = true;
      logManagedMediaDebug("video-source-assigned", { src: nextSrc });
    } else if (nextSrc && !firstFailedSource) {
      firstFailedSource = nextSrc;
    }
    source.removeAttribute("data-rx-lazy-src");
    source.removeAttribute("data-src");
  });
  if (targetSrc && sourceNodes.length === 0 && shouldAssignMediaSource(video, targetSrc)) {
    video.setAttribute("src", targetSrc);
    assignedPrimarySrc = targetSrc;
    assignedSource = true;
    logManagedMediaDebug("video-source-assigned", { src: targetSrc });
  }
  video.removeAttribute("data-rx-lazy-src");
  video.removeAttribute("data-src");
  video.removeAttribute("data-rx-lazy-video");
  if (!assignedSource) {
    const knownFailedSrc = firstFailedSource || targetSrc;
    if (knownFailedSrc) {
      applyKnownVideoFailure(video, knownFailedSrc);
    }
    return;
  }
  video.setAttribute("data-rx-lazy-pending", "true");
  video.setAttribute("data-rx-lazy-ready", "true");
  video.setAttribute("data-resux-loading", "true");
  video.setAttribute("data-resux-video-loading", "true");
  video.setAttribute("data-resux-video", "loading");
  if (assignedPrimarySrc) {
    video.setAttribute("data-rx-video-loading-src", assignedPrimarySrc);
  }

  if (typeof video.load === "function" && video.getAttribute("data-rx-load-called") !== "true") {
    video.setAttribute("data-rx-load-called", "true");
    try {
      logManagedMediaDebug("video-load", { src: assignedPrimarySrc || revealTarget || "" });
      video.load();
    } catch {
    }
  } else {
    logManagedMediaDebug("video-load-skip", { reason: "already-called" });
  }
  if (shouldAutoplayManagedVideo(video)) {
    attemptManagedVideoPlay(video);
  }
}

function applyReducedMotionVideoPreference(root = document) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return;
  }
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  const videos = root.querySelectorAll ? root.querySelectorAll("video[data-rx-respect-reduced-motion='true']") : [];
  videos.forEach((video) => {
    if (video.getAttribute("data-rx-force-autoplay") === "true") {
      return;
    }
    video.removeAttribute("autoplay");
    if (typeof video.pause === "function") {
      video.pause();
    }
  });
}

function shouldAutoplayManagedVideo(video) {
  if (video.getAttribute("data-rx-autoplay-requested") !== "true") {
    return false;
  }
  if (video.getAttribute("data-rx-force-autoplay") === "true") {
    return true;
  }
  if (video.getAttribute("data-rx-respect-reduced-motion") !== "true") {
    return true;
  }
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function attemptManagedVideoPlay(video) {
  if (!video || video.getAttribute("data-rx-play-attempted") === "true") {
    return;
  }
  video.setAttribute("data-rx-play-attempted", "true");
  if (typeof video.play !== "function") {
    return;
  }
  const playResult = video.play();
  if (playResult && typeof playResult.catch === "function") {
    playResult.catch(() => {});
  }
}

function swallowManagedControlEvent(event) {
  if (!event) {
    return;
  }
  if (typeof event.preventDefault === "function") {
    event.preventDefault();
  }
  if (typeof event.stopImmediatePropagation === "function") {
    event.stopImmediatePropagation();
    return;
  }
  if (typeof event.stopPropagation === "function") {
    event.stopPropagation();
  }
}

function ensureManagedVideoFullscreenListeners() {
  if (managedVideoFullscreenListenersReady || typeof document === "undefined") {
    return;
  }
  managedVideoFullscreenListenersReady = true;
  const syncAllShells = () => {
    for (const shell of Array.from(managedVideoControlShells)) {
      if (!shell || !shell.isConnected) {
        managedVideoControlShells.delete(shell);
        continue;
      }
      const sync = managedVideoControlSyncByShell.get(shell);
      if (typeof sync === "function") {
        sync();
      }
    }
  };
  document.addEventListener("fullscreenchange", syncAllShells);
  document.addEventListener("webkitfullscreenchange", syncAllShells);
}

function isVideoControlTarget(target) {
  if (!target || !target.closest) {
    return false;
  }
  if (target.closest("[data-rx-video-zone], [data-resux-video-zone]")) {
    return false;
  }
  return Boolean(target.closest("[data-rx-video-controls], [data-resux-video-control], [data-rx-video-toggle], [data-rx-video-seek], [data-rx-video-volume], [data-rx-video-quality], [data-rx-video-speed], [data-rx-video-mute], [data-rx-video-fullscreen], [data-rx-video-skip-back-button], [data-rx-video-skip-forward-button], button, input, select, option, label, textarea, a"));
}

function shouldIgnoreManagedVideoStageInteraction(target) {
  if (!target || !target.closest) {
    return false;
  }
  if (target.closest("[data-rx-video-zone], [data-resux-video-zone]")) {
    return false;
  }
  return Boolean(
    target.closest("[data-resux-video-control], [data-rx-video-controls], button, input, select, textarea, a"),
  );
}

function showManagedVideoFeedback(shell, text, tone = "neutral") {
  if (!shell || !shell.querySelector || typeof text !== "string" || text.trim().length === 0) {
    return;
  }
  const node = shell.querySelector("[data-rx-video-feedback]");
  if (!node) {
    return;
  }
  const payload = text.trim();
  if (!payload) {
    return;
  }
  if (node.__rxFeedbackTimer) {
    clearTimeout(node.__rxFeedbackTimer);
    node.__rxFeedbackTimer = 0;
  }
  node.textContent = payload;
  node.setAttribute("data-rx-video-feedback-visible", "true");
  node.setAttribute("data-rx-video-feedback-tone", tone);
  node.__rxFeedbackTimer = setTimeout(() => {
    node.removeAttribute("data-rx-video-feedback-visible");
    node.removeAttribute("data-rx-video-feedback-tone");
    node.__rxFeedbackTimer = 0;
  }, 520);
}

function toggleManagedVideoPlayback(video) {
  if (!video) {
    return;
  }
  if (video.paused) {
    const playResult = typeof video.play === "function" ? video.play() : undefined;
    if (playResult && typeof playResult.catch === "function") {
      playResult.catch(() => {});
    }
    return;
  }
  if (typeof video.pause === "function") {
    video.pause();
  }
}

function toggleManagedVideoFullscreen(shell) {
  if (!shell) {
    return;
  }
  const isFullscreen = Boolean(
    document.fullscreenElement && (document.fullscreenElement === shell || document.fullscreenElement.contains(shell))
  );
  if (isFullscreen) {
    if (typeof document.exitFullscreen === "function") {
      void document.exitFullscreen().catch(() => {});
    } else if (typeof document.webkitExitFullscreen === "function") {
      document.webkitExitFullscreen();
    }
    return;
  }
  if (typeof shell.requestFullscreen === "function") {
    void shell.requestFullscreen().catch(() => {});
  } else if (typeof shell.webkitRequestFullscreen === "function") {
    shell.webkitRequestFullscreen();
  }
}

function syncManagedVideoControlsHitArea(shell, customControlsEnabled) {
  if (!shell || !shell.style || typeof shell.style.setProperty !== "function") {
    return;
  }
  const stage = shell.querySelector ? shell.querySelector("[data-rx-video-stage]") : null;
  const controls = shell.querySelector ? shell.querySelector("[data-rx-video-controls]") : null;
  if (customControlsEnabled && stage && controls && stage.getBoundingClientRect && controls.getBoundingClientRect) {
    const stageRect = stage.getBoundingClientRect();
    const controlsRect = controls.getBoundingClientRect();
    const overlap = Math.max(0, stageRect.bottom - controlsRect.top + 8);
    if (Number.isFinite(overlap) && overlap > 0) {
      shell.style.setProperty("--rx-video-controls-hit-area", String(Math.ceil(overlap)) + "px");
      return;
    }
  }
  if (shell.getAttribute("data-rx-video-native-controls") === "true") {
    shell.style.setProperty("--rx-video-controls-hit-area", "4.25rem");
    return;
  }
  shell.style.setProperty("--rx-video-controls-hit-area", "0px");
}

function resolveManagedVideoState(video) {
  if (!video) {
    return "idle";
  }
  if (video.getAttribute("data-resux-error") === "true" || video.getAttribute("data-rx-error") === "true") {
    return "error";
  }
  if (video.getAttribute("data-rx-lazy-video") === "true" && video.getAttribute("data-rx-lazy-ready") !== "true") {
    return "idle";
  }
  if (video.getAttribute("data-resux-video-loading") === "true" || video.getAttribute("data-resux-loading") === "true") {
    return "loading";
  }
  if (!video.paused) {
    return "playing";
  }
  if (video.getAttribute("data-resux-loaded") === "true" && Number(video.currentTime) <= 0.01) {
    return "ready";
  }
  return "paused";
}

function resolveManagedVideoControlsLoad(shell) {
  return shell?.getAttribute?.("data-rx-video-controls-load") === "eager"
    ? "eager"
    : "lazy";
}

function resolveManagedVideoIconsLoad(shell) {
  return shell?.getAttribute?.("data-rx-video-icons-load") === "eager"
    ? "eager"
    : "lazy";
}

function isManagedVideoControlsActivated(shell) {
  return shell?.getAttribute?.("data-rx-video-controls-activated") === "true";
}

function activateManagedVideoControls(shell) {
  if (!shell) {
    return;
  }
  shell.setAttribute("data-rx-video-controls-activated", "true");
  shell.setAttribute("data-rx-video-controls-ready", "true");
  shell.setAttribute("data-resux-video-controls-ready", "true");
  if (resolveManagedVideoIconsLoad(shell) === "lazy") {
    shell.setAttribute("data-rx-video-icons-ready", "true");
  }
}

function scheduleManagedVideoControlsActivation(shell, sync) {
  if (!shell || resolveManagedVideoControlsLoad(shell) === "eager" || isManagedVideoControlsActivated(shell)) {
    return () => {};
  }

  let observer = null;
  let idleTimer = 0;
  let done = false;

  const cleanup = () => {
    if (observer && typeof observer.disconnect === "function") {
      observer.disconnect();
    }
    observer = null;
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = 0;
    }
    shell.removeEventListener("pointerdown", activateFromEvent, true);
    shell.removeEventListener("touchstart", activateFromEvent, true);
    shell.removeEventListener("focusin", activateFromEvent, true);
    shell.removeEventListener("mouseenter", activateFromEvent, true);
  };

  const activateNow = () => {
    if (done) {
      return;
    }
    done = true;
    cleanup();
    activateManagedVideoControls(shell);
    if (typeof sync === "function") {
      sync();
    }
  };

  const activateFromEvent = () => {
    activateNow();
  };

  shell.addEventListener("pointerdown", activateFromEvent, true);
  shell.addEventListener("touchstart", activateFromEvent, true);
  shell.addEventListener("focusin", activateFromEvent, true);
  shell.addEventListener("mouseenter", activateFromEvent, true);

  if (typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
        activateNow();
      }
    }, { rootMargin: "220px 0px" });
    observer.observe(shell);
  }

  idleTimer = setTimeout(() => {
    if (!isManagedMediaConnected(shell)) {
      return;
    }
    activateNow();
  }, 1400);

  return cleanup;
}

function initializeManagedVideoControls(root = document) {
  const shells = root.querySelectorAll ? root.querySelectorAll('[data-rx-video-shell="true"]') : [];
  if (!shells.length) {
    return;
  }
  shells.forEach((shell) => {
    if (initializedVideoControlShells.has(shell)) {
      const existingVideo = shell.querySelector ? shell.querySelector("video[data-resux-media='video']") : null;
      if (existingVideo) {
        updateManagedVideoControlShell(shell, existingVideo);
      }
      return;
    }

    const video = shell.querySelector ? shell.querySelector("video[data-resux-media='video']") : null;
    const stage = shell.querySelector ? shell.querySelector("[data-rx-video-stage]") : null;
    const toggleButton = shell.querySelector ? shell.querySelector("[data-rx-video-toggle]") : null;
    const muteButton = shell.querySelector ? shell.querySelector("[data-rx-video-mute]") : null;
    const fullscreenButton = shell.querySelector ? shell.querySelector("[data-rx-video-fullscreen]") : null;
    const skipBackButton = shell.querySelector ? shell.querySelector("[data-rx-video-skip-back-button]") : null;
    const skipForwardButton = shell.querySelector ? shell.querySelector("[data-rx-video-skip-forward-button]") : null;
    const speedButton = shell.querySelector ? shell.querySelector("[data-rx-video-speed]") : null;
    const qualitySelect = shell.querySelector ? shell.querySelector("[data-rx-video-quality]") : null;
    const leftZoneButton = shell.querySelector ? shell.querySelector("[data-rx-video-zone='left'], [data-rx-video-skip-back-zone]") : null;
    const centerZoneButton = shell.querySelector ? shell.querySelector("[data-rx-video-zone='center']") : null;
    const rightZoneButton = shell.querySelector ? shell.querySelector("[data-rx-video-zone='right'], [data-rx-video-skip-forward-zone]") : null;
    const seekInput = shell.querySelector ? shell.querySelector("[data-rx-video-seek]") : null;
    const volumeInput = shell.querySelector ? shell.querySelector("[data-rx-video-volume]") : null;
    if (!video) {
      return;
    }
    const customControlsEnabled = shell.getAttribute("data-rx-video-custom-controls") === "true";
    const hasCoreControls = Boolean(toggleButton && muteButton && fullscreenButton && seekInput && volumeInput);
    if (customControlsEnabled && !hasCoreControls) {
      return;
    }
    const hasInteractionZones = shell.getAttribute("data-rx-video-has-interaction-zones") === "true";
    if (!customControlsEnabled && !speedButton && !qualitySelect && !hasInteractionZones && !leftZoneButton && !rightZoneButton && !centerZoneButton) {
      return;
    }

    initializedVideoControlShells.add(shell);
    if (customControlsEnabled) {
      video.removeAttribute("controls");
    }
    if (resolveManagedVideoControlsLoad(shell) === "eager") {
      activateManagedVideoControls(shell);
    }
    syncManagedVideoControlsHitArea(shell, customControlsEnabled);
    ensureManagedVideoElementDefaultSpeed(video);
    ensureManagedVideoPlaybackSpeed(video, shell);
    if (volumeInput && Number.isFinite(video.volume)) {
      volumeInput.value = String(Math.min(1, Math.max(0, video.volume)));
    }
    const defaultQualityId = resolveManagedVideoDefaultQualityId(shell, parseManagedVideoQualityOptions(shell));
    if (defaultQualityId) {
      applyManagedVideoQuality(video, shell, defaultQualityId, {
        triggerLoad: false,
        preservePlayback: false,
        qualitySelect
      });
    }

    const sync = () => updateManagedVideoControlShell(shell, video);
    const cancelLazyActivation = scheduleManagedVideoControlsActivation(shell, sync);
    const syncEvents = ["play", "pause", "timeupdate", "loadedmetadata", "durationchange", "volumechange", "loadeddata", "canplay", "lazy-load-start", "lazy-load-complete", "ratechange"];
    const removeListeners = [];
    const bind = (target, eventName, handler, options) => {
      if (!target || typeof target.addEventListener !== "function") {
        return;
      }
      target.addEventListener(eventName, handler, options);
      removeListeners.push(() => {
        target.removeEventListener(eventName, handler, options);
      });
    };
    syncEvents.forEach((name) => bind(video, name, sync));

    let centerClickTimer = 0;
    const disposeShell = () => {
      if (centerClickTimer) {
        clearTimeout(centerClickTimer);
        centerClickTimer = 0;
      }
      cancelLazyActivation();
      while (removeListeners.length > 0) {
        const dispose = removeListeners.pop();
        try {
          dispose?.();
        } catch {}
      }
      managedVideoControlCleanupByShell.delete(shell);
      managedVideoControlSyncByShell.delete(shell);
      managedVideoControlShells.delete(shell);
    };
    shell.addEventListener("DOMNodeRemovedFromDocument", disposeShell, { once: true });
    managedVideoControlCleanupByShell.set(shell, disposeShell);
    managedVideoControlSyncByShell.set(shell, sync);
    managedVideoControlShells.add(shell);
    ensureManagedVideoFullscreenListeners();

    if (toggleButton) {
      bind(toggleButton, "click", (event) => {
        swallowManagedControlEvent(event);
        const wasPaused = Boolean(video.paused);
        toggleManagedVideoPlayback(video);
        const iconPlay = shell.getAttribute("data-rx-video-icon-play") || "Play";
        const iconPause = shell.getAttribute("data-rx-video-icon-pause") || "Pause";
        showManagedVideoFeedback(shell, wasPaused ? iconPlay : iconPause, wasPaused ? "play" : "pause");
        sync();
      });
    }

    if (muteButton) {
      bind(muteButton, "click", (event) => {
        swallowManagedControlEvent(event);
        if (video.muted || video.volume <= 0.01) {
          video.muted = false;
          if (video.volume <= 0.01) {
            video.volume = 0.6;
          }
        } else {
          video.muted = true;
        }
        sync();
      });
    }

    if (seekInput) {
      bind(seekInput, "input", (event) => {
        swallowManagedControlEvent(event);
        const duration = Number(video.duration);
        if (!Number.isFinite(duration) || duration <= 0) {
          return;
        }
        const ratio = Number(seekInput.value) / 100;
        video.currentTime = Math.min(duration, Math.max(0, duration * ratio));
        sync();
      });
    }

    if (volumeInput) {
      bind(volumeInput, "input", (event) => {
        swallowManagedControlEvent(event);
        const nextVolume = Math.min(1, Math.max(0, Number(volumeInput.value)));
        if (!Number.isFinite(nextVolume)) {
          return;
        }
        video.volume = nextVolume;
        video.muted = nextVolume <= 0.01;
        sync();
      });
    }

    const skipControlsEnabled = shell.getAttribute("data-rx-video-skip-controls") === "true";
    const clickToPlayEnabled = shell.getAttribute("data-rx-video-click-to-play") !== "false";
    const doubleClickFullscreenEnabled = shell.getAttribute("data-rx-video-double-click-fullscreen") !== "false";
    const skipBackwardSeconds = normalizeManagedVideoSkipSeconds(shell.getAttribute("data-rx-video-skip-backward"), 10);
    const skipForwardSeconds = normalizeManagedVideoSkipSeconds(shell.getAttribute("data-rx-video-skip-forward"), 10);
    const skipBy = (deltaSeconds, event, source = "zone") => {
      if (event) {
        swallowManagedControlEvent(event);
      }
      const duration = Number(video.duration);
      const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      const next = Number.isFinite(duration) && duration > 0
        ? Math.min(duration, Math.max(0, current + deltaSeconds))
        : Math.max(0, current + deltaSeconds);
      video.currentTime = next;
      const absoluteSeconds = Math.abs(deltaSeconds);
      const labelValue = Number.isInteger(absoluteSeconds)
        ? String(Math.trunc(absoluteSeconds))
        : String(Math.round(absoluteSeconds * 100) / 100);
      showManagedVideoFeedback(
        shell,
        (deltaSeconds < 0 ? "-" : "+") + labelValue + "s",
        deltaSeconds < 0 ? "skip-back" : "skip-forward",
      );
      dispatchManagedEvent(video, "resux:video-skip", {
        delta: deltaSeconds,
        currentTime: next,
        source,
      });
      sync();
    };

    const handleCenterSingleClick = (event) => {
      if (!clickToPlayEnabled || shouldIgnoreManagedVideoStageInteraction(event.target)) {
        return;
      }
      swallowManagedControlEvent(event);
      if (centerClickTimer) {
        clearTimeout(centerClickTimer);
        centerClickTimer = 0;
      }
      centerClickTimer = setTimeout(() => {
        centerClickTimer = 0;
        const wasPaused = Boolean(video.paused);
        toggleManagedVideoPlayback(video);
        const iconPlay = shell.getAttribute("data-rx-video-icon-play") || "Play";
        const iconPause = shell.getAttribute("data-rx-video-icon-pause") || "Pause";
        showManagedVideoFeedback(shell, wasPaused ? iconPlay : iconPause, wasPaused ? "play" : "pause");
        sync();
      }, 220);
    };

    const resolveStageClickRatio = (event) => {
      if (!stage || typeof stage.getBoundingClientRect !== "function") {
        return null;
      }
      const rect = stage.getBoundingClientRect();
      if (!rect || !Number.isFinite(rect.width) || rect.width <= 0) {
        return null;
      }
      const clientX = Number(event.clientX);
      if (!Number.isFinite(clientX)) {
        return null;
      }
      const clampedX = Math.min(rect.width, Math.max(0, clientX - rect.left));
      return clampedX / rect.width;
    };

    if (stage) {
      bind(stage, "click", (event) => {
        if (!event || event.button !== 0 || shouldIgnoreManagedVideoStageInteraction(event.target)) {
          return;
        }
        const ratio = resolveStageClickRatio(event);
        if (ratio === null) {
          return;
        }
        if (skipControlsEnabled && ratio < (1 / 3)) {
          skipBy(-skipBackwardSeconds, event, "left-zone");
          return;
        }
        if (skipControlsEnabled && ratio > (2 / 3)) {
          skipBy(skipForwardSeconds, event, "right-zone");
          return;
        }
        handleCenterSingleClick(event);
      });
      bind(stage, "dblclick", (event) => {
        if (!doubleClickFullscreenEnabled || shouldIgnoreManagedVideoStageInteraction(event.target)) {
          return;
        }
        const ratio = resolveStageClickRatio(event);
        if (ratio === null || ratio < (1 / 3) || ratio > (2 / 3)) {
          return;
        }
        swallowManagedControlEvent(event);
        if (centerClickTimer) {
          clearTimeout(centerClickTimer);
          centerClickTimer = 0;
        }
        toggleManagedVideoFullscreen(shell);
        const icon = shell.getAttribute("data-rx-video-icon-fullscreen") || "Full";
        showManagedVideoFeedback(shell, icon, "fullscreen");
        sync();
      });
    }

    if (skipControlsEnabled && leftZoneButton) {
      bind(leftZoneButton, "click", (event) => {
        if (isVideoControlTarget(event.target)) {
          return;
        }
        skipBy(-skipBackwardSeconds, event, "left-zone-button");
      });
    }
    if (skipControlsEnabled && rightZoneButton) {
      bind(rightZoneButton, "click", (event) => {
        if (isVideoControlTarget(event.target)) {
          return;
        }
        skipBy(skipForwardSeconds, event, "right-zone-button");
      });
    }
    if (skipControlsEnabled && skipBackButton) {
      bind(skipBackButton, "click", (event) => {
        if (isVideoControlTarget(event.target) && event.target !== skipBackButton) {
          return;
        }
        skipBy(-skipBackwardSeconds, event, "control-back-button");
      });
    }
    if (skipControlsEnabled && skipForwardButton) {
      bind(skipForwardButton, "click", (event) => {
        if (isVideoControlTarget(event.target) && event.target !== skipForwardButton) {
          return;
        }
        skipBy(skipForwardSeconds, event, "control-forward-button");
      });
    }

    if (centerZoneButton) {
      bind(centerZoneButton, "click", (event) => {
        if (shouldIgnoreManagedVideoStageInteraction(event.target)) {
          return;
        }
        handleCenterSingleClick(event);
      });
      bind(centerZoneButton, "dblclick", (event) => {
        if (!doubleClickFullscreenEnabled || isVideoControlTarget(event.target)) {
          return;
        }
        swallowManagedControlEvent(event);
        if (centerClickTimer) {
          clearTimeout(centerClickTimer);
          centerClickTimer = 0;
        }
        toggleManagedVideoFullscreen(shell);
        sync();
      });
    }

    if (speedButton) {
      bind(speedButton, "click", (event) => {
        swallowManagedControlEvent(event);
        const nextSpeed = nextManagedVideoPlaybackSpeed(video, shell);
        if (!nextSpeed) {
          return;
        }
        applyManagedVideoPlaybackSpeed(video, shell, nextSpeed);
        showManagedVideoFeedback(shell, formatManagedVideoPlaybackRateLabel(nextSpeed), "speed");
        sync();
      });
    }

    if (qualitySelect) {
      bind(qualitySelect, "change", (event) => {
        swallowManagedControlEvent(event);
        applyManagedVideoQuality(video, shell, qualitySelect.value, {
          triggerLoad: true,
          preservePlayback: true,
          qualitySelect
        });
        const selectedOption = qualitySelect.options[qualitySelect.selectedIndex];
        const label = selectedOption?.textContent?.trim() || qualitySelect.value;
        if (label) {
          showManagedVideoFeedback(shell, label, "quality");
        }
        sync();
      });
      syncManagedVideoQualityControl(shell, video, qualitySelect);
    }

    if (fullscreenButton) {
      bind(fullscreenButton, "click", (event) => {
        swallowManagedControlEvent(event);
        toggleManagedVideoFullscreen(shell);
        const icon = shell.getAttribute("data-rx-video-icon-fullscreen") || "Full";
        showManagedVideoFeedback(shell, icon, "fullscreen");
        sync();
      });
    }

    sync();
  });
}

function updateManagedVideoControlShell(shell, video) {
  if (!shell || !video) {
    return;
  }
  const customControlsEnabled = shell.getAttribute("data-rx-video-custom-controls") === "true";
  const toggleButton = shell.querySelector ? shell.querySelector("[data-rx-video-toggle]") : null;
  const muteButton = shell.querySelector ? shell.querySelector("[data-rx-video-mute]") : null;
  const fullscreenButton = shell.querySelector ? shell.querySelector("[data-rx-video-fullscreen]") : null;
  const skipBackButton = shell.querySelector ? shell.querySelector("[data-rx-video-skip-back-button]") : null;
  const skipForwardButton = shell.querySelector ? shell.querySelector("[data-rx-video-skip-forward-button]") : null;
  const speedButton = shell.querySelector ? shell.querySelector("[data-rx-video-speed]") : null;
  const qualitySelect = shell.querySelector ? shell.querySelector("[data-rx-video-quality]") : null;
  const seekInput = shell.querySelector ? shell.querySelector("[data-rx-video-seek]") : null;
  const volumeInput = shell.querySelector ? shell.querySelector("[data-rx-video-volume]") : null;
  const currentTimeLabel = shell.querySelector ? shell.querySelector("[data-rx-video-current]") : null;
  const durationLabel = shell.querySelector ? shell.querySelector("[data-rx-video-duration]") : null;
  if (
    customControlsEnabled
    && (!toggleButton || !muteButton || !fullscreenButton || !seekInput || !volumeInput || !currentTimeLabel || !durationLabel)
  ) {
    return;
  }

  const lazyPending = video.getAttribute("data-rx-lazy-video") === "true" && video.getAttribute("data-rx-lazy-ready") !== "true";
  const controlsLoadMode = resolveManagedVideoControlsLoad(shell);
  const controlsActivated = controlsLoadMode === "eager" || isManagedVideoControlsActivated(shell);
  if (controlsActivated) {
    shell.setAttribute("data-rx-video-controls-activated", "true");
  }
  const controlsReady = (!lazyPending && controlsActivated) ? "true" : "false";
  shell.setAttribute("data-rx-video-controls-ready", controlsReady);
  shell.setAttribute("data-resux-video-controls-ready", controlsReady);
  const iconsLoadMode = resolveManagedVideoIconsLoad(shell);
  const iconsReady = iconsLoadMode === "eager" || controlsActivated;
  if (iconsReady) {
    shell.setAttribute("data-rx-video-icons-ready", "true");
  }
  syncManagedVideoControlsHitArea(shell, customControlsEnabled);
  const videoState = resolveManagedVideoState(video);
  shell.setAttribute("data-rx-video-state", videoState);
  shell.setAttribute("data-resux-video", videoState);
  video.setAttribute("data-resux-video", videoState);

  if (customControlsEnabled && toggleButton && muteButton && fullscreenButton && seekInput && volumeInput && currentTimeLabel && durationLabel) {
    const iconPlay = shell.getAttribute("data-rx-video-icon-play") || "\u25b6";
    const iconPause = shell.getAttribute("data-rx-video-icon-pause") || "\u275a\u275a";
    const iconMute = shell.getAttribute("data-rx-video-icon-mute") || "\ud83d\udd07";
    const iconUnmute = shell.getAttribute("data-rx-video-icon-unmute") || "\ud83d\udd0a";
    const iconFullscreen = shell.getAttribute("data-rx-video-icon-fullscreen") || "\u26f6";
    const iconExitFullscreen = shell.getAttribute("data-rx-video-icon-exit-fullscreen") || "\ud83d\uddd7";
    const iconSkipBack = shell.getAttribute("data-rx-video-icon-skip-backward") || "\u23ea";
    const iconSkipForward = shell.getAttribute("data-rx-video-icon-skip-forward") || "\u23e9";
    const iconPlayFallback = shell.getAttribute("data-rx-video-icon-play-fallback") || "Play";
    const iconPauseFallback = shell.getAttribute("data-rx-video-icon-pause-fallback") || "Pause";
    const iconMuteFallback = shell.getAttribute("data-rx-video-icon-mute-fallback") || "Mute";
    const iconUnmuteFallback = shell.getAttribute("data-rx-video-icon-unmute-fallback") || "Sound";
    const iconFullscreenFallback = shell.getAttribute("data-rx-video-icon-fullscreen-fallback") || "Full";
    const iconExitFullscreenFallback = shell.getAttribute("data-rx-video-icon-exit-fullscreen-fallback") || "Exit";
    const iconSkipBackFallback = shell.getAttribute("data-rx-video-icon-skip-backward-fallback") || "Back";
    const iconSkipForwardFallback = shell.getAttribute("data-rx-video-icon-skip-forward-fallback") || "Fwd";
    const showVolume = shell.getAttribute("data-rx-video-show-volume") !== "false";
    const showProgress = shell.getAttribute("data-rx-video-show-progress") !== "false";
    const showTime = shell.getAttribute("data-rx-video-show-time") !== "false";
    const showFullscreen = shell.getAttribute("data-rx-video-show-fullscreen") !== "false";
    const showSkipControls = shell.getAttribute("data-rx-video-skip-controls") === "true";
    const skipBackwardSeconds = normalizeManagedVideoSkipSeconds(shell.getAttribute("data-rx-video-skip-backward"), 10);
    const skipForwardSeconds = normalizeManagedVideoSkipSeconds(shell.getAttribute("data-rx-video-skip-forward"), 10);

    toggleButton.textContent = video.paused
      ? (iconsReady ? iconPlay : iconPlayFallback)
      : (iconsReady ? iconPause : iconPauseFallback);
    toggleButton.setAttribute("aria-label", video.paused ? "Play video" : "Pause video");

    const muted = video.muted || video.volume <= 0.01;
    muteButton.hidden = !showVolume;
    volumeInput.hidden = !showVolume;
    muteButton.textContent = muted
      ? (iconsReady ? iconMute : iconMuteFallback)
      : (iconsReady ? iconUnmute : iconUnmuteFallback);
    muteButton.setAttribute("aria-label", muted ? "Unmute video" : "Mute video");

    const duration = Number(video.duration);
    const currentTime = Number(video.currentTime);
    const hasDuration = Number.isFinite(duration) && duration > 0;
    const safeCurrentTime = Number.isFinite(currentTime) ? currentTime : 0;
    seekInput.hidden = !showProgress;
    currentTimeLabel.hidden = !showTime;
    durationLabel.hidden = !showTime;
    seekInput.value = hasDuration ? String(Math.min(100, Math.max(0, (safeCurrentTime / duration) * 100))) : "0";
    currentTimeLabel.textContent = formatManagedMediaTime(safeCurrentTime);
    durationLabel.textContent = formatManagedMediaTime(hasDuration ? duration : 0);

    const volumeValue = Number.isFinite(video.volume) ? video.volume : 0;
    volumeInput.value = String(Math.min(1, Math.max(0, volumeValue)));

    const isFullscreen = Boolean(
      document.fullscreenElement && (document.fullscreenElement === shell || document.fullscreenElement.contains(shell))
    );
    fullscreenButton.hidden = !showFullscreen;
    fullscreenButton.textContent = isFullscreen
      ? (iconsReady ? iconExitFullscreen : iconExitFullscreenFallback)
      : (iconsReady ? iconFullscreen : iconFullscreenFallback);
    fullscreenButton.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen");

    if (skipBackButton) {
      const backwardLabel = Number.isInteger(skipBackwardSeconds)
        ? String(Math.trunc(skipBackwardSeconds)) + "s"
        : String(skipBackwardSeconds) + "s";
      skipBackButton.hidden = !showSkipControls;
      skipBackButton.textContent = iconsReady ? iconSkipBack : iconSkipBackFallback;
      skipBackButton.setAttribute("aria-label", "Skip backward " + backwardLabel);
    }
    if (skipForwardButton) {
      const forwardLabel = Number.isInteger(skipForwardSeconds)
        ? String(Math.trunc(skipForwardSeconds)) + "s"
        : String(skipForwardSeconds) + "s";
      skipForwardButton.hidden = !showSkipControls;
      skipForwardButton.textContent = iconsReady ? iconSkipForward : iconSkipForwardFallback;
      skipForwardButton.setAttribute("aria-label", "Skip forward " + forwardLabel);
    }
  }

  const speedControlEnabled = shell.getAttribute("data-rx-video-speed-control") === "true";
  if (speedButton) {
    const activeSpeed = ensureManagedVideoPlaybackSpeed(video, shell);
    const labelPrefix = shell.getAttribute("data-rx-video-speed-label") || "Speed";
    const showIcon = shell.getAttribute("data-rx-video-show-speed-icon") !== "false";
    const iconSpeed = shell.getAttribute("data-rx-video-icon-speed") || "\u00bb";
    const speedLabel = formatManagedVideoPlaybackRateLabel(activeSpeed);
    speedButton.hidden = !speedControlEnabled;
    speedButton.setAttribute("aria-label", labelPrefix + ": " + speedLabel);
    speedButton.textContent = ((showIcon && iconsReady) ? (iconSpeed + " ") : "") + speedLabel;
  }
  syncManagedVideoQualityControl(shell, video, qualitySelect);
}

function formatManagedMediaTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remaining = totalSeconds % 60;
  if (hours > 0) {
    return hours + ":" + String(minutes).padStart(2, "0") + ":" + String(remaining).padStart(2, "0");
  }
  return minutes + ":" + String(remaining).padStart(2, "0");
}

function normalizeManagedVideoSkipSeconds(value, fallback = 10) {
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

function ensureManagedVideoElementDefaultSpeed(video) {
  if (!video || video.getAttribute("data-rx-video-default-speed-applied") === "true") {
    return;
  }
  const defaultSpeed = normalizeManagedVideoPlaybackSpeed(
    video.getAttribute("data-rx-video-default-speed")
  );
  if (!defaultSpeed) {
    return;
  }
  video.playbackRate = defaultSpeed;
  if (Number.isFinite(video.defaultPlaybackRate)) {
    video.defaultPlaybackRate = defaultSpeed;
  }
  video.setAttribute("data-rx-video-default-speed-applied", "true");
  video.setAttribute("data-rx-video-active-speed", String(defaultSpeed));
}

function normalizeManagedVideoPlaybackSpeed(value) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.round(parsed * 100) / 100;
}

function readManagedVideoPlaybackSpeeds(shell) {
  const raw = shell?.getAttribute?.("data-rx-video-speeds") || "";
  const parsed = raw
    .split(",")
    .map((entry) => normalizeManagedVideoPlaybackSpeed(entry))
    .filter((entry) => Number.isFinite(entry));
  const uniqueSorted = [...new Set(parsed)].sort((left, right) => left - right);
  return uniqueSorted.length ? uniqueSorted : [0.5, 0.75, 1, 1.25, 1.5, 2];
}

function resolveManagedVideoDefaultSpeed(video, shell, speeds) {
  const fallback = speeds.includes(1) ? 1 : (speeds[0] || 1);
  const candidate = normalizeManagedVideoPlaybackSpeed(
    video.getAttribute("data-rx-video-default-speed")
    || shell.getAttribute("data-rx-video-default-speed")
  );
  if (!candidate) {
    return fallback;
  }
  if (speeds.includes(candidate)) {
    return candidate;
  }
  let nearest = speeds[0] || candidate;
  let nearestDelta = Math.abs(nearest - candidate);
  for (const speed of speeds) {
    const delta = Math.abs(speed - candidate);
    if (delta < nearestDelta) {
      nearest = speed;
      nearestDelta = delta;
    }
  }
  return nearest;
}

function resolveNearestManagedVideoSpeed(value, speeds) {
  const normalized = normalizeManagedVideoPlaybackSpeed(value);
  if (!normalized) {
    return speeds[0] || 1;
  }
  if (speeds.includes(normalized)) {
    return normalized;
  }
  let nearest = speeds[0] || normalized;
  let nearestDelta = Math.abs(nearest - normalized);
  for (const speed of speeds) {
    const delta = Math.abs(speed - normalized);
    if (delta < nearestDelta) {
      nearest = speed;
      nearestDelta = delta;
    }
  }
  return nearest;
}

function formatManagedVideoPlaybackRateLabel(value) {
  const normalized = normalizeManagedVideoPlaybackSpeed(value) || 1;
  const text = Number.isInteger(normalized) ? String(Math.trunc(normalized)) : String(normalized);
  return text + "x";
}

function managedVideoSpeedStorageKey(shell, video) {
  const explicit = shell?.getAttribute?.("data-rx-video-persist-speed-key")
    || video?.getAttribute?.("data-rx-video-persist-speed-key");
  if (typeof explicit === "string" && explicit.trim().length > 0) {
    return explicit.trim();
  }
  return "resux:video:playback-speed";
}

function readPersistedManagedVideoPlaybackSpeed(shell, video) {
  if (shell?.getAttribute?.("data-rx-video-persist-speed") !== "true" || typeof localStorage === "undefined") {
    return 0;
  }
  try {
    return normalizeManagedVideoPlaybackSpeed(localStorage.getItem(managedVideoSpeedStorageKey(shell, video))) || 0;
  } catch {
    return 0;
  }
}

function persistManagedVideoPlaybackSpeed(shell, video, speed) {
  if (shell?.getAttribute?.("data-rx-video-persist-speed") !== "true" || typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(managedVideoSpeedStorageKey(shell, video), String(speed));
  } catch {}
}

function applyManagedVideoPlaybackSpeed(video, shell, speed) {
  const normalized = normalizeManagedVideoPlaybackSpeed(speed);
  if (!normalized || !video) {
    return 0;
  }
  video.playbackRate = normalized;
  if (Number.isFinite(video.defaultPlaybackRate)) {
    video.defaultPlaybackRate = normalized;
  }
  if (shell && shell.setAttribute) {
    shell.setAttribute("data-rx-video-active-speed", String(normalized));
  }
  video.setAttribute("data-rx-video-active-speed", String(normalized));
  persistManagedVideoPlaybackSpeed(shell, video, normalized);
  return normalized;
}
`;
