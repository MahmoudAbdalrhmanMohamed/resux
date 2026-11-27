// Client runtime source, part 9 of 9. Concatenated by getClientRuntimeSource() in ../index.ts.
export const clientRuntimePart09 = String.raw`
function normalizeClientImageModifiers(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const modifiers = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === false) {
      if (key === "format" || key === "quality") {
        modifiers[key] = false;
      }
      continue;
    }
    if (entry === undefined || entry === null) {
      continue;
    }
    if (key === "cache") {
      continue;
    }
    if (key === "width" || key === "height" || key === "quality") {
      const numeric = Number(entry);
      if (Number.isFinite(numeric) && numeric > 0) {
        modifiers[key] = Math.round(numeric);
      }
      continue;
    }
    modifiers[key] = entry;
  }
  return modifiers;
}

function buildClientImageSrcset(builder, input) {
  const widthCandidates = resolveClientImageWidthCandidates(input);
  if (widthCandidates.length) {
    return widthCandidates
      .map((width) => builder(input.src, {
        provider: input.provider,
        cache: input.cache,
        width,
        height: resolveClientImageCandidateHeight(input, width),
        quality: input.quality,
        fit: input.fit,
        format: input.format,
        modifiers: input.modifiers
      }) + " " + width + "w")
      .join(", ");
  }
  if (!input.width || !input.densities.length) {
    return undefined;
  }
  return [...new Set(input.densities)]
    .sort((left, right) => left - right)
    .map((density) => {
      const width = Math.max(1, Math.round(input.width * density));
      const height = input.height ? Math.max(1, Math.round(input.height * density)) : undefined;
      return builder(input.src, {
        provider: input.provider,
        cache: input.cache,
        width,
        height,
        quality: input.quality,
        fit: input.fit,
        format: input.format,
        modifiers: input.modifiers
      }) + " " + density + "x";
    })
    .join(", ");
}

function resolveClientImageWidthCandidates(input) {
  const explicitWidths = input.widths.length
    ? normalizeClientImageWidthCandidates(input.widths, input.width)
    : [];
  if (explicitWidths.length) {
    return explicitWidths;
  }
  if (!input.sizes) {
    return [];
  }
  return resolveClientImageWidthsFromSizes(input.sizes, input.densities, input.width);
}

function resolveClientImageWidthsFromSizes(sizes, densities, maxWidth) {
  const descriptors = String(sizes)
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  const baseWidths = [];
  for (const descriptor of descriptors) {
    const matches = [...descriptor.matchAll(/([0-9]*\.?[0-9]+)\s*(px|vw)\b/g)];
    const match = matches[matches.length - 1];
    if (!match) {
      continue;
    }
    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }
    if (match[2] === "px") {
      baseWidths.push(Math.round(value));
      continue;
    }
    for (const viewportWidth of RESUX_CLIENT_RESPONSIVE_VIEWPORT_WIDTHS) {
      baseWidths.push(Math.round((viewportWidth * value) / 100));
    }
  }

  const safeDensities = densities.length
    ? [...new Set(densities)]
      .filter((entry) => Number.isFinite(entry) && entry > 0)
      .sort((left, right) => left - right)
    : [1];
  const expandedWidths = baseWidths.flatMap((width) =>
    safeDensities.map((density) => Math.round(width * density))
  );

  if (!expandedWidths.length && Number.isFinite(maxWidth) && maxWidth > 0) {
    return [Math.max(1, Math.round(maxWidth))];
  }
  return normalizeClientImageWidthCandidates(expandedWidths, maxWidth);
}

function normalizeClientImageWidthCandidates(candidates, maxWidth) {
  const resolvedMaxWidth = Number.isFinite(maxWidth) && maxWidth > 0
    ? Math.round(maxWidth)
    : Number.POSITIVE_INFINITY;
  const normalized = [...new Set(candidates
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
    .map((entry) => Math.min(8192, Math.max(1, Math.round(entry)), resolvedMaxWidth)))]
    .sort((left, right) => left - right);
  const compacted = [];
  for (const width of normalized) {
    const previous = compacted[compacted.length - 1];
    const shouldKeep = previous === undefined
      || width - previous >= 24
      || (Number.isFinite(resolvedMaxWidth) && width === resolvedMaxWidth);
    if (shouldKeep) {
      compacted.push(width);
    }
  }
  return compacted;
}

function resolveClientImageCandidateHeight(input, width) {
  if (!input.height) {
    return undefined;
  }
  if (!input.width) {
    return input.height;
  }
  const scaledHeight = Math.round((input.height / input.width) * width);
  return Math.max(1, scaledHeight);
}

function renderClientResuxImgTag(input, src, srcset, styleScopeId) {
  const attrs = [];
  const isDeferredLazy = input.deferLazy && String(input.loading || "").toLowerCase() === "lazy";
  const placeholderSrc = input.placeholderSrc;
  const placeholderClass = input.placeholderClass;
  const placeholderStyle = input.placeholderStyle;
  const aspectRatioStyle = resolveClientAspectRatioStyle(input.width, input.height, input.attrs.style, placeholderStyle);
  const placeholderBackground = placeholderSrc
    ? "background-image: url('" + placeholderSrc + "'); background-size: cover; background-position: center; background-repeat: no-repeat"
    : undefined;
  const mergedClass = mergeClientClassNames(input.attrs.class, placeholderClass);
  const mergedStyle = mergeClientInlineStyles(
    input.attrs.style,
    aspectRatioStyle,
    placeholderBackground,
    placeholderStyle
  );
  const initialSrc = isDeferredLazy
    ? RESUX_LAZY_PLACEHOLDER_SRC
    : src;
  const mergedAttrs = {
    ...input.attrs,
    ...(mergedClass ? { class: mergedClass } : {}),
    ...(mergedStyle ? { style: mergedStyle } : {}),
    src: initialSrc,
    alt: input.alt,
    loading: input.loading,
    decoding: input.decoding,
    "data-resux-media": "img",
    "data-resux-img": isDeferredLazy ? "idle" : "loading",
    ...(!isDeferredLazy ? { "data-resux-loading": "true" } : {}),
    ...(isDeferredLazy ? { "data-rx-lazy-image": "true" } : {}),
    ...(isDeferredLazy ? { "data-resux-lazy": "true" } : {}),
    ...(isDeferredLazy ? { "data-rx-lazy-src": src, "data-src": src } : {}),
    ...(isDeferredLazy ? { "data-rx-lazy-root-margin": input.lazyRootMargin } : {}),
    ...(isDeferredLazy ? { "data-rx-lazy-threshold": String(input.lazyThreshold) } : {}),
    ...(isDeferredLazy && srcset ? { "data-rx-lazy-srcset": srcset, "data-srcset": srcset } : {}),
    ...(isDeferredLazy && input.sizes ? { "data-rx-lazy-sizes": input.sizes } : {}),
    ...(placeholderSrc ? { "data-rx-placeholder-src": placeholderSrc, "data-placeholder": placeholderSrc } : {}),
    ...(placeholderClass ? { "data-rx-placeholder-class": placeholderClass } : {}),
    ...(placeholderStyle ? { "data-rx-placeholder-style": placeholderStyle } : {}),
    ...(placeholderSrc ? { "data-rx-placeholder-active": "true", "data-resux-placeholder-active": "true" } : {}),
    ...(input.fallbackSrc ? { "data-rx-fallback-src": input.fallbackSrc } : {}),
    ...(input.fetchPriority ? { fetchpriority: input.fetchPriority } : {}),
    ...(input.width ? { width: String(input.width) } : {}),
    ...(input.height ? { height: String(input.height) } : {}),
    ...(!isDeferredLazy && srcset ? { srcset } : {}),
    ...(!isDeferredLazy && input.sizes ? { sizes: input.sizes } : {})
  };
  for (const [name, value] of Object.entries(mergedAttrs)) {
    if (value === undefined || value === null) {
      continue;
    }
    attrs.push(name + '="' + escapeAttribute(String(value)) + '"');
  }
  if (styleScopeId) {
    attrs.push(styleScopeId + '=""');
  }
  const attrText = attrs.length ? " " + attrs.join(" ") : "";
  return "<img" + attrText + ">";
}

function parseClientImageFormats(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof value !== "string") {
    return [];
  }
  return value.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
}

function parseClientImageNumberList(value) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : null;
  if (!values) {
    return undefined;
  }
  const numbers = values
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
    .map((entry) => Math.round(entry));
  return numbers.length ? numbers : undefined;
}

function readClientStringProp(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function readClientNumberProp(value) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.round(parsed);
}

function readClientBooleanProp(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "") {
      return true;
    }
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }
  return fallback;
}

function resolveClientPlaceholderSource(value) {
  if (value === undefined || value === null || value === false) {
    return undefined;
  }
  if (value === true) {
    return RESUX_DEFAULT_PLACEHOLDER_SRC;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const normalized = trimmed.toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return RESUX_DEFAULT_PLACEHOLDER_SRC;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return undefined;
  }
  if (normalized === "empty") {
    return undefined;
  }
  const modeSource = createClientModePlaceholderDataUri(normalized);
  if (modeSource) {
    return modeSource;
  }
  if (looksLikeClientMediaSource(trimmed)) {
    return trimmed;
  }
  return createClientTextPlaceholderDataUri(trimmed);
}

function createClientModePlaceholderDataUri(mode) {
  if (mode === "blur") {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="Blur placeholder">'
      + '<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="50%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0b1220"/></linearGradient></defs>'
      + '<rect width="800" height="450" fill="url(#g)"/>'
      + '<rect x="32" y="32" width="736" height="386" rx="28" fill="rgba(255,255,255,0.06)"/>'
      + '</svg>';
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }
  if (mode === "skeleton") {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="Skeleton placeholder">'
      + '<rect width="800" height="450" fill="#0f172a"/>'
      + '<rect x="32" y="32" width="736" height="386" rx="28" fill="#1e293b"/>'
      + '<rect x="72" y="290" width="420" height="24" rx="12" fill="#334155"/>'
      + '<rect x="72" y="330" width="300" height="20" rx="10" fill="#475569"/>'
      + '</svg>';
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }
  if (mode === "spinner") {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="Spinner placeholder">'
      + '<rect width="800" height="450" fill="#0f172a"/>'
      + '<circle cx="400" cy="225" r="62" fill="none" stroke="#334155" stroke-width="14"/>'
      + '<path d="M400 163a62 62 0 0 1 54 31" fill="none" stroke="#38bdf8" stroke-width="14" stroke-linecap="round"/>'
      + '</svg>';
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }
  return undefined;
}

function looksLikeClientMediaSource(value) {
  return value.startsWith("/")
    || value.startsWith("./")
    || value.startsWith("../")
    || value.startsWith("http://")
    || value.startsWith("https://")
    || value.startsWith("data:image/")
    || value.startsWith("blob:");
}

function createClientTextPlaceholderDataUri(value) {
  const safeLabel = escapeClientSvgText(value);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="' + safeLabel + '">'
    + '<rect width="640" height="360" fill="#0f172a"/>'
    + '<rect x="24" y="24" width="592" height="312" rx="20" fill="#111827" stroke="#334155" stroke-width="2"/>'
    + '<text x="320" y="192" fill="#cbd5e1" font-size="30" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif">' + safeLabel + '</text>'
    + '</svg>';
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

function escapeClientSvgText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mergeClientClassNames() {
  const values = Array.from(arguments);
  const tokens = values
    .flatMap((value) => String(value || "").split(/\s+/))
    .map((token) => token.trim())
    .filter(Boolean);
  return tokens.length ? [...new Set(tokens)].join(" ") : undefined;
}

function mergeClientInlineStyles() {
  const values = Array.from(arguments);
  const parts = values
    .flatMap((value) => String(value || "").split(";"))
    .map((entry) => entry.trim())
    .filter(Boolean);
  return parts.length ? parts.join("; ") : undefined;
}

function hasClientInlineStyleProperty(styleValue, propertyName) {
  if (typeof styleValue !== "string") {
    return false;
  }
  const normalized = String(propertyName).replace(/[.*+?^{}$()|[\]\\]/g, "\\$&");
  const pattern = new RegExp("(^|;)\\s*" + normalized + "\\s*:", "i");
  return pattern.test(styleValue);
}

function resolveClientAspectRatioStyle(width, height) {
  const styleValues = Array.from(arguments).slice(2);
  if (!width || !height) {
    return undefined;
  }
  if (styleValues.some((entry) => hasClientInlineStyleProperty(entry, "aspect-ratio"))) {
    return undefined;
  }
  return "aspect-ratio: " + width + " / " + height;
}

function inferClientImageMimeTypeFromSource(src) {
  const clean = String(src || "").split(/[?#]/)[0].toLowerCase();
  if (!clean) {
    return undefined;
  }
  const dotIndex = clean.lastIndexOf(".");
  if (dotIndex < 0) {
    return undefined;
  }
  const extension = clean.slice(dotIndex + 1);
  if (!extension) {
    return undefined;
  }
  return clientImageMimeType(extension);
}

function resolveClientPictureSourceInputs(value, fallbackInput) {
  if (!Array.isArray(value)) {
    return [];
  }
  const resolved = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const record = entry;
    const src = readClientStringProp(record.src) || fallbackInput.src;
    if (!src) {
      continue;
    }
    const hasQuality = Object.prototype.hasOwnProperty.call(record, "quality");
    const hasFormat = Object.prototype.hasOwnProperty.call(record, "format");
    const explicitFormat = readClientStringProp(record.format);
    const explicitQuality = readClientNumberProp(record.quality);
    const widths = parseClientImageNumberList(record.widths) || fallbackInput.widths;
    const baseModifiers = normalizeClientImageModifiers(record.modifiers);
    const modifiers = normalizeClientImageModifiers({
      ...fallbackInput.modifiers,
      ...baseModifiers,
      ...(hasFormat && !explicitFormat ? { format: false } : {}),
      ...(hasQuality && !explicitQuality ? { quality: false } : {}),
      ...(readClientStringProp(record.fit) ? { fit: readClientStringProp(record.fit) } : {}),
      ...(readClientNumberProp(record.width) ? { width: readClientNumberProp(record.width) } : {}),
      ...(readClientNumberProp(record.height) ? { height: readClientNumberProp(record.height) } : {}),
      ...(explicitQuality ? { quality: explicitQuality } : {}),
      ...(explicitFormat ? { format: explicitFormat } : {})
    });
    resolved.push({
      src,
      srcset: readClientStringProp(record.srcset),
      type: readClientStringProp(record.type),
      media: readClientStringProp(record.media),
      sizes: readClientStringProp(record.sizes) || fallbackInput.sizes,
      width: readClientNumberProp(record.width) || fallbackInput.width,
      height: readClientNumberProp(record.height) || fallbackInput.height,
      widths,
      quality: hasQuality ? explicitQuality : fallbackInput.quality,
      format: hasFormat ? explicitFormat : fallbackInput.format,
      fit: readClientStringProp(record.fit) || fallbackInput.fit,
      modifiers
    });
  }
  return resolved;
}

function resolveClientVideoSources(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const sources = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const src = readClientStringProp(entry.src);
    if (!src) {
      continue;
    }
    const quality = normalizeClientVideoQualityLabel(entry.quality)
      || normalizeClientVideoQualityLabel(entry.label);
    sources.push({
      src,
      type: readClientStringProp(entry.type),
      ...(quality ? { quality } : {})
    });
  }
  return sources;
}

function normalizeClientVideoQualityId(value) {
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

function normalizeClientVideoTransformQuality(value) {
  if (value === null || value === undefined || value === false) {
    return undefined;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      return undefined;
    }
    return Math.max(144, Math.min(4320, Math.round(value)));
  }
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (!raw) {
      return undefined;
    }
    const numeric = raw.endsWith("p") ? raw.slice(0, -1) : raw;
    const parsed = Number(numeric);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }
    return Math.max(144, Math.min(4320, Math.round(parsed)));
  }
  return undefined;
}

function normalizeClientVideoQualityLabel(value) {
  const numeric = normalizeClientVideoTransformQuality(value);
  return numeric ? String(numeric) + "p" : undefined;
}

function resolveClientVideoQualityOptions(value, fallbackSources, fallbackSrc) {
  if (!Array.isArray(value)) {
    return deriveClientVideoQualityOptionsFromSources(fallbackSources);
  }
  const resolved = [];
  const usedIds = new Set();
  let autoIndex = 0;
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const explicitSources = resolveClientVideoSources(entry.sources);
    const directSrc = readClientStringProp(entry.src);
    const directType = readClientStringProp(entry.type);
    const sources = explicitSources.length
      ? explicitSources
      : directSrc
        ? [{ src: directSrc, type: directType }]
        : [];
    if (!sources.length) {
      continue;
    }
    const rawLabel = readClientStringProp(entry.label);
    const rawId = normalizeClientVideoQualityId(entry.id)
      || normalizeClientVideoQualityId(rawLabel)
      || ("q" + String(autoIndex + 1));
    let candidateId = rawId;
    while (usedIds.has(candidateId)) {
      autoIndex += 1;
      candidateId = rawId + "-" + String(autoIndex + 1);
    }
    usedIds.add(candidateId);
    autoIndex += 1;
    const label = rawLabel || candidateId.toUpperCase();
    resolved.push({
      id: candidateId,
      label,
      sources
    });
  }
  if (resolved.length > 0) {
    return resolved;
  }
  const fromSources = deriveClientVideoQualityOptionsFromSources(fallbackSources);
  if (fromSources.length > 0) {
    return fromSources;
  }
  if (fallbackSrc) {
    return [];
  }
  return [];
}

function deriveClientVideoQualityOptionsFromSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return [];
  }
  const grouped = new Map();
  for (const source of sources) {
    const qualityLabel = normalizeClientVideoQualityLabel(source.quality);
    if (!qualityLabel) {
      continue;
    }
    const id = normalizeClientVideoQualityId(qualityLabel);
    if (!id) {
      continue;
    }
    let entry = grouped.get(id);
    if (!entry) {
      entry = { id, label: qualityLabel, sources: [] };
      grouped.set(id, entry);
    }
    entry.sources.push({
      src: source.src,
      ...(source.type ? { type: source.type } : {}),
      quality: qualityLabel
    });
  }
  const resolved = Array.from(grouped.values())
    .filter((entry) => Array.isArray(entry.sources) && entry.sources.length > 0)
    .sort((left, right) => {
      const leftHeight = normalizeClientVideoTransformQuality(left.label) ?? Number.POSITIVE_INFINITY;
      const rightHeight = normalizeClientVideoTransformQuality(right.label) ?? Number.POSITIVE_INFINITY;
      return leftHeight - rightHeight;
    });
  return resolved.length > 1 ? resolved : [];
}

function resolveClientVideoDefaultQuality(value, qualities) {
  if (!Array.isArray(qualities) || qualities.length === 0) {
    return undefined;
  }
  const explicit = normalizeClientVideoQualityId(value);
  if (explicit && qualities.some((entry) => entry.id === explicit)) {
    return explicit;
  }
  return qualities[0].id;
}

function serializeClientVideoQualityOptions(options) {
  return JSON.stringify((Array.isArray(options) ? options : []).map((entry) => ({
    id: entry.id,
    label: entry.label,
    sources: (Array.isArray(entry.sources) ? entry.sources : []).map((source) => ({
      src: source.src,
      ...(source.type ? { type: source.type } : {})
    }))
  })));
}

function normalizeClientVideoPlaybackSpeed(value) {
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

function resolveClientVideoPlaybackSpeeds(value) {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : null;
  if (!rawValues) {
    return [0.5, 0.75, 1, 1.25, 1.5, 2];
  }
  const normalized = rawValues
    .map((entry) => normalizeClientVideoPlaybackSpeed(entry))
    .filter((entry) => Number.isFinite(entry));
  const uniqueSorted = [...new Set(normalized)].sort((left, right) => left - right);
  return uniqueSorted.length ? uniqueSorted : [0.5, 0.75, 1, 1.25, 1.5, 2];
}

function resolveClientVideoDefaultSpeed(value, speeds) {
  const fallback = speeds.includes(1) ? 1 : (speeds[0] || 1);
  const explicit = normalizeClientVideoPlaybackSpeed(value);
  if (!explicit) {
    return fallback;
  }
  if (speeds.includes(explicit)) {
    return explicit;
  }
  let nearest = speeds[0] || explicit;
  let nearestDelta = Math.abs(nearest - explicit);
  for (const speed of speeds) {
    const delta = Math.abs(speed - explicit);
    if (delta < nearestDelta) {
      nearest = speed;
      nearestDelta = delta;
    }
  }
  return nearest;
}

function serializeClientVideoPlaybackSpeeds(speeds) {
  return speeds.map((entry) => String(entry)).join(",");
}

function formatClientVideoPlaybackRateLabel(value) {
  const normalized = Number.isFinite(value) && value > 0 ? value : 1;
  const rounded = Math.round(normalized * 100) / 100;
  const text = Number.isInteger(rounded) ? String(Math.trunc(rounded)) : String(rounded);
  return text + "x";
}

function clientImageMimeType(format) {
  const normalized = String(format || "").trim().toLowerCase();
  if (!normalized) {
    return "image/*";
  }
  if (normalized === "jpg") {
    return "image/jpeg";
  }
  return normalized.startsWith("image/") ? normalized : "image/" + normalized;
}

function nativeElementTag(node) {
  if (node.tag === "ResuxLink") {
    return "a";
  }
  if (node.tag === "ResuxImg") {
    return "img";
  }
  if (node.tag === "ResuxPicture") {
    return "picture";
  }
  if (node.tag === "ClientEnhance" || node.tag === "ResuxClientEnhance") {
    const asAttr = node.attrs.find(a => a.name === "as");
    return (asAttr && asAttr.kind === "static" ? asAttr.value : "section");
  }
  return node.tag;
}

function nativeAttributeName(node, name) {
  if (node.tag === "ResuxLink" && name === "to") {
    return "href";
  }
  if (node.tag === "ResuxLink" && (name === "viewTransition" || name === "view-transition")) {
    return "data-view-transition";
  }
  if (node.tag === "ClientEnhance" || node.tag === "ResuxClientEnhance") {
    if (name === "options") return "data-resux-options";
    if (name === "name") return "data-resux-enhancement";
    if (name === "trigger") return "data-resux-trigger";
    if (name === "mode") return "data-resux-mode";
    if (name === "noCls") return "data-resux-no-cls";
    if (name === "demo") return "data-resux-demo";
  }
  return name;
}

const activeCssTransitions = new WeakMap();
const reactiveBlockTransitionRevisions = new WeakMap();

function transitionBoundaryFor(element) {
  return element && element.closest ? element.closest("[data-rx-transition]") : null;
}

function transitionNameFromBoundary(boundary) {
  const candidate = String(boundary?.getAttribute?.("data-rx-transition") || "v").trim();
  return /^[A-Za-z0-9_-]+$/.test(candidate) ? candidate : "v";
}

function transitionReducedMotion() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function cssTimeTokenMs(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return 0;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return normalized.endsWith("ms") ? parsed : parsed * 1000;
}

function maxCssMotionTime(durationValue, delayValue) {
  const durations = String(durationValue || "0s").split(",").map(cssTimeTokenMs);
  const delays = String(delayValue || "0s").split(",").map(cssTimeTokenMs);
  const length = Math.max(durations.length, delays.length);
  let max = 0;
  for (let index = 0; index < length; index += 1) {
    const duration = durations[index % durations.length] || 0;
    const delay = delays[index % delays.length] || 0;
    max = Math.max(max, duration + delay);
  }
  return max;
}

function cssAnimationIterationToken(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "infinite") return 1;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 1;
}

function maxCssAnimationTime(durationValue, delayValue, iterationValue) {
  const durations = String(durationValue || "0s").split(",").map(cssTimeTokenMs);
  const delays = String(delayValue || "0s").split(",").map(cssTimeTokenMs);
  const iterations = String(iterationValue || "1").split(",").map(cssAnimationIterationToken);
  const length = Math.max(durations.length, delays.length, iterations.length);
  let max = 0;
  for (let index = 0; index < length; index += 1) {
    const duration = durations[index % durations.length] || 0;
    const delay = delays[index % delays.length] || 0;
    const iterationsCount = iterations[index % iterations.length] ?? 1;
    max = Math.max(max, delay + duration * iterationsCount);
  }
  return max;
}

function cssMotionTime(element) {
  if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") return 0;
  const style = window.getComputedStyle(element);
  return Math.max(
    maxCssMotionTime(style.transitionDuration, style.transitionDelay),
    maxCssAnimationTime(style.animationDuration, style.animationDelay, style.animationIterationCount)
  );
}

function cancelCssTransition(element) {
  const active = activeCssTransitions.get(element);
  if (active) active.cancel();
}

function runCssTransition(element, name, phase, onDone) {
  cancelCssTransition(element);
  if (!element || !element.classList || transitionReducedMotion()) {
    onDone?.();
    return;
  }

  const fromClass = name + "-" + phase + "-from";
  const activeClass = name + "-" + phase + "-active";
  const toClass = name + "-" + phase + "-to";
  let timer = 0;
  let cancelled = false;

  const cleanup = () => {
    element.classList.remove(fromClass, activeClass, toClass);
  };
  const finish = () => {
    if (cancelled) return;
    cleanup();
    activeCssTransitions.delete(element);
    onDone?.();
  };
  const cancel = () => {
    cancelled = true;
    if (timer) window.clearTimeout(timer);
    cleanup();
    if (activeCssTransitions.get(element)?.cancel === cancel) {
      activeCssTransitions.delete(element);
    }
  };

  activeCssTransitions.set(element, { cancel });
  element.classList.add(fromClass, activeClass);
  element.getBoundingClientRect?.();
  element.classList.remove(fromClass);
  element.classList.add(toClass);
  timer = window.setTimeout(finish, Math.max(16, cssMotionTime(element) + 32));
}

function replaceManagedRuntimeHtml(element, value, preparedTeleportSources = []) {
  const externalTeleportSources = [
    ...preparedTeleportSources,
    ...prepareManagedTeleportsForTargetReplacement(element),
  ];
  cleanupManagedTeleports(element);
  unmountVueIslands(element);
  element.innerHTML = value;
  reconcileDefaultTeleportTarget();
  mountManagedTeleports(element, { deferMissingTarget: true });
  remountPreparedManagedTeleports(externalTeleportSources, { deferMissingTarget: true });
}

function refreshPatchedBlock(element, value) {
  replaceManagedRuntimeHtml(element, value);
  initializeManagedRuntimeContent(document);
}

function transitionChildKey(element) {
  return element?.getAttribute?.("key") || element?.getAttribute?.("data-key") || "";
}

function patchTransitionGroup(element, value, boundary, revision) {
  const name = transitionNameFromBoundary(boundary);
  for (const stale of Array.from(element.children || [])) {
    if (stale.getAttribute?.("data-rx-transition-leaving") !== "true") continue;
    cancelCssTransition(stale);
    unmountVueIslands(stale);
    stale.remove();
  }

  const oldChildren = Array.from(element.children || []);
  oldChildren.forEach(cancelCssTransition);
  const oldKeys = new Map();
  for (const child of oldChildren) {
    const key = transitionChildKey(child);
    if (key) oldKeys.set(key, child);
  }

  const template = document.createElement("template");
  template.innerHTML = value;
  const nextElements = Array.from(template.content.children || []);
  const nextKeys = new Set(nextElements.map(transitionChildKey).filter(Boolean));
  const removed = [...oldKeys.entries()]
    .filter(([key]) => !nextKeys.has(key))
    .map(([, child]) => child);

  const externalTeleportSources = new Set();
  for (const child of removed) {
    for (const source of prepareManagedTeleportsForTargetReplacement(child)) {
      externalTeleportSources.add(source);
    }
    cleanupManagedTeleports(child);
    child.remove();
  }

  if (reactiveBlockTransitionRevisions.get(element) !== revision) return;
  replaceManagedRuntimeHtml(element, value, [...externalTeleportSources]);
  initializeManagedRuntimeContent(document);

  const nextChildren = Array.from(element.children || []);
  for (const child of nextChildren) {
    const key = transitionChildKey(child);
    if ((key && !oldKeys.has(key)) || (oldChildren.length === 0 && !key)) {
      runCssTransition(child, name, "enter");
    }
  }

  if (!removed.length) return;

  if (transitionReducedMotion()) {
    for (const child of removed) {
      unmountVueIslands(child);
    }
    return;
  }

  for (const child of removed) {
    child.setAttribute("data-rx-transition-leaving", "true");
    element.appendChild(child);
    runCssTransition(child, name, "leave", () => {
      unmountVueIslands(child);
      child.remove();
    });
  }
}

function patchTransitionBlock(element, value) {
  const boundary = transitionBoundaryFor(element);
  if (!boundary) return false;

  const revision = (reactiveBlockTransitionRevisions.get(element) || 0) + 1;
  reactiveBlockTransitionRevisions.set(element, revision);

  if (boundary.getAttribute("data-rx-transition-group") === "true") {
    patchTransitionGroup(element, value, boundary, revision);
    return true;
  }

  const hadContent = Boolean(element.firstElementChild || String(element.textContent || "").trim());
  const hasContent = String(value || "").trim().length > 0;
  const name = transitionNameFromBoundary(boundary);
  const current = element.firstElementChild;
  if (current) cancelCssTransition(current);

  if (hadContent && !hasContent && current) {
    runCssTransition(current, name, "leave", () => {
      if (reactiveBlockTransitionRevisions.get(element) === revision) {
        refreshPatchedBlock(element, value);
      }
    });
    return true;
  }

  refreshPatchedBlock(element, value);
  if (!hadContent && hasContent) {
    const entered = element.firstElementChild;
    if (entered) runCssTransition(entered, name, "enter");
  }
  return true;
}

function patchTransitionVisibility(element, shouldHide) {
  const boundary = transitionBoundaryFor(element);
  if (!boundary || boundary.getAttribute("data-rx-transition-group") === "true") return false;

  const name = transitionNameFromBoundary(boundary);
  cancelCssTransition(element);
  if (shouldHide) {
    if (element.hasAttribute("hidden")) return true;
    runCssTransition(element, name, "leave", () => element.setAttribute("hidden", "true"));
    return true;
  }

  const wasHidden = element.hasAttribute("hidden");
  element.removeAttribute("hidden");
  if (wasHidden) runCssTransition(element, name, "enter");
  return true;
}

function applyPatches(scopeId, patches, options = {}) {
  let needsLazyImageActivation = false;
  let needsDelegatedEventRegistration = false;
  let needsTeleportFallbackReconciliation = false;
  for (const patch of patches) {
    const elements = document.querySelectorAll(managedTeleportPatchSelector(scopeId, patch));
    if (patch.type === "text") {
      elements.forEach((element) => { element.textContent = patch.value; });
      continue;
    }
    if (patch.type === "attr") {
      const teleportPatch = String(patch.attr || "").startsWith("data-rx-teleport-");
      if (teleportPatch) {
        const bindingKey = scopeId + ":" + patch.id;
        for (const source of managedTeleportSourcesForBinding(bindingKey)) {
          updateManagedTeleportCommentSource(source, patch.attr, patch.value, bindingKey);
          syncManagedTeleportSource(source, { deferMissingTarget: true });
        }
      }
      elements.forEach((element) => {
        const isViewTransitionAttr = patch.attr === "data-view-transition" || patch.attr === "view-transition";
        const removeAttribute = patch.value === "" || (!isViewTransitionAttr && patch.value === "false") || patch.value == null;
        if (patch.attr === "id") {
          const previousId = element.getAttribute("id");
          const nextId = removeAttribute ? null : String(patch.value);
          if (previousId !== nextId && (previousId === "teleports" || nextId === "teleports")) {
            needsTeleportFallbackReconciliation = true;
          }
        }
        const teleportElementTarget = patch.attr === "data-rx-teleport-to"
          && isManagedTeleportElementTarget(patch.value);
        if (patch.attr === "hidden" && patchTransitionVisibility(element, !removeAttribute)) return;
        if (teleportElementTarget) {
          managedTeleportLiveTargets.set(element, patch.value);
        } else {
          if (patch.attr === "data-rx-teleport-to") managedTeleportLiveTargets.delete(element);
          if (removeAttribute) {
            element.removeAttribute(patch.attr);
          } else {
            element.setAttribute(patch.attr, patch.value);
            if (patch.attr === "value" && "value" in element) element.value = patch.value;
          }
          if (patch.attr === "checked" && "checked" in element) element.checked = !removeAttribute;
        }
        if (teleportPatch) syncManagedTeleportSource(element, { deferMissingTarget: true });
      });
      continue;
    }
    elements.forEach((element) => {
      const held = patch.type === "block" && clientChildRoots.size > 0 ? holdClientChildrenOfBlock(element) : null;
      if (patch.type !== "html" && patchTransitionBlock(element, patch.value)) return;
      replaceManagedRuntimeHtml(element, patch.value);
      if (held) restoreClientChildrenOfBlock(element, held);
      void mountVueIslands(document);
      needsLazyImageActivation = true;
      needsDelegatedEventRegistration = true;
    });
  }
  if (needsTeleportFallbackReconciliation) {
    reconcileDefaultTeleportTarget();
  }
  if (
    deferredManagedTeleportSources.size
    && options.recordDeferredTeleportPatches !== false
  ) {
    deferredManagedTeleportPatches.set(scopeId, patches);
  }
  if (options.flushDeferredTeleports !== false) {
    replayDeferredManagedTeleportPatches(flushDeferredManagedTeleports());
  }
  if (needsLazyImageActivation) {
    activateDeferredLazyMedia();
    applyReducedMotionVideoPreference();
    initializeManagedVideoControls();
  }
  if (needsDelegatedEventRegistration) registerDelegatedEventsFromDom(document);
  if (pendingClientChildren.size > 0) void mountClientChildren(document);
  if (clientChildRoots.size > 0) releaseDetachedClientChildren();
}

function evaluateExpression(expression, scope, locals) {
  if (scope && scope.__rx_expressions && scope.__rx_expressions[expression]) {
    return scope.__rx_expressions[expression](scope, locals);
  }
  return Function("scope", "locals", "with (scope) { with (locals) { return (" + expression + "); } }")(scope, locals);
}

function serializeRefs(refs) {
  const output = Object.create(null);
  for (const [key, ref] of Object.entries(refs)) {
    output[key] = ref.value;
  }
  return output;
}

function serializeProps(props) {
  const output = {};
  for (const [key, value] of Object.entries(props)) {
    output[key] = value;
  }
  return output;
}

function stringifyValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) || isPlainDisplayObject(value)) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function isPlainDisplayObject(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function stringifyAttributeValue(name, value) {
  if (name === "class") {
    return stringifyClassValue(value);
  }

  if (name === "style") {
    return stringifyStyleValue(value);
  }

  return stringifyValue(value);
}

function stringifyClassValue(value) {
  if (!value) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(stringifyClassValue).filter(Boolean).join(" ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, active]) => Boolean(active))
      .map(([className]) => className)
      .join(" ");
  }

  return String(value);
}

function stringifyStyleValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value)
      .filter(([, styleValue]) => styleValue !== null && styleValue !== undefined && styleValue !== false)
      .map(([name, styleValue]) => kebabCaseStyleName(name) + ":" + String(styleValue))
      .join(";");
  }

  return String(value);
}

function kebabCaseStyleName(value) {
  return value.replace(/[A-Z]/g, (match) => "-" + match.toLowerCase());
}

const allowedHtmlTags = new Set([
  "a", "abbr", "b", "blockquote", "br", "code", "dd", "del", "div", "dl", "dt", "em",
  "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "ins", "li", "ol", "p",
  "pre", "s", "span", "strong", "sub", "sup", "table", "tbody", "td", "th", "thead",
  "tr", "u", "ul"
]);
const htmlTagsWithRemovedContent = new Set(["script", "style", "iframe", "object", "embed", "svg", "math", "template"]);
const allowedGlobalHtmlAttrs = new Set(["class", "id", "title", "role"]);
const allowedHtmlAttrsByTag = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"])
};

function sanitizeHtml(value) {
  let html = stringifyValue(value);
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const tag of htmlTagsWithRemovedContent) {
    html = html.replace(new RegExp("<" + tag + "\\b[^>]*>[\\s\\S]*?<\\/" + tag + ">", "gi"), "");
    html = html.replace(new RegExp("<\\/?" + tag + "\\b[^>]*>", "gi"), "");
  }
  return html.replace(/<\/?([A-Za-z][A-Za-z0-9:-]*)\b([^>]*)>/g, (full, rawTag, rawAttrs) => {
    const tag = rawTag.toLowerCase();
    if (!allowedHtmlTags.has(tag)) {
      return "";
    }
    if (full.startsWith("</")) {
      return "</" + tag + ">";
    }
    const attrs = sanitizeHtmlAttributes(tag, rawAttrs);
    const attrText = attrs.length ? " " + attrs.join(" ") : "";
    return "<" + tag + attrText + ">";
  });
}

function sanitizeHtmlAttributes(tag, rawAttrs) {
  const attrs = [];
  const allowedForTag = allowedHtmlAttrsByTag[tag] ?? new Set();
  const attrPattern = /([^\s"'=<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g;
  let match;
  let hasRel = false;
  let opensBlankTarget = false;
  while ((match = attrPattern.exec(rawAttrs))) {
    const name = match[1].toLowerCase();
    if (name.startsWith("on") || name === "style" || name === "srcdoc") {
      continue;
    }
    if (!allowedGlobalHtmlAttrs.has(name) && !allowedForTag.has(name) && !name.startsWith("aria-")) {
      continue;
    }
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if ((name === "href" || name === "src") && !isSafeHtmlUrl(value)) {
      continue;
    }
    if (name === "target" && value === "_blank") {
      opensBlankTarget = true;
    }
    if (name === "rel") {
      hasRel = true;
    }
    attrs.push(name + '="' + escapeAttribute(value) + '"');
  }
  if (tag === "a" && opensBlankTarget && !hasRel) {
    attrs.push('rel="noopener noreferrer"');
  }
  return attrs;
}

function isSafeHtmlUrl(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
    return true;
  }
  try {
    const url = new URL(trimmed, "https://resux.local");
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function normalizeAsyncDataError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message
    };
  }
  return {
    name: "Error",
    message: String(error)
  };
}

function assertJsonSerializable(value, label) {
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new Error(label + " must be JSON serializable.");
  }
  try {
    JSON.stringify(value);
  } catch {
    throw new Error(label + " must be JSON serializable.");
  }
}

function isClientDevMode() {
  if (!isClientRuntime()) {
    return false;
  }
  return Boolean(import.meta && import.meta.env && import.meta.env.DEV) || Boolean(window.__RESUX_DEV_RELOAD__);
}

// Mirrors the server's assertJsonSerializable checks for client-created state
// and event locals, but only in dev so production pays no extra serialization.
function assertJsonSerializableInDev(value, label) {
  if (isClientDevMode()) {
    assertJsonSerializable(value, label);
  }
}

function createClientStateValue(key, factory) {
  const value = factory?.();
  assertJsonSerializableInDev(value, 'useState("' + key + '")');
  return value;
}

function cloneJsonSerializable(value, label) {
  assertJsonSerializable(value, label);
  return JSON.parse(JSON.stringify(value));
}

function setSerializableRecordValue(record, key, value) {
  Object.defineProperty(record, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

installResux();
`;
