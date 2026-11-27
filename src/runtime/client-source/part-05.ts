// Client runtime source, part 5 of 9. Concatenated by getClientRuntimeSource() in ../index.ts.
export const clientRuntimePart05 = String.raw`
function ensureManagedVideoPlaybackSpeed(video, shell) {
  const speeds = readManagedVideoPlaybackSpeeds(shell);
  const current = normalizeManagedVideoPlaybackSpeed(video.playbackRate);
  if (video.getAttribute("data-rx-video-speed-initialized") !== "true") {
    const persisted = readPersistedManagedVideoPlaybackSpeed(shell, video);
    const initial = persisted
      ? resolveNearestManagedVideoSpeed(persisted, speeds)
      : resolveManagedVideoDefaultSpeed(video, shell, speeds);
    video.setAttribute("data-rx-video-speed-initialized", "true");
    return applyManagedVideoPlaybackSpeed(video, shell, initial);
  }
  if (current && speeds.some((speed) => Math.abs(speed - current) < 0.001)) {
    if (shell && shell.setAttribute) {
      shell.setAttribute("data-rx-video-active-speed", String(current));
    }
    video.setAttribute("data-rx-video-active-speed", String(current));
    return current;
  }
  const next = current
    ? resolveNearestManagedVideoSpeed(current, speeds)
    : resolveManagedVideoDefaultSpeed(video, shell, speeds);
  return applyManagedVideoPlaybackSpeed(video, shell, next);
}

function nextManagedVideoPlaybackSpeed(video, shell) {
  const speedControlEnabled = shell?.getAttribute?.("data-rx-video-speed-control") === "true";
  if (!speedControlEnabled) {
    return 0;
  }
  const speeds = readManagedVideoPlaybackSpeeds(shell);
  if (!speeds.length) {
    return 0;
  }
  const current = ensureManagedVideoPlaybackSpeed(video, shell);
  if (!current) {
    return speeds[0];
  }
  const index = speeds.findIndex((speed) => Math.abs(speed - current) < 0.001);
  const nextIndex = index >= 0 ? (index + 1) % speeds.length : 0;
  return speeds[nextIndex];
}

function normalizeManagedVideoQualityId(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return undefined;
  }
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || undefined;
}

function parseManagedVideoQualityOptions(shell) {
  const raw = shell?.getAttribute?.("data-rx-video-qualities") || "";
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const resolved = [];
    const seenIds = new Set();
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        continue;
      }
      const id = normalizeManagedVideoQualityId(entry.id);
      if (!id || seenIds.has(id)) {
        continue;
      }
      const sources = Array.isArray(entry.sources)
        ? entry.sources
          .filter((item) => item && typeof item === "object" && !Array.isArray(item))
          .map((item) => ({
            src: typeof item.src === "string" ? item.src.trim() : "",
            type: typeof item.type === "string" ? item.type.trim() : ""
          }))
          .filter((item) => item.src.length > 0)
        : [];
      if (!sources.length) {
        continue;
      }
      seenIds.add(id);
      resolved.push({
        id,
        label: typeof entry.label === "string" && entry.label.trim().length > 0
          ? entry.label.trim()
          : id.toUpperCase(),
        sources
      });
    }
    return resolved;
  } catch {
    return [];
  }
}

function resolveManagedVideoDefaultQualityId(shell, options) {
  const configured = normalizeManagedVideoQualityId(shell?.getAttribute?.("data-rx-video-default-quality"));
  if (configured && options.some((entry) => entry.id === configured)) {
    return configured;
  }
  return options[0]?.id;
}

function signatureManagedVideoSources(sources) {
  return (Array.isArray(sources) ? sources : [])
    .map((entry) => {
      const type = entry?.type ? String(entry.type).trim() : "";
      return String(entry?.src || "") + (type ? "|" + type : "");
    })
    .join("||");
}

function applyManagedVideoLazyQualitySources(video, sources) {
  if (!video || !Array.isArray(sources) || sources.length === 0) {
    return;
  }
  const primary = sources[0]?.src || "";
  if (primary) {
    video.setAttribute("data-rx-lazy-src", primary);
    video.setAttribute("data-src", primary);
  }
  const sourceNodes = video.querySelectorAll ? Array.from(video.querySelectorAll("source")) : [];
  const ownerDocument = video.ownerDocument;
  for (let index = sourceNodes.length; index < sources.length; index++) {
    if (!ownerDocument || !ownerDocument.createElement) {
      break;
    }
    const node = ownerDocument.createElement("source");
    video.appendChild(node);
    sourceNodes.push(node);
  }
  for (let index = 0; index < sourceNodes.length; index++) {
    const node = sourceNodes[index];
    const source = sources[index];
    if (!source) {
      node.remove();
      continue;
    }
    node.removeAttribute("src");
    node.removeAttribute("data-rx-failed-src");
    node.setAttribute("data-rx-lazy-src", source.src);
    node.setAttribute("data-src", source.src);
    if (source.type) {
      node.setAttribute("type", source.type);
    } else {
      node.removeAttribute("type");
    }
  }
}

function applyManagedVideoQuality(video, shell, qualityId, options = {}) {
  if (!video || !shell) {
    return false;
  }
  const qualityOptions = parseManagedVideoQualityOptions(shell);
  if (!qualityOptions.length) {
    return false;
  }
  const normalizedId = normalizeManagedVideoQualityId(qualityId);
  const fallbackId = resolveManagedVideoDefaultQualityId(shell, qualityOptions);
  const target = qualityOptions.find((entry) => entry.id === normalizedId)
    || qualityOptions.find((entry) => entry.id === fallbackId)
    || qualityOptions[0];
  if (!target || !Array.isArray(target.sources) || target.sources.length === 0) {
    return false;
  }

  const targetId = target.id;
  const targetSignature = signatureManagedVideoSources(target.sources);
  const currentSignature = shell.getAttribute("data-rx-video-active-source-signature") || "";
  const previousQualityId = normalizeManagedVideoQualityId(
    video.getAttribute("data-rx-video-active-quality")
    || shell.getAttribute("data-rx-video-active-quality"),
  );
  const isLazyPending = video.getAttribute("data-rx-lazy-video") === "true"
    && video.getAttribute("data-rx-lazy-ready") !== "true";

  shell.setAttribute("data-rx-video-active-quality", targetId);
  video.setAttribute("data-rx-video-active-quality", targetId);
  if (options.qualitySelect && options.qualitySelect.value !== targetId) {
    options.qualitySelect.value = targetId;
  }

  if (isLazyPending) {
    shell.setAttribute("data-rx-video-active-source-signature", targetSignature);
    video.setAttribute("data-rx-video-active-source-signature", targetSignature);
    applyManagedVideoLazyQualitySources(video, target.sources);
    return true;
  }

  if (targetSignature === currentSignature) {
    return false;
  }
  const failedQuality = normalizeManagedVideoQualityId(video.getAttribute("data-rx-video-failed-quality"));
  if (failedQuality && failedQuality === targetId && video.getAttribute("data-resux-error-handled") === "true") {
    return false;
  }

  shell.setAttribute("data-rx-video-active-source-signature", targetSignature);
  video.setAttribute("data-rx-video-active-source-signature", targetSignature);
  video.setAttribute("data-rx-video-active-quality", targetId);
  video.removeAttribute("data-resux-error");
  video.removeAttribute("data-rx-error");
  video.removeAttribute("data-resux-error-handled");
  video.removeAttribute("data-rx-video-failed-quality");
  video.removeAttribute("data-rx-load-called");
  video.removeAttribute("data-rx-lazy-src");
  video.removeAttribute("data-src");
  video.removeAttribute("src");

  const sourceNodes = video.querySelectorAll ? Array.from(video.querySelectorAll("source")) : [];
  const ownerDocument = video.ownerDocument;
  for (let index = sourceNodes.length; index < target.sources.length; index++) {
    if (!ownerDocument || !ownerDocument.createElement) {
      break;
    }
    const node = ownerDocument.createElement("source");
    video.appendChild(node);
    sourceNodes.push(node);
  }

  for (let index = 0; index < sourceNodes.length; index++) {
    const node = sourceNodes[index];
    const source = target.sources[index];
    if (!source) {
      node.remove();
      continue;
    }
    node.setAttribute("src", source.src);
    node.removeAttribute("data-rx-lazy-src");
    node.removeAttribute("data-src");
    node.removeAttribute("data-rx-failed-src");
    if (source.type) {
      node.setAttribute("type", source.type);
    } else {
      node.removeAttribute("type");
    }
  }

  const preservePlayback = options.preservePlayback !== false;
  const wasPlaying = preservePlayback && !video.paused;
  const previousTime = preservePlayback && Number.isFinite(video.currentTime) && video.currentTime > 0
    ? Number(video.currentTime)
    : 0;
  const previousPlaybackRate = preservePlayback && Number.isFinite(video.playbackRate) && video.playbackRate > 0
    ? Number(video.playbackRate)
    : 0;
  const previousVolume = preservePlayback && Number.isFinite(video.volume)
    ? Number(video.volume)
    : undefined;
  const previousMuted = preservePlayback ? Boolean(video.muted) : undefined;

  video.setAttribute("data-rx-video-pending-quality", targetId);
  if (previousQualityId && previousQualityId !== targetId) {
    video.setAttribute("data-rx-video-previous-quality", previousQualityId);
  } else {
    video.removeAttribute("data-rx-video-previous-quality");
  }

  video.setAttribute("data-resux-loading", "true");
  video.setAttribute("data-resux-video-loading", "true");
  video.setAttribute("data-resux-video", "loading");
  video.setAttribute("data-rx-video-loading-src", target.sources[0].src);
  const restorePlayback = () => {
    if (previousPlaybackRate > 0) {
      video.playbackRate = previousPlaybackRate;
      if (Number.isFinite(video.defaultPlaybackRate)) {
        video.defaultPlaybackRate = previousPlaybackRate;
      }
    }
    if (previousVolume !== undefined) {
      video.volume = Math.min(1, Math.max(0, previousVolume));
    }
    if (previousMuted !== undefined) {
      video.muted = previousMuted;
    }
    if (previousTime > 0 && Number.isFinite(video.duration) && video.duration > 0) {
      video.currentTime = Math.min(video.duration, Math.max(0, previousTime));
    }
    if (wasPlaying) {
      attemptManagedVideoPlay(video);
    }
  };
  if (previousTime > 0 || wasPlaying) {
    video.addEventListener("loadedmetadata", restorePlayback, { once: true });
    video.addEventListener("canplay", restorePlayback, { once: true });
  }
  if (options.triggerLoad === false) {
    return true;
  }
  if (typeof video.load === "function") {
    try {
      video.load();
    } catch {
    }
  }
  return true;
}

function syncManagedVideoQualityControl(shell, video, qualitySelect) {
  if (!qualitySelect || !shell || !video) {
    return;
  }
  const qualityControlEnabled = shell.getAttribute("data-rx-video-quality-control") === "true";
  const options = qualityControlEnabled ? parseManagedVideoQualityOptions(shell) : [];
  const hasQualityOptions = qualityControlEnabled && options.length > 0;
  qualitySelect.hidden = !hasQualityOptions;
  if (!hasQualityOptions) {
    return;
  }
  const knownValues = new Set(Array.from(qualitySelect.options).map((entry) => entry.value));
  if (knownValues.size !== options.length || options.some((entry) => !knownValues.has(entry.id))) {
    qualitySelect.innerHTML = options
      .map((entry) => '<option value="' + escapeAttribute(entry.id) + '">' + escapeHtml(entry.label) + '</option>')
      .join("");
  }
  const active = normalizeManagedVideoQualityId(
    video.getAttribute("data-rx-video-active-quality")
    || shell.getAttribute("data-rx-video-active-quality")
    || resolveManagedVideoDefaultQualityId(shell, options)
  );
  if (active && qualitySelect.value !== active) {
    qualitySelect.value = active;
  }
}

function dispatchManagedEvent(target, name, detail = {}) {
  if (!target || typeof target.dispatchEvent !== "function") {
    return;
  }
  const view = target.ownerDocument?.defaultView ?? (typeof window !== "undefined" ? window : undefined);
  const CustomEventCtor = view && typeof view.CustomEvent === "function"
    ? view.CustomEvent
    : null;
  if (!CustomEventCtor) {
    return;
  }
  target.dispatchEvent(new CustomEventCtor(name, { bubbles: true, detail }));
}

function finalizeManagedImageReady(target) {
  if (!target) {
    return;
  }
  if (target.getAttribute("data-rx-lazy-pending") === "true") {
    target.removeAttribute("data-rx-lazy-pending");
    dispatchManagedEvent(target, "lazy-load-complete");
  }
  target.setAttribute("data-resux-loaded", "true");
  target.removeAttribute("data-resux-loading");
  target.removeAttribute("data-rx-image-decode-pending");
  target.setAttribute("data-resux-img", "loaded");
  clearManagedPlaceholderState(target);
}

function handleManagedMediaLoad(event) {
  const target = event && event.target;
  if (!target || !target.tagName) {
    return;
  }
  const tag = String(target.tagName).toLowerCase();
  if (tag !== "img") {
    return;
  }
  if (target.getAttribute("data-rx-lazy-image") === "true" && target.getAttribute("data-rx-lazy-ready") !== "true") {
    return;
  }
  if (target.getAttribute("data-rx-image-decode-pending") === "true") {
    return;
  }
  if (typeof target.decode === "function") {
    target.setAttribute("data-rx-image-decode-pending", "true");
    let decoded = false;
    const timeout = setTimeout(() => {
      if (!decoded) {
        finalizeManagedImageReady(target);
      }
    }, 250);
    target.decode()
      .then(() => {
        decoded = true;
        clearTimeout(timeout);
        finalizeManagedImageReady(target);
      })
      .catch(() => {
        decoded = true;
        clearTimeout(timeout);
        finalizeManagedImageReady(target);
      });
    return;
  }
  finalizeManagedImageReady(target);
}

function handleManagedVideoReady(event) {
  const target = event && event.target;
  if (!target || !target.tagName || String(target.tagName).toLowerCase() !== "video") {
    return;
  }

  ensureManagedVideoElementDefaultSpeed(target);

  if ((event.type === "loadedmetadata" || event.type === "canplay") && shouldAutoplayManagedVideo(target)) {
    attemptManagedVideoPlay(target);
  }
  if (event.type !== "loadedmetadata" && event.type !== "loadeddata" && event.type !== "canplay") {
    return;
  }
  if (target.getAttribute("data-rx-lazy-pending") === "true") {
    target.removeAttribute("data-rx-lazy-pending");
    dispatchManagedEvent(target, "lazy-load-complete");
  }
  target.setAttribute("data-resux-loaded", "true");
  target.removeAttribute("data-resux-loading");
  target.removeAttribute("data-resux-video-loading");
  target.removeAttribute("data-rx-video-loading-src");
  target.removeAttribute("data-rx-video-pending-quality");
  target.removeAttribute("data-rx-video-previous-quality");
  logManagedMediaDebug("video-ready", {
    type: event.type,
    src: getCurrentVideoUrl(target)
  });
  clearManagedPlaceholderState(target);
  if (target.getAttribute("data-rx-placeholder-src")) {
    const realPoster = target.getAttribute("data-rx-poster");
    if (realPoster) {
      target.setAttribute("poster", realPoster);
    } else {
      target.removeAttribute("poster");
    }
  }
  target.setAttribute("data-resux-video", resolveManagedVideoState(target));
}

function handleManagedVideoPlaybackState(event) {
  const target = event && event.target;
  if (!target || !target.tagName || String(target.tagName).toLowerCase() !== "video") {
    return;
  }
  target.setAttribute("data-resux-video", resolveManagedVideoState(target));
}

function handleManagedMediaError(event) {
  const target = event && event.target;
  if (!target || !target.tagName) {
    return;
  }
  const tag = String(target.tagName).toLowerCase();
  if (tag !== "img" && tag !== "source" && tag !== "video") {
    return;
  }
  const delegatedErrorTarget = target.closest
    ? target.closest("[data-rx-on-error]")
    : null;
  if (!delegatedErrorTarget) {
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    } else if (typeof event.stopPropagation === "function") {
      event.stopPropagation();
    }
  }
  try {
    if (tag === "img") {
      handleManagedImageError(target);
      return;
    }

    if (tag === "source") {
      const parentVideo = target.parentElement && String(target.parentElement.tagName || "").toLowerCase() === "video"
        ? target.parentElement
        : null;
      if (parentVideo) {
        markFailedMediaSource(parentVideo, target.getAttribute("src") || target.getAttribute("data-rx-lazy-src") || "");
      }
      return;
    }

    if (tag === "video") {
      handleManagedVideoError(target);
    }
  } catch {
  }
}

function handleManagedImageError(target) {
  if (!isManagedMediaConnected(target)) {
    return;
  }
  if (target.getAttribute("data-rx-lazy-image") === "true" && target.getAttribute("data-rx-lazy-ready") !== "true") {
    return;
  }

  unobserveLazyImage(target);
  const failedSrc = getCurrentMediaUrl(target) || target.getAttribute("data-rx-lazy-src") || "";
  markFailedMediaSource(target, failedSrc);
  target.setAttribute("data-resux-revealed", "true");
  target.setAttribute("data-resux-error", "true");
  target.setAttribute("data-rx-error", "true");
  target.setAttribute("data-resux-img", "error");
  target.removeAttribute("data-resux-loading");
  target.removeAttribute("data-rx-image-decode-pending");
  disablePictureSources(target);

  const fallbackSrc = target.getAttribute("data-rx-fallback-src");
  if (target.getAttribute("data-resux-error-handled") === "true") {
    if (
      target.getAttribute("data-rx-fallback-active") === "true"
      && fallbackSrc
      && mediaUrlsEqual(failedSrc, fallbackSrc, target)
    ) {
      showManagedImagePlaceholder(target, failedSrc);
    }
    return;
  }

  if (fallbackSrc && shouldAssignMediaSource(target, fallbackSrc)) {
    markMediaErrorHandled(target);
    target.setAttribute("data-rx-fallback-used", "true");
    target.setAttribute("data-rx-fallback-active", "true");
    target.setAttribute("data-resux-fallback-active", "true");
    target.removeAttribute("srcset");
    target.removeAttribute("sizes");
    target.removeAttribute("data-rx-lazy-srcset");
    target.removeAttribute("data-rx-lazy-sizes");
    target.setAttribute("src", fallbackSrc);
    return;
  }

  markMediaErrorHandled(target);
  showManagedImagePlaceholder(target, failedSrc);
}

function applyKnownImageFailure(target, failedSrc) {
  markFailedMediaSource(target, failedSrc);
  target.setAttribute("data-resux-revealed", "true");
  target.setAttribute("data-resux-error", "true");
  target.setAttribute("data-rx-error", "true");
  target.setAttribute("data-resux-img", "error");
  target.removeAttribute("data-resux-loading");
  target.removeAttribute("data-rx-image-decode-pending");
  disablePictureSources(target);
  const fallbackSrc = target.getAttribute("data-rx-fallback-src");
  markMediaErrorHandled(target);
  if (fallbackSrc && shouldAssignMediaSource(target, fallbackSrc)) {
    target.setAttribute("data-rx-fallback-used", "true");
    target.setAttribute("data-rx-fallback-active", "true");
    target.setAttribute("data-resux-fallback-active", "true");
    target.removeAttribute("srcset");
    target.removeAttribute("sizes");
    target.setAttribute("src", fallbackSrc);
    return;
  }
  showManagedImagePlaceholder(target, failedSrc);
}

function handleManagedVideoError(video) {
  if (!isManagedMediaConnected(video)) {
    return;
  }

  const failedSrc = getCurrentVideoUrl(video);
  const pendingQuality = normalizeManagedVideoQualityId(video.getAttribute("data-rx-video-pending-quality"));
  const previousQuality = normalizeManagedVideoQualityId(video.getAttribute("data-rx-video-previous-quality"));
  logManagedMediaDebug("video-error", { failedSrc });
  markFailedMediaSource(video, failedSrc);
  if (pendingQuality) {
    video.setAttribute("data-rx-video-failed-quality", pendingQuality);
  }
  if (pendingQuality && previousQuality && pendingQuality !== previousQuality) {
    const shell = video.closest ? video.closest('[data-rx-video-shell="true"]') : null;
    if (shell) {
      const qualitySelect = shell.querySelector ? shell.querySelector("[data-rx-video-quality]") : null;
      const reverted = applyManagedVideoQuality(video, shell, previousQuality, {
        triggerLoad: true,
        preservePlayback: true,
        qualitySelect,
      });
      if (reverted) {
        showManagedVideoFeedback(shell, previousQuality.toUpperCase(), "quality");
        return;
      }
    }
  }
  video.setAttribute("data-resux-revealed", "true");
  video.setAttribute("data-resux-error", "true");
  video.setAttribute("data-rx-error", "true");
  video.setAttribute("data-resux-video", "error");
  video.removeAttribute("data-resux-loading");
  video.removeAttribute("data-resux-video-loading");
  video.removeAttribute("data-rx-video-loading-src");
  video.removeAttribute("data-rx-video-pending-quality");
  video.removeAttribute("data-rx-video-previous-quality");
  video.removeAttribute("data-rx-lazy-video");
  video.setAttribute("data-rx-lazy-ready", "true");

  unobserveLazyVideo(video);
  if (video.getAttribute("data-resux-error-handled") === "true") {
    return;
  }

  markMediaErrorHandled(video);
  clearManagedVideoSources(video);
  applyVideoPosterFallback(video, failedSrc);
}

function applyKnownVideoFailure(video, failedSrc) {
  logManagedMediaDebug("video-known-failure", { failedSrc });
  markFailedMediaSource(video, failedSrc);
  const pendingQuality = normalizeManagedVideoQualityId(video.getAttribute("data-rx-video-pending-quality"));
  if (pendingQuality) {
    video.setAttribute("data-rx-video-failed-quality", pendingQuality);
  }
  video.setAttribute("data-resux-revealed", "true");
  video.setAttribute("data-resux-error", "true");
  video.setAttribute("data-rx-error", "true");
  video.setAttribute("data-resux-video", "error");
  video.removeAttribute("data-resux-loading");
  video.removeAttribute("data-resux-video-loading");
  video.removeAttribute("data-rx-video-loading-src");
  video.removeAttribute("data-rx-video-pending-quality");
  video.removeAttribute("data-rx-video-previous-quality");
  video.removeAttribute("data-rx-lazy-video");
  video.setAttribute("data-rx-lazy-ready", "true");
  markMediaErrorHandled(video);
  clearManagedVideoSources(video);
  applyVideoPosterFallback(video, failedSrc);
}

function applyVideoPosterFallback(video, failedSrc) {
  const fallbackPoster = video.getAttribute("data-rx-fallback-poster");
  if (fallbackPoster && !mediaUrlsEqual(video.getAttribute("poster") || "", fallbackPoster, video)) {
    video.setAttribute("poster", fallbackPoster);
    video.setAttribute("data-rx-fallback-active", "true");
    video.setAttribute("data-resux-fallback-active", "true");
    return;
  }

  const placeholder = video.getAttribute("data-rx-placeholder-src");
  if (placeholder && !mediaUrlsEqual(placeholder, failedSrc, video)) {
    video.setAttribute("poster", placeholder);
    video.setAttribute("data-rx-placeholder-active", "true");
    video.setAttribute("data-resux-placeholder-active", "true");
  }
}

function showManagedImagePlaceholder(target, failedSrc) {
  const placeholder = target.getAttribute("data-rx-placeholder-src");
  if (placeholder && shouldAssignMediaSource(target, placeholder) && !mediaUrlsEqual(placeholder, failedSrc, target)) {
    target.removeAttribute("srcset");
    target.removeAttribute("sizes");
    target.setAttribute("src", placeholder);
    target.setAttribute("data-rx-placeholder-active", "true");
    target.setAttribute("data-resux-placeholder-active", "true");
    return;
  }
  target.setAttribute("data-rx-placeholder-active", "true");
  target.setAttribute("data-resux-placeholder-active", "true");
}

function disablePictureSources(image) {
  const picture = image.closest ? image.closest("picture") : null;
  if (!picture || !picture.querySelectorAll) {
    return;
  }
  picture.setAttribute("data-resux-error", "true");
  picture.querySelectorAll("source").forEach((source) => {
    const srcset = source.getAttribute("srcset") || source.getAttribute("data-rx-lazy-srcset");
    if (srcset) {
      source.setAttribute("data-rx-failed-srcset", srcset);
    }
    source.removeAttribute("srcset");
    source.removeAttribute("sizes");
    source.removeAttribute("data-rx-lazy-srcset");
    source.removeAttribute("data-rx-lazy-sizes");
    source.removeAttribute("data-srcset");
  });
}

function clearManagedVideoSources(video) {
  if (typeof video.pause === "function") {
    try {
      video.pause();
    } catch {}
  }
  video.removeAttribute("src");
  video.removeAttribute("data-rx-lazy-src");
  video.removeAttribute("data-src");
  if (video.querySelectorAll) {
    video.querySelectorAll("source").forEach((source) => {
      const src = source.getAttribute("src") || source.getAttribute("data-rx-lazy-src");
      if (src) {
        source.setAttribute("data-rx-failed-src", src);
      }
      source.removeAttribute("src");
      source.removeAttribute("data-rx-lazy-src");
      source.removeAttribute("data-src");
    });
  }
}

function clearManagedPlaceholderState(target) {
  clearManagedPlaceholderStyle(target);
  const placeholderClass = target.getAttribute("data-rx-placeholder-class");
  if (placeholderClass && target.classList) {
    for (const token of placeholderClass.split(/\s+/).filter(Boolean)) {
      target.classList.remove(token);
    }
  }
  target.removeAttribute("data-rx-placeholder-active");
  target.removeAttribute("data-resux-placeholder-active");
}

function clearManagedPlaceholderStyle(target) {
  const style = target && target.getAttribute ? target.getAttribute("style") : "";
  if (!style) {
    return;
  }
  const placeholderStyle = target.getAttribute("data-rx-placeholder-style") || "";
  const nextStyle = style
    .replace(/background-image\s*:[^;]+;?/gi, "")
    .replace(/background-size\s*:[^;]+;?/gi, "")
    .replace(/background-position\s*:[^;]+;?/gi, "")
    .replace(/background-repeat\s*:[^;]+;?/gi, "")
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry && !placeholderStyle.split(";").map((item) => item.trim()).filter(Boolean).includes(entry))
    .join("; ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/;+$/g, "");
  if (!nextStyle) {
    target.removeAttribute("style");
    return;
  }
  target.setAttribute("style", nextStyle);
}

function shouldAssignMediaSource(target, nextSrc) {
  if (!nextSrc || mediaSourceWasFailed(target, nextSrc)) {
    return false;
  }
  const current = getCurrentMediaUrl(target);
  if (current && mediaUrlsEqual(current, nextSrc, target)) {
    return false;
  }
  const attrSrc = target.getAttribute ? target.getAttribute("src") : "";
  if (attrSrc && mediaUrlsEqual(attrSrc, nextSrc, target)) {
    return false;
  }
  return true;
}

function getCurrentMediaUrl(target) {
  return String(target?.currentSrc || target?.getAttribute?.("src") || "");
}

function getCurrentVideoUrl(video) {
  const direct = String(video?.currentSrc || video?.getAttribute?.("src") || "");
  if (direct) {
    return direct;
  }
  const source = video?.querySelector ? video.querySelector("source[src], source[data-rx-lazy-src]") : null;
  return String(source?.getAttribute("src") || source?.getAttribute("data-rx-lazy-src") || "");
}

function markFailedMediaSource(target, src) {
  if (!target || !src) {
    return;
  }
  target.setAttribute("data-rx-failed-src", src);
  target.setAttribute("data-resux-failed-src", src);
  for (const candidate of mediaSourceCandidates(src)) {
    const normalized = normalizeMediaUrl(candidate, target);
    if (normalized) {
      failedMediaSources.add(normalized);
    }
  }
}

function markMediaErrorHandled(target) {
  target.setAttribute("data-rx-error-handled", "true");
  target.setAttribute("data-resux-error-handled", "true");
}

function mediaSourceWasFailed(target, src) {
  const failed = target?.getAttribute?.("data-rx-failed-src") || target?.getAttribute?.("data-resux-failed-src") || "";
  if (failed && src && mediaUrlsEqual(failed, src, target)) {
    return true;
  }
  return mediaSourceCandidates(src).some((candidate) => {
    const normalized = normalizeMediaUrl(candidate, target);
    return Boolean(normalized && failedMediaSources.has(normalized));
  });
}

function mediaSourceCandidates(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return [];
  }
  if (!raw.includes(",")) {
    return [raw.split(/\s+/)[0]].filter(Boolean);
  }
  return raw
    .split(",")
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function mediaUrlsEqual(left, right, target) {
  const normalizedLeft = normalizeMediaUrl(left, target);
  const normalizedRight = normalizeMediaUrl(right, target);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function normalizeMediaUrl(value, target) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  try {
    const view = target?.ownerDocument?.defaultView || (typeof window !== "undefined" ? window : null);
    const base = view?.location?.href || (typeof location !== "undefined" ? location.href : "http://localhost/");
    return new URL(raw, base).href;
  } catch {
    return raw;
  }
}

function isManagedMediaConnected(target) {
  if (!target) {
    return false;
  }
  if (target.isConnected === true) {
    return true;
  }
  const root = target.ownerDocument && target.ownerDocument.documentElement;
  return Boolean(root && root.contains && root.contains(target));
}

function unobserveLazyImage(image) {
  const observer = lazyImageObserverByElement.get(image);
  if (observer) {
    observer.unobserve(image);
  }
  observedLazyImages.delete(image);
  lazyImageObserverByElement.delete(image);
  image.removeAttribute("data-rx-lazy-observed");
  image.removeAttribute("data-resux-observed");
}

function unobserveLazyVideo(video) {
  const observer = lazyVideoObserverByElement.get(video);
  if (observer) {
    observer.unobserve(video);
  }
  observedLazyVideos.delete(video);
  lazyVideoObserverByElement.delete(video);
  video.removeAttribute("data-rx-lazy-observed");
  video.removeAttribute("data-resux-observed");
}

function cleanupDetachedLazyMedia() {
  for (const image of Array.from(observedLazyImages)) {
    if (!isManagedMediaConnected(image)) {
      unobserveLazyImage(image);
    }
  }
  for (const video of Array.from(observedLazyVideos)) {
    if (!isManagedMediaConnected(video)) {
      unobserveLazyVideo(video);
    }
  }
  for (const shell of Array.from(managedVideoControlShells)) {
    if (!shell || !shell.isConnected) {
      const cleanup = managedVideoControlCleanupByShell.get(shell);
      if (typeof cleanup === "function") {
        try {
          cleanup();
        } catch {}
      }
      managedVideoControlCleanupByShell.delete(shell);
      managedVideoControlShells.delete(shell);
      managedVideoControlSyncByShell.delete(shell);
    }
  }
}

function dispatchPageReadyEvent(root) {
  const target = root && typeof root.dispatchEvent === "function" ? root : document;
  dispatchManagedEvent(target, "resux:page-ready", { root });
  dispatchManagedEvent(target, "resux:page:finish", { root });
}

function createAsyncDataResource(value, pending = false, error = null) {
  const data = ref(value);
  let completion = Promise.resolve();
  const resource = {
    data,
    value: data,
    pending: ref(pending),
    error: ref(error),
    then(onfulfilled, onrejected) {
      return completion.then(() => {
        const resolved = {
          data: resource.data,
          value: resource.value,
          pending: resource.pending,
          error: resource.error
        };
        return onfulfilled ? onfulfilled(resolved) : resolved;
      }, onrejected);
    },
    setCompletion(nextCompletion) {
      completion = nextCompletion;
    }
  };

  return resource;
}

async function settleAsyncDataResource(resource, handler, key, signal) {
  try {
    const value = await handler({ signal });
    assertJsonSerializable(value, 'useAsyncData("' + key + '")');
    resource.data.value = value;
    resource.error.value = null;
  } catch (error) {
    resource.data.value = undefined;
    resource.error.value = normalizeAsyncDataError(error);
  } finally {
    resource.pending.value = false;
  }
}

function serializeAsyncData(refs) {
  const output = Object.create(null);
  for (const [key, ref] of Object.entries(refs)) {
    output[key] = {
      value: ref.data.value === undefined ? null : ref.data.value,
      pending: ref.pending.value,
      error: ref.error.value
    };
  }
  return output;
}

function setRouteLoading(active) {
  setRouteTransition(active ? "fetching" : "idle");
}

function setRouteTransition(state,options={}){
  const loader=getRouteTransitionIndicator(),root=document.getElementById("__resux");
  if(!loader)return;
  if(state==="start")routeTransitionStartedAt=Date.now();
  const config=readRouteTransitionConfig(loader);
  if(routeTransitionHideTimer){clearTimeout(routeTransitionHideTimer);routeTransitionHideTimer=0}
  const progress=transitionProgress(state,options.progress,config.duration),message=options.message??transitionMessage(state);
  updateRouteTransitionUi(loader,state,progress,message);
  const active=state==="start"||state==="fetching"||state==="swapping";
  if(active){showRouteTransition(loader,config.throttle,false);startRouteTransitionProgressTimer(loader,config.duration)}else stopRouteTransitionProgressTimer();
  if(root){
    if(state==="idle"||state==="complete"||state==="error"){root.removeAttribute("aria-busy");root.removeAttribute("data-route-transition")}
    else{root.setAttribute("aria-busy","true");root.setAttribute("data-route-transition","loading")}
  }
  dispatchRouteTransition(state,options);
  if(state==="idle"||state==="complete"||state==="error"){
    const delay=state==="complete"?160:state==="error"?640:0;
    routeTransitionHideTimer=setTimeout(()=>hideRouteTransition(loader),delay);
  }
}
function getRouteTransitionIndicator(){
  if(routeTransitionIndicator?.isConnected)return routeTransitionIndicator;
  return routeTransitionIndicator=document.querySelector("[data-rx-loading-indicator]")||createFallbackRouteTransitionIndicator();
}
function createFallbackRouteTransitionIndicator(){
  if(!document.body)return null;
  const el=document.createElement("div");
  for(const [name,value] of [["data-rx-loading-indicator","true"],["hidden",""],["data-state","idle"],["aria-live","polite"],["aria-busy","false"],["data-duration","2000"],["data-throttle","200"],["style","--resux-loader-height: 3px; --resux-loader-color: #2563eb; --resux-loader-error-color: #dc2626;"]])el.setAttribute(name,value);
  el.innerHTML='<div class="rx-loading-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Idle"><span class="rx-loading-progress"></span></div>';
  document.body.appendChild(el);return el;
}
function readRouteTransitionConfig(loader){return{duration:readPositiveInt(loader?.dataset?.duration,2000,1),throttle:readPositiveInt(loader?.dataset?.throttle,200,0)}}
function readPositiveInt(value,fallback,min){const n=Number.parseInt(String(value??""),10);return Number.isFinite(n)?Math.max(min,n):fallback}
function showRouteTransition(loader,throttle,force){
  if(!loader||routeTransitionShowTimer&&!force)return;
  if(routeTransitionShowTimer){clearTimeout(routeTransitionShowTimer);routeTransitionShowTimer=0}
  if(force||throttle<=0||routeTransitionVisible){loader.hidden=false;routeTransitionVisible=true;return}
  routeTransitionShowTimer=setTimeout(()=>{loader.hidden=false;routeTransitionVisible=true;routeTransitionShowTimer=0},throttle);
}
function hideRouteTransition(loader){
  if(!loader)return;stopRouteTransitionProgressTimer();
  if(routeTransitionShowTimer){clearTimeout(routeTransitionShowTimer);routeTransitionShowTimer=0}
  loader.hidden=true;routeTransitionVisible=false;updateRouteTransitionUi(loader,"idle",0,"Idle");
}
function startRouteTransitionProgressTimer(loader,duration){
  if(routeTransitionProgressTimer)clearInterval(routeTransitionProgressTimer);
  routeTransitionProgressTimer=setInterval(()=>{
    if(!loader||loader.hidden)return;
    const state=loader.dataset?.state??"idle";
    if(state==="idle"||state==="complete"||state==="error")return;
    updateRouteTransitionUi(loader,state,transitionProgress(state,undefined,duration),transitionMessage(state));
  },120);
}
function stopRouteTransitionProgressTimer(){if(routeTransitionProgressTimer){clearInterval(routeTransitionProgressTimer);routeTransitionProgressTimer=0}}
function updateRouteTransitionUi(loader,state,progress,message){
  if(!loader)return;
  loader.dataset.state=state;loader.style.setProperty("--resux-progress",progress+"%");
  loader.style.setProperty("--resux-progress-scale", String(progress / 100));
  loader.setAttribute("aria-busy",state==="idle"||state==="complete"||state==="error"?"false":"true");
  const bar=loader.querySelector("[role='progressbar']");
  if(bar){bar.setAttribute("aria-valuenow",String(progress));bar.setAttribute("aria-valuetext",message)}
}
function transitionProgress(state,explicitProgress,duration=2000){
  if(typeof explicitProgress==="number")return clampProgress(explicitProgress);
  if(state==="idle")return 0;
  if(state==="complete"||state==="error")return 100;
  const estimated=defaultEstimatedProgress(duration,Math.max(0,Date.now()-routeTransitionStartedAt));
  if(state==="start")return Math.max(8,Math.min(32,estimated));
  if(state==="fetching")return Math.max(18,Math.min(88,estimated));
  return Math.max(72,Math.min(97,estimated));
}
function defaultEstimatedProgress(duration,elapsed){return clampProgress((2/Math.PI*100)*Math.atan((elapsed/Math.max(1,duration))*2))}
function clampProgress(value){return Math.max(0,Math.min(100,Math.round(value)))}
function transitionMessage(state){
  if(state==="start"||state==="fetching"||state==="swapping")return "Loading";
  if(state==="complete")return "Done";
  if(state==="error")return "Failed";
  return "Ready";
}
function dispatchRouteTransition(state,detail={}){
  if(typeof window==="undefined"||typeof window.CustomEvent!=="function")return;
  window.dispatchEvent(new window.CustomEvent("resux:route-transition",{detail:{state,path:detail.path,message:detail.message??transitionMessage(state),progress:transitionProgress(state,detail.progress)}}));
}

function isManagedMediaDebugEnabled(){
  if(typeof window==="undefined"||typeof location==="undefined")return false;
  const host=String(location.hostname||"").toLowerCase();
  if(host!=="localhost"&&host!=="127.0.0.1"&&host!=="::1")return false;
  if(window.__RESUX_MEDIA_DEBUG__===true)return true;
  try{return window.localStorage?.getItem("resux:media-debug")==="1"}catch{return false}
}
function logManagedMediaDebug(eventName,detail={}){if(isManagedMediaDebugEnabled()&&typeof console!=="undefined"&&typeof console.debug==="function")console.debug("[resux:media]",eventName,detail)}
function warnManagedMediaDebug(eventName,detail={}){if(isManagedMediaDebugEnabled()&&typeof console!=="undefined"&&typeof console.warn==="function")console.warn("[resux:media]",eventName,detail)}
function handleNavigationClick(event){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return false;
  const anchor=event.target?.closest?.("a[href]");
  if(!anchor)return false;
  const actionTarget=event.target?.closest?.("[data-rx-on-click]");
  if(actionTarget&&readEventModifiers(actionTarget,"click").includes("prevent"))return false;
  const resolution=resolveSameOriginAnchorTarget(anchor),target=resolution.url;
  if(!target){logManagedMediaDebug("router-ignore",{reason:resolution.reason,href:anchor.getAttribute("href")||""});return false}
  if(isManagedMediaAssetPath(target.pathname)){
    if(shouldBlockManagedMediaLinkNavigation(anchor,event.target)){warnManagedMediaDebug("router-block-media-navigation",{href:target.href});event.preventDefault();return true}
    logManagedMediaDebug("router-ignore",{reason:"media-static-path",href:target.href});return false;
  }
  if(!isRouterManagedPagePath(target.pathname)){logManagedMediaDebug("router-ignore",{reason:"non-page-route",href:target.href});return false}
  if(shouldIgnoreNavigationTarget(event.target,anchor)){logManagedMediaDebug("router-ignore",{reason:"ignored-event-target",href:target.href});return false}
  const nextPath=target.pathname+target.search,currentPath=location.pathname+location.search;
  if(nextPath===currentPath){
    if(!target.hash||target.hash===location.hash){event.preventDefault();return true}
    return false;
  }
  const vtAttr = anchor.getAttribute("data-view-transition") ?? anchor.getAttribute("view-transition");
  const viewTransition = vtAttr !== null ? vtAttr !== "false" : undefined;
  event.preventDefault();logManagedMediaDebug("router-navigation-start",{href:target.href,nextPath});
  void navigateTo(nextPath + target.hash, { ...(viewTransition !== undefined ? { viewTransition } : {}) });
  return true;
}
function shouldIgnoreNavigationTarget(eventTarget,anchor){
  const ignored=eventTarget?.closest?.(ROUTER_IGNORED_EVENT_TARGET_SELECTOR);
  return !!ignored&&ignored!==anchor;
}
function isViewTransitionSupported(){return typeof document!=="undefined"&&typeof document.startViewTransition==="function"}
function prefersReducedMotion(){return typeof window!=="undefined"&&typeof window.matchMedia==="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches===true}
function shouldPerformViewTransition(options,nextMeta,prevMeta,routerConfig){
  if(options?.viewTransition!==undefined)return Boolean(options.viewTransition);
  if(nextMeta?.viewTransition!==undefined)return Boolean(nextMeta.viewTransition);
  if(prevMeta?.viewTransition!==undefined)return Boolean(prevMeta.viewTransition);
  return Boolean(routerConfig?.viewTransition);
}
async function executeViewTransition(domSwapFn){
  if(!isViewTransitionSupported()||prefersReducedMotion()){await domSwapFn();return}
  let callbackRan=false,callbackRejected=false,callbackError=null;
  try{
    const transition=document.startViewTransition(async()=>{
      callbackRan=true;
      try{await domSwapFn()}catch(err){callbackRejected=true;callbackError=err;throw err}
    });
    if(transition&&typeof transition.updateCallbackDone?.catch==="function")transition.updateCallbackDone.catch(()=>{});
    await transition.finished;
  }catch{
    if(callbackRejected)throw callbackError;
    if(!callbackRan)await domSwapFn();
  }
}
function useViewTransition(){
  return{get isSupported(){return isViewTransitionSupported()},async start(updateCallback){await executeViewTransition(updateCallback)}};
}
function shouldBlockManagedMediaLinkNavigation(anchor,eventTarget){
  if(!anchor||!eventTarget||typeof location==="undefined"||anchor.getAttribute("data-rx-allow-media-navigation")==="true")return false;
  const media=eventTarget.closest?.(MEDIA_NAVIGATION_BLOCK_TARGET_SELECTOR);
  if(!media||media===anchor||!anchor.contains(media))return false;
  const target=resolveSameOriginAnchorTarget(anchor);
  return !!(target.url&&isManagedMediaAssetPath(target.url.pathname));
}
function resolveSameOriginAnchorTarget(anchor){
  if(!anchor||typeof location==="undefined")return{url:null,reason:"missing-anchor"};
  if(anchor.target||anchor.hasAttribute("target"))return{url:null,reason:"target-attr"};
  if(anchor.hasAttribute("download"))return{url:null,reason:"download-attr"};
  const href=String(anchor.getAttribute("href")||"").trim();
  if(!href)return{url:null,reason:"empty-href"};
  if(href==="#"||href.startsWith("#"))return{url:null,reason:"hash-only"};
  if(MEDIA_URL_SCHEME_RE.test(href))return{url:null,reason:"scheme"};
  let target;
  try{target=new URL(href,location.href)}catch{return{url:null,reason:"invalid-href"}}
  return target.origin===location.origin?{url:target,reason:null}:{url:null,reason:"external-origin"};
}
function isManagedMediaAssetPath(pathname){
  const p=String(pathname||"").toLowerCase();
  return !!p&&(p.startsWith("/__resux/image")||p.startsWith("/__resux/video")||p.startsWith("/_resux/generated/images/")||p.startsWith("/_resux/generated/videos/")||p.startsWith("/media-test/videos/")||p.startsWith("/media-test/images/")||MEDIA_STATIC_EXTENSION_RE.test(p));
}

async function navigateTo(target,options={}){
  const nextUrl=new URL(target,location.href),routePath=normalizeRoutePayloadKey(nextUrl.pathname+nextUrl.search);
  if(!isRouterManagedPagePath(nextUrl.pathname)){location.assign(nextUrl.href);return}
  if(isManagedMediaAssetPath(nextUrl.pathname)){warnManagedMediaDebug("router-navigation-blocked-media-path",{routePath,href:nextUrl.href});return}
  const currentUrl=new URL(location.href),currentRoutePath=currentUrl.pathname+currentUrl.search;
  if(!options.force&&routePath===currentRoutePath&&nextUrl.hash===currentUrl.hash)return;
  logManagedMediaDebug("router-navigation-start",{routePath,hash:nextUrl.hash,replace:options.replace===true});
  const transitionToken=++routeTransitionToken;
  routeStyleNavigationController?.abort();
  const styleController=typeof AbortController==="function"?new AbortController():null;
  routeStyleNavigationController=styleController;
  let completed=false;
  abortPendingAsyncData();setRouteTransition("start",{path:routePath});
  try{
    setRouteTransition("fetching",{path:routePath});
    const result=await loadRoute(routePath,{reason:"navigation",force:options.force===true});
    if(!ensureRoutePayloadBuildCompatibility(result)||transitionToken!==routeTransitionToken)return;
    if(result.redirect){await navigateTo(result.redirect,{replace:true});return}
    const nextPayload=result.payload;
    if(!nextPayload)throw new Error("Route payload response is missing payload data.");
    await ensureClientPlugins(nextPayload);
    if(transitionToken!==routeTransitionToken)return;
    const previousPayload=globalThis.__RESUX__,middlewareResult=await runClientRouteMiddleware(nextPayload,previousPayload?.route??{path:"",params:{},query:{}});
    if(transitionToken!==routeTransitionToken)return;
    if(middlewareResult?.type==="redirect"){await navigateTo(middlewareResult.to,{replace:true});return}
    if(middlewareResult?.type==="abort")return;
    const routeStylesReady=preloadRouteHeadStyles(result?.head,nextUrl.href,styleController?.signal),root=document.getElementById("__resux");
    if(!root)throw new Error("Missing Resux root for client navigation.");
    if(transitionToken!==routeTransitionToken)return;
    if(routeStylesReady){await routeStylesReady;if(transitionToken!==routeTransitionToken)return}
    history[options.replace?"replaceState":"pushState"]({__resux:true,path:routePath},"",nextUrl.href);
    await disposeClientEnhancements();setRouteTransition("swapping",{path:routePath});
    const preserveLayout=!didClientLocaleChange(previousPayload,nextPayload);
    let preserved;
    const performSwap = () => {
      if(transitionToken!==routeTransitionToken)return;
      preserved=replaceRouteHtml(root,result.html,preserveLayout);
      globalThis.__RESUX__=mergeClientGlobalState(mergePersistentLayoutPayload(previousPayload,nextPayload,preserved.scopeIds));
    };
    await runRouteViewTransitionSwap(options,nextPayload,previousPayload,performSwap);
    if(!preserved)return;
    getClientResuxApp(globalThis.__RESUX__.route);applyHead(result.head);animateRouteSwap(preserved.root);clearScopeCacheExcept(preserved.scopeIds);
    void resumePendingAsyncData();mountManagedTeleports(document,{deferMissingTarget:true});initializeManagedRuntimeContent(document);
    if(!options.preserveScroll&&nextUrl.hash)document.getElementById(nextUrl.hash.slice(1))?.scrollIntoView();
    else if(!options.preserveScroll&&typeof scrollTo==="function")scrollTo(0,0);
    if(transitionToken===routeTransitionToken){setRouteTransition("complete",{path:routePath});completed=true}
  }catch(error){
    setRouteTransition("error",{path:routePath});dispatchManagedEvent(typeof document !== "undefined" ? document : null,"resux:navigation-error",{path:routePath,message:error instanceof Error?error.message:String(error)});
  }finally{
    styleController?.abort();if(routeStyleNavigationController===styleController)routeStyleNavigationController=null;
    if(!completed&&transitionToken===routeTransitionToken)setRouteTransition("idle",{path:routePath});
  }
}
async function runRouteViewTransitionSwap(options,nextPayload,previousPayload,performSwap){
  const routerConfig=globalThis.__RESUX__?.config?.public?.router??globalThis.__RESUX__?.config?.router??{};
  const useTransition = shouldPerformViewTransition(options,nextPayload?.pageMeta??nextPayload?.meta,previousPayload?.pageMeta??previousPayload?.meta,routerConfig);
  if (useTransition) {
    await executeViewTransition(performSwap);
  } else {
    performSwap();
  }
}

function abortPendingAsyncData() {
  for (const controller of [...pendingAsyncDataControllers]) {
    if (controller && !controller.signal.aborted) {
      controller.abort();
    }
  }
  pendingAsyncDataControllers.clear();
}

function createClientRouter() {
  return {
    push(to) {
      return navigateTo(to);
    },
    replace(to) {
      return navigateTo(to, { replace: true });
    },
    back() {
      history.back();
    },
    forward() {
      history.forward();
    },
    go(delta) {
      history.go(delta);
    }
  };
}

const XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
const MANAGED_TELEPORT_SOURCE_PREFIX = "resux-teleport-source:";
const MANAGED_TELEPORT_END_MARKER = "resux-teleport-end";
const managedTeleportContent = new WeakMap();
const managedTeleportMountedSources = new Set();
const managedTeleportClaimedTargetStarts = new WeakSet();
const managedTeleportSourceMetadataCache = new WeakMap();
const managedTeleportSourceBindingKeys = new WeakMap();
const managedTeleportBindingSources = new Map();
const managedTeleportLiveTargets = new WeakMap();
const MANAGED_TELEPORT_TARGET_BRIDGE_KEY = "__RESUX_TELEPORT_TARGET_BRIDGE__";
const deferredManagedTeleportSources = new Set();
const deferredManagedTeleportPatches = new Map();
let managedTeleportPatchBatchDepth = 0;
let managedTeleportFlushRequested = false;

function isManagedTeleportCommentSource(source) {
  return source?.nodeType === 8
    && String(source.data || "").startsWith(MANAGED_TELEPORT_SOURCE_PREFIX);
}

function isManagedTeleportCommentEnd(source) {
  return source?.nodeType === 8
    && String(source.data || "") === MANAGED_TELEPORT_END_MARKER;
}

function isManagedTeleportElementSource(source) {
  return Boolean(source?.matches?.("[data-rx-teleport-source='true']"));
}

function decodeManagedTeleportSourceMetadata(source) {
  if (isManagedTeleportElementSource(source)) {
    return {
      to: source.getAttribute("data-rx-teleport-to") || "#teleports",
      toBinding: "",
      liveTargetToken: "",
      ssrKey: "",
      disabled: source.getAttribute("data-rx-teleport-disabled") === "true",
      defer: source.hasAttribute("data-rx-teleport-defer"),
      bindings: {},
      html: ""
    };
  }

  const cached = managedTeleportSourceMetadataCache.get(source);
  if (cached) return cached;
  let metadata = {
    to: "#teleports",
    toBinding: "",
    liveTargetToken: "",
    ssrKey: "",
    disabled: false,
    defer: false,
    bindings: {},
    html: ""
  };
  if (isManagedTeleportCommentSource(source)) {
    try {
      const encoded = String(source.data || "").slice(MANAGED_TELEPORT_SOURCE_PREFIX.length);
      const parsed = JSON.parse(decodeURIComponent(encoded));
      metadata = {
        to: normalizeClientTeleportTarget(parsed?.to),
        toBinding: typeof parsed?.toBinding === "string" ? parsed.toBinding : "",
        liveTargetToken: typeof parsed?.liveTargetToken === "string" ? parsed.liveTargetToken : "",
        ssrKey: typeof parsed?.ssrKey === "string" ? parsed.ssrKey : "",
        disabled: Boolean(parsed?.disabled),
        defer: Boolean(parsed?.defer),
        bindings: parsed?.bindings && typeof parsed.bindings === "object" ? parsed.bindings : {},
        html: typeof parsed?.html === "string" ? parsed.html : ""
      };
    } catch {
    }
  }
  managedTeleportSourceMetadataCache.set(source, metadata);
  return metadata;
}

function unregisterManagedTeleportSourceBindings(source) {
  const keys = managedTeleportSourceBindingKeys.get(source);
  if (!keys) return;
  for (const key of keys) {
    const sources = managedTeleportBindingSources.get(key);
    if (!sources) continue;
    sources.delete(source);
    if (sources.size === 0) {
      managedTeleportBindingSources.delete(key);
    }
  }
  managedTeleportSourceBindingKeys.delete(source);
}

function registerManagedTeleportSourceBindings(source) {
  if (!isManagedTeleportCommentSource(source)) return;
  unregisterManagedTeleportSourceBindings(source);
  const metadata = decodeManagedTeleportSourceMetadata(source);
  claimManagedTeleportPendingLiveTarget(source, metadata);
  const keys = new Set();
  for (const value of Object.values(metadata.bindings || {})) {
    const key = String(value || "");
    if (!key) continue;
    keys.add(key);
    let sources = managedTeleportBindingSources.get(key);
    if (!sources) {
      sources = new Set();
      managedTeleportBindingSources.set(key, sources);
    }
    sources.add(source);
  }
  managedTeleportSourceBindingKeys.set(source, keys);
}

function managedTeleportSourcesForBinding(key) {
  const sources = managedTeleportBindingSources.get(key);
  if (!sources) return [];
  const active = [];
  for (const source of [...sources]) {
    if (!source?.isConnected) {
      sources.delete(source);
      continue;
    }
    active.push(source);
  }
  if (sources.size === 0) {
    managedTeleportBindingSources.delete(key);
  }
  return active;
}
`;
