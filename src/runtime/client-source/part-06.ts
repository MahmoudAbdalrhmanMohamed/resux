// Client runtime source, part 6 of 9. Concatenated by getClientRuntimeSource() in ../index.ts.
export const clientRuntimePart06 = String.raw`
function managedTeleportSources(root = document) {
  const sources = [];
  const seen = new Set();
  const addSource = (source) => {
    if (!source || seen.has(source)) return;
    seen.add(source);
    sources.push(source);
    registerManagedTeleportSourceBindings(source);
  };

  if (isManagedTeleportCommentSource(root) || isManagedTeleportElementSource(root)) {
    addSource(root);
  }
  if (root?.querySelectorAll) {
    for (const source of root.querySelectorAll("[data-rx-teleport-source='true']")) {
      addSource(source);
    }
  }

  const ownerDocument = root?.nodeType === 9 ? root : root?.ownerDocument || document;
  if (ownerDocument?.createTreeWalker && root?.nodeType) {
    const walker = ownerDocument.createTreeWalker(root, 128);
    let node = walker.nextNode();
    while (node) {
      if (isManagedTeleportCommentSource(node)) {
        addSource(node);
      }
      node = walker.nextNode();
    }
  }
  return sources;
}

function isManagedTeleportTemplateSource(source) {
  return String(source?.localName || "").toLowerCase() === "template";
}

function managedTeleportImplicitTableWrappers(source) {
  if (String(source?.parentNode?.localName || "").toLowerCase() !== "table") return [];
  const wrappers = [];
  let wrapper = source.nextSibling;
  while (wrapper) {
    if (wrapper.nodeType === 3 && !String(wrapper.data || "").trim()) {
      wrapper = wrapper.nextSibling;
      continue;
    }
    if (!["tbody", "colgroup"].includes(String(wrapper?.localName || "").toLowerCase())) break;
    wrappers.push(wrapper);
    wrapper = wrapper.nextSibling;
  }
  return wrappers;
}

function managedTeleportImplicitTableSourceEnd(source) {
  let depth = 0;
  const visit = (root) => {
    for (const node of Array.from(root?.childNodes ?? [])) {
      if (isManagedTeleportCommentSource(node)) {
        depth += 1;
      } else if (isManagedTeleportCommentEnd(node)) {
        if (depth === 0) return node;
        depth -= 1;
      }
      const nested = visit(node);
      if (nested) return nested;
    }
    return null;
  };
  for (const wrapper of managedTeleportImplicitTableWrappers(source)) {
    const end = visit(wrapper);
    if (end) return end;
  }
  return null;
}

function managedTeleportSourceEnd(source) {
  if (isManagedTeleportCommentSource(source)) {
    let depth = 0;
    let node = source.nextSibling;
    while (node) {
      if (isManagedTeleportCommentSource(node)) {
        depth += 1;
      } else if (isManagedTeleportCommentEnd(node)) {
        if (depth === 0) return node;
        depth -= 1;
      }
      node = node.nextSibling;
    }
    return managedTeleportImplicitTableSourceEnd(source);
  }

  if (!isManagedTeleportTemplateSource(source)) return null;
  let depth = 0;
  let node = source.nextSibling;
  while (node) {
    if (node.nodeType === 1 && node.matches?.("template[data-rx-teleport-source='true']")) {
      depth += 1;
    } else if (node.nodeType === 1 && node.matches?.("template[data-rx-teleport-end='true']")) {
      if (depth === 0) return node;
      depth -= 1;
    }
    node = node.nextSibling;
  }
  return null;
}

function managedTeleportInlineNodes(source) {
  const end = managedTeleportSourceEnd(source);
  if (!end) return [];

  if (source.parentNode !== end.parentNode) {
    const wrappers = managedTeleportImplicitTableWrappers(source);
    if (!wrappers.includes(end.parentNode)) return [];
    const nodes = [];
    for (const wrapper of wrappers) {
      let node = wrapper.firstChild;
      while (node) {
        if (node === end) return nodes;
        nodes.push(node);
        node = node.nextSibling;
      }
      if (wrapper === end.parentNode) return [];
    }
    return [];
  }

  const nodes = [];
  let node = source.nextSibling;
  while (node && node !== end) {
    nodes.push(node);
    node = node.nextSibling;
  }
  return nodes;
}

function managedTeleportFosterParentedNodes(source) {
  const table = source?.parentNode;
  const markup = decodeManagedTeleportSourceMetadata(source).html || "";
  if (String(table?.localName || "").toLowerCase() !== "table" || !table.parentNode || !markup) return [];

  const template = document.createElement("template");
  template.innerHTML = markup;
  const tableChildren = "|caption|col|colgroup|form|script|style|table|tbody|td|tfoot|th|thead|template|tr|";
  const expected = Array.from(template.content.childNodes).filter((node) => {
    if (node.nodeType === 3) return Boolean(String(node.data || "").trim());
    if (node.nodeType !== 1) return false;
    const tag = String(node.localName || "").toLowerCase();
    return !tableChildren.includes("|" + tag + "|")
      && !(tag === "input" && String(node.getAttribute?.("type") || "").toLowerCase() === "hidden");
  });
  if (!expected.length) return [];

  const nodes = [];
  let sibling = table.previousSibling;
  for (let index = expected.length - 1; index >= 0; index -= 1) {
    while (sibling?.nodeType === 3 && !String(sibling.data || "").trim()) {
      sibling = sibling.previousSibling;
    }
    if (
      !sibling
      || managedTeleportNodesMarkup([sibling]) !== managedTeleportNodesMarkup([expected[index]])
    ) {
      return [];
    }
    nodes.unshift(sibling);
    sibling = sibling.previousSibling;
  }
  return nodes;
}

function isManagedTeleportContainerElement(value) {
  return Boolean(
    value
    && typeof value === "object"
    && value.nodeType === 1
    && !unsafeClientTransitionContainerTags.has(String(value.localName || "").toLowerCase())
  );
}

function reconcileDefaultTeleportTarget() {
  const frameworkTarget = document.querySelector("[data-rx-teleport-fallback='true']");
  if (!frameworkTarget) return;
  frameworkTarget.setAttribute("id", "teleports");
}

function isManagedTeleportElementTarget(value) {
  return Boolean(value && typeof value === "object" && value.nodeType === 1);
}

function managedTeleportTargetBridge() {
  const current = globalThis[MANAGED_TELEPORT_TARGET_BRIDGE_KEY];
  if (current && current.targets instanceof Map && Number.isFinite(current.next)) {
    return current;
  }
  const bridge = { next: 0, targets: new Map() };
  globalThis[MANAGED_TELEPORT_TARGET_BRIDGE_KEY] = bridge;
  return bridge;
}

function createManagedTeleportLiveTargetToken(target) {
  if (!isManagedTeleportElementTarget(target)) return "";
  const bridge = managedTeleportTargetBridge();
  bridge.next += 1;
  const token = "rx-tp-" + bridge.next.toString(36);
  bridge.targets.set(token, target);
  return token;
}

function claimManagedTeleportPendingLiveTarget(source, metadata) {
  const token = String(metadata?.liveTargetToken || "");
  if (!token) return;
  const bridge = managedTeleportTargetBridge();
  const target = bridge.targets.get(token);
  bridge.targets.delete(token);
  metadata.liveTargetToken = "";
  if (isManagedTeleportElementTarget(target)) {
    managedTeleportLiveTargets.set(source, target);
  }
}

function managedTeleportTarget(source) {
  const liveTarget = managedTeleportLiveTargets.get(source);
  if (isManagedTeleportElementTarget(liveTarget)) {
    return liveTarget;
  }
  const metadata = decodeManagedTeleportSourceMetadata(source);
  const selector = metadata.to || "#teleports";
  try {
    if (selector === "#teleports") {
      const frameworkTarget = document.querySelector("[data-rx-teleport-fallback='true']");
      if (isManagedTeleportContainerElement(frameworkTarget)) {
        return frameworkTarget;
      }
      return [...document.querySelectorAll("[id='teleports']")]
        .find((element) => isManagedTeleportContainerElement(element)) || null;
    }
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function managedTeleportSourceContainsTarget(source, target) {
  if (!target) return false;
  if (source?.contains?.(target)) return true;
  if (!isManagedTeleportCommentSource(source) && !isManagedTeleportTemplateSource(source)) {
    return false;
  }
  return managedTeleportInlineNodes(source).some((node) =>
    node === target || Boolean(node.nodeType === 1 && node.contains?.(target))
  );
}

function managedTeleportRangeNodes(content) {
  const nodes = [];
  if (!content?.start || !content?.end || content.start.parentNode !== content.end.parentNode) {
    return nodes;
  }
  let node = content.start.nextSibling;
  while (node && node !== content.end) {
    nodes.push(node);
    node = node.nextSibling;
  }
  return nodes;
}

function managedTeleportNodesMarkup(nodes) {
  const container = document.createElement("div");
  for (const node of nodes) {
    container.appendChild(node.cloneNode(true));
  }
  return container.innerHTML;
}

function managedTeleportRangeMarkup(content) {
  return managedTeleportNodesMarkup(managedTeleportRangeNodes(content));
}

function managedTeleportEffectiveNamespace(node) {
  if (!node) return XHTML_NAMESPACE;
  const localName = String(node.localName || "").toLowerCase();
  const reportedNamespace = node.namespaceURI || XHTML_NAMESPACE;
  if (reportedNamespace === SVG_NAMESPACE || reportedNamespace === MATHML_NAMESPACE) {
    return reportedNamespace;
  }
  if (reportedNamespace === XHTML_NAMESPACE) {
    if (localName === "svg") return SVG_NAMESPACE;
    if (localName === "math") return MATHML_NAMESPACE;
  }

  const parent = node.parentElement;
  if (!parent) return reportedNamespace;
  const parentNamespace = managedTeleportEffectiveNamespace(parent);
  const parentLocalName = String(parent.localName || "").toLowerCase();

  if (parentNamespace === SVG_NAMESPACE) {
    if (["foreignobject", "desc", "title"].includes(parentLocalName)) {
      return XHTML_NAMESPACE;
    }
    return SVG_NAMESPACE;
  }

  if (parentNamespace === MATHML_NAMESPACE) {
    if (
      ["mi", "mo", "mn", "ms", "mtext"].includes(parentLocalName)
      && !["mglyph", "malignmark"].includes(localName)
    ) {
      return XHTML_NAMESPACE;
    }
    if (
      parentLocalName === "annotation-xml"
      && ["text/html", "application/xhtml+xml"].includes(
        String(parent.getAttribute?.("encoding") || "").toLowerCase()
      )
    ) {
      return XHTML_NAMESPACE;
    }
    return MATHML_NAMESPACE;
  }

  return reportedNamespace;
}

function managedTeleportParsingContext(target) {
  const namespace = managedTeleportEffectiveNamespace(target);
  const localName = String(target?.localName || "").toLowerCase();
  if (namespace === XHTML_NAMESPACE) {
    const contextualTag = ["thead", "tbody", "tfoot"].includes(localName)
      ? "table-section"
      : ["table", "tr", "colgroup", "select", "optgroup"].includes(localName)
        ? localName
        : "default";
    return namespace + ":" + contextualTag;
  }
  if (namespace === SVG_NAMESPACE) {
    if (["foreignobject", "desc", "title"].includes(localName)) {
      return XHTML_NAMESPACE + ":default";
    }
    return namespace + ":svg";
  }
  if (namespace === MATHML_NAMESPACE) {
    if (localName === "annotation-xml") {
      const encoding = String(target?.getAttribute?.("encoding") || "").toLowerCase();
      if (["text/html", "application/xhtml+xml"].includes(encoding)) {
        return XHTML_NAMESPACE + ":default";
      }
      return namespace + ":" + localName + ":mathml";
    }
    const integration = ["mi", "mo", "mn", "ms", "mtext"].includes(localName)
      ? "text"
      : "mathml";
    return namespace + ":" + integration;
  }
  return namespace + ":" + localName;
}

const MANAGED_TELEPORT_SVG_TAG_NAMES = {
  altglyph: "altGlyph",
  altglyphdef: "altGlyphDef",
  altglyphitem: "altGlyphItem",
  animatecolor: "animateColor",
  animatemotion: "animateMotion",
  animatetransform: "animateTransform",
  clippath: "clipPath",
  feblend: "feBlend",
  fecolormatrix: "feColorMatrix",
  fecomponenttransfer: "feComponentTransfer",
  fecomposite: "feComposite",
  feconvolvematrix: "feConvolveMatrix",
  fediffuselighting: "feDiffuseLighting",
  fedisplacementmap: "feDisplacementMap",
  fedistantlight: "feDistantLight",
  fedropshadow: "feDropShadow",
  feflood: "feFlood",
  fefunca: "feFuncA",
  fefuncb: "feFuncB",
  fefuncg: "feFuncG",
  fefuncr: "feFuncR",
  fegaussianblur: "feGaussianBlur",
  feimage: "feImage",
  femerge: "feMerge",
  femergenode: "feMergeNode",
  femorphology: "feMorphology",
  feoffset: "feOffset",
  fepointlight: "fePointLight",
  fespecularlighting: "feSpecularLighting",
  fespotlight: "feSpotLight",
  fetile: "feTile",
  feturbulence: "feTurbulence",
  foreignobject: "foreignObject",
  glyphref: "glyphRef",
  lineargradient: "linearGradient",
  radialgradient: "radialGradient",
  textpath: "textPath"
};

const MANAGED_TELEPORT_SVG_ATTRIBUTE_NAMES = {
  attributename: "attributeName",
  attributetype: "attributeType",
  basefrequency: "baseFrequency",
  baseprofile: "baseProfile",
  calcmode: "calcMode",
  clippathunits: "clipPathUnits",
  diffuseconstant: "diffuseConstant",
  edgemode: "edgeMode",
  filterunits: "filterUnits",
  glyphref: "glyphRef",
  gradienttransform: "gradientTransform",
  gradientunits: "gradientUnits",
  kernelmatrix: "kernelMatrix",
  kernelunitlength: "kernelUnitLength",
  keypoints: "keyPoints",
  keysplines: "keySplines",
  keytimes: "keyTimes",
  lengthadjust: "lengthAdjust",
  limitingconeangle: "limitingConeAngle",
  markerheight: "markerHeight",
  markerunits: "markerUnits",
  markerwidth: "markerWidth",
  maskcontentunits: "maskContentUnits",
  maskunits: "maskUnits",
  numoctaves: "numOctaves",
  pathlength: "pathLength",
  patterncontentunits: "patternContentUnits",
  patterntransform: "patternTransform",
  patternunits: "patternUnits",
  pointsatx: "pointsAtX",
  pointsaty: "pointsAtY",
  pointsatz: "pointsAtZ",
  preservealpha: "preserveAlpha",
  preserveaspectratio: "preserveAspectRatio",
  primitiveunits: "primitiveUnits",
  refx: "refX",
  refy: "refY",
  repeatcount: "repeatCount",
  repeatdur: "repeatDur",
  requiredextensions: "requiredExtensions",
  requiredfeatures: "requiredFeatures",
  specularconstant: "specularConstant",
  specularexponent: "specularExponent",
  spreadmethod: "spreadMethod",
  startoffset: "startOffset",
  stddeviation: "stdDeviation",
  stitchtiles: "stitchTiles",
  surfacescale: "surfaceScale",
  systemlanguage: "systemLanguage",
  tablevalues: "tableValues",
  targetx: "targetX",
  targety: "targetY",
  textlength: "textLength",
  viewbox: "viewBox",
  viewtarget: "viewTarget",
  xchannelselector: "xChannelSelector",
  ychannelselector: "yChannelSelector",
  zoomandpan: "zoomAndPan"
};

const MANAGED_TELEPORT_HTML_BREAKOUT_TAGS = "|b|big|blockquote|body|br|center|code|dd|div|dl|dt|em|embed|h1|h2|h3|h4|h5|h6|head|hr|i|img|li|listing|menu|meta|nobr|ol|p|pre|ruby|s|small|span|strong|strike|sub|sup|table|tt|u|ul|var|";

function managedTeleportUsesHtmlBreakout(child) {
  const childLocalName = String(child?.localName || child || "").toLowerCase();
  return (
    MANAGED_TELEPORT_HTML_BREAKOUT_TAGS.includes("|" + childLocalName + "|")
    || (
      childLocalName === "font"
      && ["color", "face", "size"].some((name) => child?.hasAttribute?.(name))
    )
  );
}

function managedTeleportElementNamespace(parent, child) {
  const parentNamespace = managedTeleportEffectiveNamespace(parent);
  const parentLocalName = String(parent?.localName || "").toLowerCase();
  const childLocalName = String(child?.localName || child || "").toLowerCase();

  if (parentNamespace === SVG_NAMESPACE) {
    if (["foreignobject", "desc", "title"].includes(parentLocalName)) {
      if (childLocalName === "svg") return SVG_NAMESPACE;
      if (childLocalName === "math") return MATHML_NAMESPACE;
      return XHTML_NAMESPACE;
    }
    if (managedTeleportUsesHtmlBreakout(child)) {
      return XHTML_NAMESPACE;
    }
    return SVG_NAMESPACE;
  }

  if (parentNamespace === MATHML_NAMESPACE) {
    if (
      ["mi", "mo", "mn", "ms", "mtext"].includes(parentLocalName)
      && !["mglyph", "malignmark"].includes(childLocalName)
    ) {
      if (childLocalName === "svg") return SVG_NAMESPACE;
      if (childLocalName === "math") return MATHML_NAMESPACE;
      return XHTML_NAMESPACE;
    }
    if (parentLocalName === "annotation-xml") {
      if (childLocalName === "svg") return SVG_NAMESPACE;
      if (
        ["text/html", "application/xhtml+xml"].includes(
          String(parent?.getAttribute?.("encoding") || "").toLowerCase()
        )
      ) {
        if (childLocalName === "math") return MATHML_NAMESPACE;
        return XHTML_NAMESPACE;
      }
      return MATHML_NAMESPACE;
    }
    if (managedTeleportUsesHtmlBreakout(child)) {
      return XHTML_NAMESPACE;
    }
    return MATHML_NAMESPACE;
  }

  if (childLocalName === "svg") return SVG_NAMESPACE;
  if (childLocalName === "math") return MATHML_NAMESPACE;
  return XHTML_NAMESPACE;
}

function managedTeleportElementName(localName, namespace) {
  const normalized = String(localName || "").toLowerCase();
  return namespace === SVG_NAMESPACE
    ? (MANAGED_TELEPORT_SVG_TAG_NAMES[normalized] || normalized)
    : normalized;
}

const MANAGED_TELEPORT_MATHML_ATTRIBUTE_NAMES = {
  definitionurl: "definitionURL"
};

function copyManagedTeleportElementAttributes(source, target, namespace) {
  for (const attribute of Array.from(source.attributes ?? [])) {
    const lowerName = String(attribute.name || "").toLowerCase();
    const adjustedName = namespace === SVG_NAMESPACE
      ? (MANAGED_TELEPORT_SVG_ATTRIBUTE_NAMES[lowerName] || attribute.name)
      : namespace === MATHML_NAMESPACE
        ? (MANAGED_TELEPORT_MATHML_ATTRIBUTE_NAMES[lowerName] || attribute.name)
        : attribute.name;
    if (attribute.namespaceURI) {
      target.setAttributeNS(attribute.namespaceURI, adjustedName, attribute.value);
    } else if (lowerName === "xmlns" || lowerName.startsWith("xmlns:")) {
      target.setAttributeNS("http://www.w3.org/2000/xmlns/", lowerName, attribute.value);
    } else if (lowerName.startsWith("xlink:")) {
      target.setAttributeNS("http://www.w3.org/1999/xlink", adjustedName, attribute.value);
    } else if (lowerName.startsWith("xml:")) {
      target.setAttributeNS("http://www.w3.org/XML/1998/namespace", adjustedName, attribute.value);
    } else {
      target.setAttribute(adjustedName, attribute.value);
    }
  }
}

function cloneManagedTeleportNodeForContext(node, parent) {
  if (node.nodeType !== 1) {
    return node.cloneNode(true);
  }

  const namespace = managedTeleportElementNamespace(parent, node);
  const name = managedTeleportElementName(node.localName, namespace);
  const cloned = document.createElementNS(namespace, name);
  copyManagedTeleportElementAttributes(node, cloned, namespace);
  for (const child of Array.from(node.childNodes ?? [])) {
    cloned.appendChild(cloneManagedTeleportNodeForContext(child, cloned));
  }
  return cloned;
}

function parseManagedTeleportNamespacedMarkup(markup, target) {
  const template = document.createElement("template");
  template.innerHTML = markup;
  return Array.from(template.content.childNodes).map((node) =>
    cloneManagedTeleportNodeForContext(node, target)
  );
}

function parseManagedTeleportMarkup(markup, target) {
  const namespace = managedTeleportEffectiveNamespace(target);
  const localName = String(target?.localName || "").toLowerCase();

  if (
    namespace === SVG_NAMESPACE
    || namespace === MATHML_NAMESPACE
    || localName === "svg"
    || localName === "math"
  ) {
    return parseManagedTeleportNamespacedMarkup(markup, target);
  }

  if (target?.cloneNode) {
    try {
      const context = target.cloneNode(false);
      if ("innerHTML" in context) {
        context.innerHTML = markup;
        const nodes = Array.from(context.childNodes);
        if (nodes.length || !markup) return nodes;
      }
    } catch {
    }
  }

  if (typeof document.createRange === "function" && target) {
    try {
      const range = document.createRange();
      range.selectNodeContents(target);
      const nodes = Array.from(range.createContextualFragment(markup).childNodes);
      if (nodes.length || !markup) return nodes;
    } catch {
    }
  }

  const template = document.createElement("template");
  template.innerHTML = markup;
  return Array.from(template.content.childNodes);
}

function managedTeleportInitialNodes(source, target, recoverFostered = false) {
  if (isManagedTeleportCommentSource(source)) {
    const inlineNodes = managedTeleportInlineNodes(source);
    if (recoverFostered) {
      const fosteredNodes = managedTeleportFosterParentedNodes(source);
      if (fosteredNodes.length) {
        new Set([...fosteredNodes, ...inlineNodes]).forEach((node) => node.remove());
        const markup = decodeManagedTeleportSourceMetadata(source).html || "";
        return markup ? parseManagedTeleportMarkup(markup, target) : [];
      }
    }
    if (inlineNodes.length) return inlineNodes;
    const markup = decodeManagedTeleportSourceMetadata(source).html || "";
    return markup ? parseManagedTeleportMarkup(markup, target) : [];
  }
  if (isManagedTeleportTemplateSource(source)) {
    const templateNodes = Array.from(source.content?.childNodes ?? []);
    return templateNodes.length ? templateNodes : managedTeleportInlineNodes(source);
  }
  return Array.from(source.childNodes ?? []);
}

function nestedManagedTeleportSources(content) {
  const sources = [];
  const seen = new Set();
  const add = (source) => {
    if (!source || seen.has(source)) return;
    seen.add(source);
    sources.push(source);
  };
  for (const node of managedTeleportRangeNodes(content)) {
    if (isManagedTeleportCommentSource(node) || isManagedTeleportElementSource(node)) {
      add(node);
    }
    if (node.nodeType === 1) {
      for (const source of managedTeleportSources(node)) {
        add(source);
      }
    }
  }
  return sources;
}

function managedTeleportContentContainsTarget(content, target, seen = new Set()) {
  if (!content || !target || seen.has(content)) return false;
  seen.add(content);
  if (managedTeleportRangeNodes(content).some((node) =>
    node === target || Boolean(node.nodeType === 1 && node.contains?.(target))
  )) {
    return true;
  }
  for (const nestedSource of nestedManagedTeleportSources(content)) {
    const nestedContent = managedTeleportContent.get(nestedSource);
    if (managedTeleportContentContainsTarget(nestedContent, target, seen)) {
      return true;
    }
  }
  return false;
}

function restoreManagedTeleportsWithinContent(content) {
  for (const source of nestedManagedTeleportSources(content).reverse()) {
    const nestedContent = managedTeleportContent.get(source);
    if (!nestedContent) continue;
    restoreManagedTeleportsWithinContent(nestedContent);
    restoreManagedTeleport(source, nestedContent);
  }
}

function retokenizeNestedManagedTeleportLiveTargets(content) {
  const records = [];
  for (const source of nestedManagedTeleportSources(content)) {
    if (!isManagedTeleportCommentSource(source)) continue;
    const target = managedTeleportLiveTargets.get(source);
    if (!isManagedTeleportElementTarget(target)) continue;
    const metadata = decodeManagedTeleportSourceMetadata(source);
    const originalData = source.data;
    const originalMetadata = { ...metadata };
    metadata.liveTargetToken = createManagedTeleportLiveTargetToken(target);
    source.data = MANAGED_TELEPORT_SOURCE_PREFIX + encodeClientTeleportSourceMetadata(metadata);
    managedTeleportSourceMetadataCache.set(source, metadata);
    records.push({ source, originalData, originalMetadata });
  }
  return records;
}

function restoreRetokenizedNestedManagedTeleportSources(records) {
  for (const record of records) {
    record.source.data = record.originalData;
    managedTeleportSourceMetadataCache.set(record.source, record.originalMetadata);
  }
}

function managedTeleportNodeContextsMatch(actual, expected) {
  if (!actual || !expected || actual.nodeType !== expected.nodeType) return false;
  if (actual.nodeType === 1) {
    if (
      actual.namespaceURI !== expected.namespaceURI
      || String(actual.localName || "").toLowerCase() !== String(expected.localName || "").toLowerCase()
    ) {
      return false;
    }
    const actualChildren = Array.from(actual.childNodes ?? []);
    const expectedChildren = Array.from(expected.childNodes ?? []);
    if (actualChildren.length !== expectedChildren.length) return false;
    return actualChildren.every((child, index) =>
      managedTeleportNodeContextsMatch(child, expectedChildren[index])
    );
  }
  return true;
}

function managedTeleportRangeMatchesParsedContext(actualNodes, expectedNodes) {
  if (actualNodes.length !== expectedNodes.length) return false;
  return actualNodes.every((node, index) =>
    managedTeleportNodeContextsMatch(node, expectedNodes[index])
  );
}

function managedTeleportSourceMarkup(content) {
  const source = content?.source;
  const sourceMarkup = isManagedTeleportCommentSource(source)
    ? (decodeManagedTeleportSourceMetadata(source).html || "")
    : "";
  const liveNodes = managedTeleportRangeNodes(content);
  if (liveNodes.length === 0) return sourceMarkup;

  if (content?.parseContext === XHTML_NAMESPACE + ":table") {
    const leadingMarkers = "(?:\\s*<!--[\\s\\S]*?-->\\s*)*";
    const expectedWrapper = new RegExp("^" + leadingMarkers + "<tr(?=[\\s>])", "i").test(sourceMarkup)
      ? "tbody"
      : new RegExp("^" + leadingMarkers + "<col(?=[\\s/>])", "i").test(sourceMarkup)
        ? "colgroup"
        : "";
    const wrapperNode = expectedWrapper
      ? liveNodes.find((node) =>
        node.nodeType === 1 && String(node.localName || "").toLowerCase() === expectedWrapper
      )
      : null;
    if (wrapperNode) {
      const flattenedNodes = liveNodes.flatMap((node) =>
        node === wrapperNode ? Array.from(wrapperNode.childNodes ?? []) : [node]
      );
      return managedTeleportNodesMarkup(flattenedNodes);
    }
  }

  return managedTeleportNodesMarkup(liveNodes);
}

function managedTeleportNodeNamespaceMatchesTarget(node, parent) {
  if (node?.nodeType !== 1) return true;
  const expectedNamespace = managedTeleportElementNamespace(parent, node);
  const actualNamespace = node.namespaceURI || XHTML_NAMESPACE;
  if (actualNamespace !== expectedNamespace) return false;
  return Array.from(node.childNodes ?? []).every((child) =>
    managedTeleportNodeNamespaceMatchesTarget(child, node)
  );
}

function managedTeleportRangeNamespacesMatchTarget(nodes, target) {
  return nodes.every((node) => managedTeleportNodeNamespaceMatchesTarget(node, target));
}

function normalizeManagedTeleportNamespace(content, target) {
  const targetContext = managedTeleportParsingContext(target);
  const nodes = managedTeleportRangeNodes(content);
  if (nodes.length === 0) {
    content.parseContext = targetContext;
    return false;
  }
  if (content.parseContext === targetContext) {
    return false;
  }
  if (
    content.parseContext == null
    && targetContext === XHTML_NAMESPACE + ":default"
    && managedTeleportRangeNamespacesMatchTarget(nodes, target)
  ) {
    content.parseContext = targetContext;
    return false;
  }

  restoreManagedTeleportsWithinContent(content);
  const retokenizedSources = retokenizeNestedManagedTeleportLiveTargets(content);
  let markup;
  try {
    markup = managedTeleportSourceMarkup(content);
  } finally {
    restoreRetokenizedNestedManagedTeleportSources(retokenizedSources);
  }
  const currentNodes = managedTeleportRangeNodes(content);
  const parsedNodes = parseManagedTeleportMarkup(markup, target);
  if (
    content.parseContext == null
    && managedTeleportRangeMatchesParsedContext(currentNodes, parsedNodes)
  ) {
    content.parseContext = targetContext;
    return false;
  }

  for (const node of currentNodes) {
    if (node.nodeType === 1) {
      cleanupManagedTeleports(node);
      unmountVueIslands(node);
    }
    node.remove();
  }
  for (const node of parsedNodes) {
    content.end.parentNode?.insertBefore(node, content.end);
  }
  content.parseContext = targetContext;
  return true;
}

function initializeManagedTeleportContent(content, options = {}) {
  const root = content?.start?.parentNode;
  if (!root) return;
  for (const source of nestedManagedTeleportSources(content)) {
    syncManagedTeleportSource(source, options);
  }
  initializeManagedRuntimeContent(root, { dispatchPageEvents: false });
}

function moveManagedTeleportRange(content, target, options = {}) {
  if (!content?.start || !content?.end || !target) return;
  let moved = false;
  if (content.start.parentNode !== target || content.end.parentNode !== target) {
    const fragment = document.createDocumentFragment();
    let node = content.start;
    while (node) {
      const next = node.nextSibling;
      fragment.appendChild(node);
      if (node === content.end) break;
      node = next;
    }
    target.appendChild(fragment);
    moved = true;
  }
  const recreated = normalizeManagedTeleportNamespace(content, target);
  if ((moved || recreated) && options.initialize !== false) {
    initializeManagedTeleportContent(content, options);
  }
}

function nextUnclaimedManagedTeleportTargetStart(target) {
  return Array.from(target?.childNodes ?? []).find((node) => {
    const data = node?.nodeType === 8 ? String(node.data || "") : "";
    return (
      (data === "resux-teleport-start" || data.startsWith("resux-teleport-start:"))
      && !managedTeleportClaimedTargetStarts.has(node)
    );
  }) || null;
}

function adoptManagedTeleportTargetRange(source, target) {
  const ssrKey = String(decodeManagedTeleportSourceMetadata(source).ssrKey || "");
  const suffix = ssrKey ? ":" + ssrKey : "";
  const start = Array.from(target?.childNodes ?? []).find((node) =>
    node.nodeType === 8
    && String(node.data || "") === "resux-teleport-start" + suffix
    && !managedTeleportClaimedTargetStarts.has(node)
  );
  if (!start) return null;
  let nestedSourceDepth = 0;
  let end = start.nextSibling;
  while (end) {
    if (!ssrKey && isManagedTeleportCommentSource(end)) nestedSourceDepth += 1;
    else if (!ssrKey && isManagedTeleportCommentEnd(end) && nestedSourceDepth) nestedSourceDepth -= 1;
    else if (end.nodeType === 8 && String(end.data || "") === "resux-teleport-end" + suffix) {
      managedTeleportClaimedTargetStarts.add(start);
      return { start, end, source, parseContext: null };
    }
    end = end.nextSibling;
  }
  return null;
}

function createManagedTeleportTargetRange(source, target, before = null) {
  const start = document.createComment("resux-teleport-start");
  const end = document.createComment("resux-teleport-end");
  managedTeleportClaimedTargetStarts.add(start);
  target.insertBefore(start, before);
  target.insertBefore(end, before);
  return { start, end, source, parseContext: null };
}

function ensureManagedTeleportTargetRange(source, target, allowAdoption = true) {
  let content = managedTeleportContent.get(source);
  if (!content) {
    const insertionPoint = allowAdoption ? null : nextUnclaimedManagedTeleportTargetStart(target);
    content = (allowAdoption ? adoptManagedTeleportTargetRange(source, target) : null)
      || createManagedTeleportTargetRange(source, target, insertionPoint);
    managedTeleportContent.set(source, content);
    managedTeleportMountedSources.add(source);
  }
  return content;
}

function initializeRestoredManagedTeleportNodes(nodes, parent, options = {}) {
  const sources = new Set();
  for (const node of nodes) {
    if (isManagedTeleportCommentSource(node) || isManagedTeleportElementSource(node)) {
      sources.add(node);
    }
    if (node.nodeType === 1) {
      for (const source of managedTeleportSources(node)) {
        sources.add(source);
      }
    }
  }
  for (const source of sources) {
    syncManagedTeleportSource(source, options);
  }
  initializeManagedRuntimeContent(parent, { dispatchPageEvents: false });
}

function restoreManagedTeleport(source, content, options = {}) {
  if (!content) return;
  const end = (isManagedTeleportCommentSource(source) || isManagedTeleportTemplateSource(source))
    ? managedTeleportSourceEnd(source)
    : null;
  const parent = end?.parentNode
    || (isManagedTeleportCommentSource(source) || isManagedTeleportTemplateSource(source)
      ? source.parentNode
      : source);
  if (!parent) return;

  let restoredNodes = managedTeleportRangeNodes(content);
  const restoreParents = content.restoreParents?.length === restoredNodes.length
    && content.restoreParents.every((restoreParent) => restoreParent?.isConnected)
    ? content.restoreParents
    : null;
  const splitParents = restoreParents?.some((restoreParent) => restoreParent !== parent);
  let recreated = false;
  if (splitParents) {
    restoredNodes = restoredNodes.map((node, index) => {
      const restoreParent = restoreParents[index];
      if (!managedTeleportNodeNamespaceMatchesTarget(node, restoreParent)) {
        const parsed = parseManagedTeleportMarkup(
          managedTeleportNodesMarkup([node]),
          restoreParent
        )[0];
        if (parsed) {
          if (node.nodeType === 1) {
            cleanupManagedTeleports(node);
            unmountVueIslands(node);
          }
          node.remove();
          node = parsed;
          recreated = true;
        }
      }
      restoreParent.insertBefore(node, restoreParent === end?.parentNode ? end : null);
      return node;
    });
  } else {
    recreated = normalizeManagedTeleportNamespace(content, parent);
    restoredNodes = managedTeleportRangeNodes(content);
    const reference = end || (source.nextSibling ?? null);
    restoredNodes.forEach((node) => {
      if (parent === source && source.appendChild) source.appendChild(node);
      else parent.insertBefore(node, reference);
    });
  }

  if (options.preserveTargetAnchors !== true) {
    content.start?.remove();
    content.end?.remove();
    managedTeleportContent.delete(source);
    managedTeleportMountedSources.delete(source);
  }
  if (recreated) {
    initializeRestoredManagedTeleportNodes(restoredNodes, splitParents ? document : parent, options);
  }
}

function populateManagedTeleportRange(source, content, target, options = {}) {
  if (managedTeleportRangeNodes(content).length === 0) {
    const inlineNodes = isManagedTeleportCommentSource(source)
      ? managedTeleportInlineNodes(source)
      : [];
    const initialNodes = managedTeleportInitialNodes(source, target, true);
    content.restoreParents = !managedTeleportFosterParentedNodes(source).length
      && inlineNodes.length === initialNodes.length
      && inlineNodes.every((node, index) => node === initialNodes[index])
      ? inlineNodes.map((node) => node.parentNode)
      : null;
    for (const node of initialNodes) {
      content.end.parentNode?.insertBefore(node, content.end);
    }
    content.parseContext = null;
  }
  normalizeManagedTeleportNamespace(content, target);
  initializeManagedTeleportContent(content, options);
}

function syncManagedTeleportSource(source, options = {}) {
  if (!source?.isConnected) {
    deferredManagedTeleportSources.delete(source);
    return;
  }
  const metadata = decodeManagedTeleportSourceMetadata(source);
  claimManagedTeleportPendingLiveTarget(source, metadata);
  const disabled = Boolean(metadata.disabled);
  const target = managedTeleportTarget(source);
  let content = managedTeleportContent.get(source);
  const mountedContentContainsTarget = managedTeleportContentContainsTarget(content, target);
  const sourceContainsTarget = managedTeleportSourceContainsTarget(source, target);
  const validTarget = Boolean(
    target
    && target !== source
    && !sourceContainsTarget
    && !mountedContentContainsTarget
  );

  if (disabled) {
    deferredManagedTeleportSources.delete(source);
    if (!validTarget) {
      if (content) {
        restoreManagedTeleport(source, content, options);
      } else {
        const end = managedTeleportSourceEnd(source);
        const parent = end?.parentNode;
        if (parent) {
          const nodes = managedTeleportInitialNodes(source, parent);
          nodes.forEach((node) => parent.insertBefore(node, end));
          initializeRestoredManagedTeleportNodes(nodes, parent, options);
        }
      }
      return;
    }
    if (content) {
      restoreManagedTeleport(source, content, { ...options, preserveTargetAnchors: true });
    } else {
      content = ensureManagedTeleportTargetRange(source, target, false);
    }
    moveManagedTeleportRange(content, target, { ...options, initialize: false });
    return;
  }

  if (!validTarget) {
    if (
      !target
      && options.deferMissingTarget === true
      && Boolean(metadata.defer)
    ) {
      deferredManagedTeleportSources.add(source);
    } else {
      deferredManagedTeleportSources.delete(source);
    }
    restoreManagedTeleport(source, content, options);
    return;
  }

  deferredManagedTeleportSources.delete(source);
  content = ensureManagedTeleportTargetRange(source, target);
  const hadNodes = managedTeleportRangeNodes(content).length > 0;
  moveManagedTeleportRange(content, target, options);
  if (!hadNodes || managedTeleportRangeNodes(content).length === 0) {
    populateManagedTeleportRange(source, content, target, options);
  }
}

function mountManagedTeleports(root = document, options = {}) {
  for (const source of managedTeleportSources(root)) {
    syncManagedTeleportSource(source, options);
  }
  if (options.deferMissingTarget === true && deferredManagedTeleportSources.size) {
    replayDeferredManagedTeleportPatches(flushDeferredManagedTeleports(true));
  }
}

function flushDeferredManagedTeleports(force = false) {
  if (!force && managedTeleportPatchBatchDepth > 0) {
    managedTeleportFlushRequested = true;
    return [];
  }
  managedTeleportFlushRequested = false;
  const mounted = [];
  let progressed;
  do {
    progressed = false;
    for (const source of [...deferredManagedTeleportSources]) {
      deferredManagedTeleportSources.delete(source);
      if (!source?.isConnected) {
        progressed = true;
        continue;
      }
      const hadContent = managedTeleportContent.has(source);
      syncManagedTeleportSource(source, { deferMissingTarget: true });
      if (!deferredManagedTeleportSources.has(source)) {
        progressed = true;
        if (!hadContent && managedTeleportContent.has(source)) mounted.push(source);
      }
    }
  } while (progressed && deferredManagedTeleportSources.size);
  return mounted;
}

function managedTeleportPatchSelector(scopeId, patch) {
  const key = scopeId + ":" + patch.id;
  return patch.type === "text"
    ? '[data-rx-text="' + key + '"]'
    : patch.type === "attr"
      ? '[data-rx-attr-' + patch.id + '="' + key + '"]'
      : patch.type === "html"
        ? '[data-rx-html-' + patch.id + '="' + key + '"]'
        : '[data-rx-block="' + key + '"]';
}

function managedTeleportHasPatch(source, selector) {
  const content = managedTeleportContent.get(source);
  return Boolean(content && (
    managedTeleportRangeNodes(content).some((node) =>
      node.nodeType === 1 && (node.matches?.(selector) || node.querySelector?.(selector))
    )
    || nestedManagedTeleportSources(content).some((nested) =>
      managedTeleportHasPatch(nested, selector)
    )
  ));
}

function replayDeferredManagedTeleportPatches(sources) {
  for (const [scopeId, patches] of deferredManagedTeleportPatches) {
    const replay = patches.filter((patch) =>
      (
        patch.type === "attr"
        && String(patch.attr || "").startsWith("data-rx-teleport-")
      )
      || sources.some((source) =>
        managedTeleportHasPatch(source, managedTeleportPatchSelector(scopeId, patch))
      )
    );
    if (replay.length) {
      applyPatches(scopeId, replay, {
        flushDeferredTeleports: false,
        recordDeferredTeleportPatches: false
      });
    }
  }
  if (!deferredManagedTeleportSources.size) deferredManagedTeleportPatches.clear();
}

function beginManagedTeleportPatchBatch() {
  managedTeleportPatchBatchDepth += 1;
}

function endManagedTeleportPatchBatch() {
  managedTeleportPatchBatchDepth = Math.max(0, managedTeleportPatchBatchDepth - 1);
  if (
    managedTeleportPatchBatchDepth === 0
    && (managedTeleportFlushRequested || deferredManagedTeleportSources.size > 0)
  ) {
    replayDeferredManagedTeleportPatches(flushDeferredManagedTeleports());
  }
}

function updateManagedTeleportCommentSource(source, attr, value, bindingKey = "") {
  if (!isManagedTeleportCommentSource(source)) return;
  const metadata = decodeManagedTeleportSourceMetadata(source);
  if (attr === "data-rx-teleport-to") {
    if (bindingKey) metadata.toBinding = bindingKey;
    if (isManagedTeleportElementTarget(value)) {
      managedTeleportLiveTargets.set(source, value);
    } else {
      managedTeleportLiveTargets.delete(source);
      metadata.to = normalizeClientTeleportTarget(value);
    }
  } else if (attr === "data-rx-teleport-disabled") {
    metadata.disabled = value === "true";
  } else if (attr === "data-rx-teleport-defer") {
    metadata.defer = value === "true";
  }
  source.data = MANAGED_TELEPORT_SOURCE_PREFIX + encodeClientTeleportSourceMetadata(metadata);
  managedTeleportSourceMetadataCache.set(source, metadata);
  registerManagedTeleportSourceBindings(source);
}

function restorePreservedManagedTeleportFromRoot(source, replacedRoot, visited, restoredSources) {
  if (!source || visited.has(source)) return;
  visited.add(source);
  const content = managedTeleportContent.get(source);
  if (!content) return;

  for (const nestedSource of nestedManagedTeleportSources(content)) {
    restorePreservedManagedTeleportFromRoot(nestedSource, replacedRoot, visited, restoredSources);
  }

  const parent = content.start?.parentNode;
  if (parent && (parent === replacedRoot || replacedRoot.contains?.(parent))) {
    restoreManagedTeleport(source, content);
    restoredSources.add(source);
  }
}

function prepareManagedTeleportsForTargetReplacement(replacedRoot, sourceScopeRoot = null) {
  const visited = new Set();
  const restoredSources = new Set();
  for (const source of [...managedTeleportMountedSources]) {
    if (!source?.isConnected) {
      managedTeleportMountedSources.delete(source);
      continue;
    }
    if (replacedRoot.contains?.(source)) continue;
    if (sourceScopeRoot && source !== sourceScopeRoot && !sourceScopeRoot.contains?.(source)) continue;
    restorePreservedManagedTeleportFromRoot(source, replacedRoot, visited, restoredSources);
  }
  return [...restoredSources];
}

function preparePreservedManagedTeleports(scopeRoot, replacedRoot) {
  return prepareManagedTeleportsForTargetReplacement(replacedRoot, scopeRoot);
}

function remountPreparedManagedTeleports(sources, options = {}) {
  for (const source of sources) {
    if (source?.isConnected) {
      syncManagedTeleportSource(source, options);
    }
  }
}


function cleanupManagedTeleportSource(source) {
  deferredManagedTeleportSources.delete(source);
  if (!deferredManagedTeleportSources.size) deferredManagedTeleportPatches.clear();
  managedTeleportLiveTargets.delete(source);
  unregisterManagedTeleportSourceBindings(source);
  const content = managedTeleportContent.get(source);
  if (!content) return;

  const nodes = managedTeleportRangeNodes(content);
  for (const nestedSource of nestedManagedTeleportSources(content).reverse()) {
    if (nestedSource !== source) {
      cleanupManagedTeleportSource(nestedSource);
    }
  }
  for (const node of nodes) {
    if (node.nodeType === 1) {
      cleanupManagedTeleports(node);
      unmountVueIslands(node);
    }
  }
  for (const node of nodes) {
    node.remove();
  }
  content.start?.remove();
  content.end?.remove();
  managedTeleportContent.delete(source);
  managedTeleportMountedSources.delete(source);
}

function cleanupManagedTeleports(root) {
  for (const source of managedTeleportSources(root)) {
    cleanupManagedTeleportSource(source);
  }
}

function initializeManagedRuntimeContent(root = document, options = {}) {
  void mountVueIslands(root);
  activateDeferredLazyMedia(root, { dispatchPageEvents: options.dispatchPageEvents !== false });
  applyManagedVideoDefaultSpeeds(root);
  applyReducedMotionVideoPreference(root);
  initializeManagedVideoControls(root);
  registerDelegatedEventsFromDom(root);
}

function replaceRouteHtml(root, html, preserveLayout = true) {
  const currentLayout = root.querySelector("[data-rx-layout]");
  const template = document.createElement("template");
  template.innerHTML = html;
  const nextLayout = template.content.querySelector("[data-rx-layout]");

  if (
    !preserveLayout
    || !currentLayout
    || !nextLayout
    || currentLayout.getAttribute("data-rx-layout") !== nextLayout.getAttribute("data-rx-layout")
  ) {
    cleanupManagedTeleports(root);
    unmountVueIslands(root);
    root.innerHTML = html;
    reconcileDefaultTeleportTarget();
    return { root, scopeIds: new Set() };
  }

  const currentPage = currentLayout.querySelector("[data-rx-page]");
  const nextPage = nextLayout.querySelector("[data-rx-page]");
  if (!currentPage || !nextPage) {
    cleanupManagedTeleports(root);
    unmountVueIslands(root);
    root.innerHTML = html;
    reconcileDefaultTeleportTarget();
    return { root, scopeIds: new Set() };
  }

  const externalTeleportSources = preparePreservedManagedTeleports(currentLayout, currentPage);
  const preservedScopeIds = collectScopeIds(currentLayout, currentPage);
  for (const scopeId of collectScopeIds(currentPage)) {
    if (!preservedScopeIds.has(scopeId)) deferredManagedTeleportPatches.delete(scopeId);
  }
  cleanupManagedTeleports(currentPage);
  unmountVueIslands(currentPage);
  currentPage.innerHTML = nextPage.innerHTML;
  reconcileDefaultTeleportTarget();
  remountPreparedManagedTeleports(externalTeleportSources, { deferMissingTarget: true });
  return { root: currentPage, scopeIds: preservedScopeIds };
}

function animateRouteSwap(root) {
  const page = root?.matches?.("[data-rx-page]") ? root : root?.querySelector?.("[data-rx-page]");
  const target = page?.firstElementChild;
  if (
    !target
    || typeof target.animate !== "function"
    || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  ) {
    return;
  }
  target.animate(
    [
      { opacity: 0.86, transform: "translate3d(0, 8px, 0)" },
      { opacity: 1, transform: "translate3d(0, 0, 0)" }
    ],
    { duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
  );
}

function didClientLocaleChange(previousPayload, nextPayload) {
  const config = normalizeClientI18nConfig(
    nextPayload?.config ?? previousPayload?.config ?? { public: {} }
  );
  if (!config || config.strategy === "no_prefix") {
    return false;
  }

  const previousPath = previousPayload?.route?.path || "/";
  const nextPath = nextPayload?.route?.path || previousPath;
  return resolveClientI18nLocaleCode(config, previousPath)
    !== resolveClientI18nLocaleCode(config, nextPath);
}

function mergePersistentLayoutPayload(previousPayload, nextPayload, preservedScopeIds) {
  if (!nextPayload) {
    return nextPayload;
  }

  if (previousPayload && previousPayload.scopes && nextPayload.scopes) {
    for (const scopeId of preservedScopeIds) {
      if (previousPayload.scopes[scopeId]) {
        nextPayload.scopes[scopeId] = previousPayload.scopes[scopeId];
      }
    }
  }

  return nextPayload;
}

function clearScopeCacheExcept(preservedScopeIds) {
  for (const scopeId of scopeCache.keys()) {
    if (!preservedScopeIds.has(scopeId)) {
      scopeCache.delete(scopeId);
    }
  }
}

async function applyDevUpdate(payload = {}) {
  devImportRevision = Number(payload.revision ?? Date.now());
  invalidateAllRoutePayloads();
  await hotUpdateActiveScopes();
}

async function hotUpdateActiveScopes() {
  const payload = globalThis.__RESUX__;
  if (!payload || !payload.scopes || !payload.modules) {
    return;
  }

  beginManagedTeleportPatchBatch();
  try {
    await Promise.all([...scopeCache.entries()].map(async ([scopeId, scopeRecord]) => {
    const serializedScope = payload.scopes[scopeId];
    if (!serializedScope) {
      scopeCache.delete(scopeId);
      return;
    }

    const component = await importComponent(serializedScope.moduleId, payload.modules, devImportRevision);
    const snapshot = {
      ...serializedScope,
      ...component.serialize(scopeRecord)
    };
    const nextScopeRecord = await component.createScope(snapshot, payload.route);
    scopeCache.set(scopeId, nextScopeRecord);
    const patches = component.render(nextScopeRecord);
    const serialized = component.serialize(nextScopeRecord);
    payload.scopes[scopeId].props = serialized.props;
    payload.scopes[scopeId].state = serialized.state;
    payload.scopes[scopeId].asyncData = serialized.asyncData;
    applyPatches(scopeId, patches, { flushDeferredTeleports: false });
  }));
  } finally {
    endManagedTeleportPatchBatch();
  }
}

function collectScopeIdsFromTeleportRange(source, ids, visitedTeleports) {
  if (!source || visitedTeleports.has(source)) return;
  visitedTeleports.add(source);
  const metadata = decodeManagedTeleportSourceMetadata(source);
  for (const binding of Object.values(metadata.bindings || {})) {
    const scopeId = String(binding || "").split(":")[0];
    if (scopeId) ids.add(scopeId);
  }
  const content = managedTeleportContent.get(source);
  if (!content) {
    if (metadata.html) {
      const template = document.createElement("template");
      template.innerHTML = metadata.html;
      for (const element of Array.from(template.content.querySelectorAll("*"))) {
        collectScopeIdFromElement(element, ids);
      }
      for (const nestedSource of managedTeleportSources(template.content)) {
        collectScopeIdsFromTeleportRange(nestedSource, ids, visitedTeleports);
      }
    }
    return;
  }

  for (const node of managedTeleportRangeNodes(content)) {
    if (isManagedTeleportCommentSource(node) || isManagedTeleportElementSource(node)) {
      collectScopeIdsFromTeleportRange(node, ids, visitedTeleports);
    }
    if (node.nodeType !== 1) continue;
    collectScopeIdFromElement(node, ids);
    for (const nestedSource of managedTeleportSources(node)) {
      collectScopeIdsFromTeleportRange(nestedSource, ids, visitedTeleports);
    }
    for (const element of Array.from(node.querySelectorAll ? node.querySelectorAll("*") : [])) {
      collectScopeIdFromElement(element, ids);
    }
  }
}

function collectScopeIds(root, exclude) {
  const ids = new Set();
  const visitedTeleports = new Set();

  for (const element of [root, ...Array.from(root.querySelectorAll ? root.querySelectorAll("*") : [])]) {
    if (exclude && (element === exclude || exclude.contains(element))) {
      continue;
    }
    collectScopeIdFromElement(element, ids);
  }

  for (const source of managedTeleportSources(root)) {
    if (exclude && exclude.contains?.(source)) {
      continue;
    }
    collectScopeIdsFromTeleportRange(source, ids, visitedTeleports);
  }

  return ids;
}

function collectScopeIdFromElement(element, ids) {
  for (const attribute of Array.from(element.attributes ?? [])) {
    const value = attribute.value;
    if (!value || !value.includes(":")) {
      continue;
    }
    const scopeId = value.split(":")[0];
    if (scopeId) {
      ids.add(scopeId);
    }
  }
}

async function mountVueIslandElement(el, islands) {
  if (mountedVueIslands.has(el) || mountingVueIslands.has(el) || !el.isConnected) {
    return;
  }

  const scheduledCancel = scheduledVueIslands.get(el);
  if (scheduledCancel) {
    scheduledCancel();
    scheduledVueIslands.delete(el);
  }

  const name = el.getAttribute("data-rx-vue-island");
  const modulePath = name ? islands[name] : null;
  if (!name || !modulePath) {
    el.setAttribute("data-rx-vue-error", "missing");
    return;
  }

  const token = { cancelled: false };
  mountingVueIslands.set(el, token);
  el.setAttribute("data-rx-vue-status", "loading");
  try {
    const props = JSON.parse(el.getAttribute("data-rx-vue-props") || "{}");
    const island = await import(/* @vite-ignore */ modulePath);
    if (token.cancelled || !el.isConnected) {
      return;
    }
    const app = island.mount ? island.mount(el, props) : null;
    if (token.cancelled || !el.isConnected) {
      if (app && typeof app.unmount === "function") {
        app.unmount();
      }
      return;
    }
    mountedVueIslands.set(el, app);
    el.setAttribute("data-rx-vue-status", "mounted");
    el.removeAttribute("data-rx-vue-error");
  } catch {
    if (!token.cancelled && el.isConnected) {
      el.setAttribute("data-rx-vue-error", "mount");
      el.setAttribute("data-rx-vue-status", "error");
    }
  } finally {
    if (mountingVueIslands.get(el) === token) {
      mountingVueIslands.delete(el);
    }
  }
}

async function mountVueIslands(root = document) {
  const payload = globalThis.__RESUX__;
  const islands = payload && payload.vueIslands ? payload.vueIslands : {};
  const elements = root.querySelectorAll ? root.querySelectorAll("[data-rx-vue-island]") : [];

  for (const el of elements) {
    if (mountedVueIslands.has(el) || scheduledVueIslands.has(el)) {
      continue;
    }

    const trigger = normalizeEnhancementTrigger(el.getAttribute("data-rx-vue-trigger"), "immediate");
    if (trigger === "immediate") {
      await mountVueIslandElement(el, islands);
      continue;
    }

    el.setAttribute("data-rx-vue-status", "scheduled");
    scheduledVueIslands.set(el, () => {});
    const cancel = scheduleEnhancementTrigger(
      "vue-island:" + (el.getAttribute("data-rx-vue-island") || "unknown"),
      trigger,
      el,
      async () => {
        await mountVueIslandElement(el, islands);
      },
    );
    if (scheduledVueIslands.has(el)) {
      scheduledVueIslands.set(el, cancel);
    } else {
      cancel();
    }
  }
}

function vueIslandBelongsToRoot(root, el) {
  return !root || root === el || Boolean(root.contains && root.contains(el));
}

function unmountVueIslands(root) {
  for (const [el, token] of mountingVueIslands.entries()) {
    if (!vueIslandBelongsToRoot(root, el)) continue;
    token.cancelled = true;
  }
  for (const [el, cancel] of scheduledVueIslands.entries()) {
    if (!vueIslandBelongsToRoot(root, el)) continue;
    cancel();
    scheduledVueIslands.delete(el);
  }
  for (const [el, app] of mountedVueIslands.entries()) {
    if (!vueIslandBelongsToRoot(root, el)) continue;
    if (app && typeof app.unmount === "function") {
      app.unmount();
    }
    mountedVueIslands.delete(el);
  }
}
`;
