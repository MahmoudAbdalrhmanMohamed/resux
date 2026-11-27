// Client runtime source, part 7 of 9. Concatenated by getClientRuntimeSource() in ../index.ts.
export const clientRuntimePart07 = String.raw`
function hasCompletedRouteStylePrefetch(payload,url){return routeStylePrefetchedDestinations.get(payload)?.has(url)===true}
function markCompletedRouteStylePrefetch(payload,url){let urls=routeStylePrefetchedDestinations.get(payload);if(!urls){urls=new Set();routeStylePrefetchedDestinations.set(payload,urls)}urls.add(url)}
async function prefetchNavigationTarget(event){
  const anchor=event.target?.closest?.("a[href]"),routePath=getPrefetchPath(anchor,event.target);
  if(!routePath)return;
  const url=resolveSameOriginAnchorTarget(anchor).url?.href||new URL(routePath,location.href).href;
  const key=normalizeRoutePayloadKey(routePath);
  if(routeStylePrefetchPromises.has(url)||countInFlightRoutePrefetches() >= ROUTE_PREFETCH_MAX_IN_FLIGHT||isRoutePrefetchCoolingDown(key))return;
  try{
    const result=routePayloadCache.has(key)?readCachedRoutePayload(key):routePayloadRequests.has(key)?await routePayloadRequests.get(key)?.promise:await loadRoute(key,{ reason: "prefetch" });
    if(hasCompletedRouteStylePrefetch(result,url))return;
    const styles=preloadRouteHeadStyles(result?.head,url,null,true);
    if(!styles){markCompletedRouteStylePrefetch(result,url);return}
    routeStylePrefetchPromises.set(url,styles);
    try{await styles}finally{if(routeStylePrefetchPromises.get(url)===styles)routeStylePrefetchPromises.delete(url);markCompletedRouteStylePrefetch(result,url)}
  }catch(error){logManagedMediaDebug("router-prefetch-failed",{path:routePath,message:error instanceof Error?error.message:String(error)})}
}

function getPrefetchPath(anchor,eventTarget=null){
  if(!anchor)return null;
  const resolution=resolveSameOriginAnchorTarget(anchor),target=resolution.url;
  if(!target){logManagedMediaDebug("router-prefetch-ignore",{reason:resolution.reason,href:anchor.getAttribute("href")||""});return null}
  if (isManagedMediaAssetPath(target.pathname)){logManagedMediaDebug("router-prefetch-ignore",{reason:"media-static-path",href:target.href});return null}
  if (!isRouterManagedPagePath(target.pathname)){logManagedMediaDebug("router-prefetch-ignore",{ reason: "non-page-route", href:target.href});return null}
  if(shouldIgnoreNavigationTarget(eventTarget,anchor)){logManagedMediaDebug("router-prefetch-ignore",{reason:"ignored-event-target",href:target.href});return null}
  const routePath=normalizeRoutePayloadKey(target.pathname+target.search);
  return routePath===normalizeRoutePayloadKey(location.pathname+location.search)?null:routePath;
}
function isRouterManagedPagePath(pathname){
  const normalized=String(pathname||"").toLowerCase();
  return !!normalized
    && normalized!=="/api" && !normalized.startsWith("/api/")
    && normalized!=="/__resux" && !normalized.startsWith("/__resux/")
    && normalized!=="/_resux" && !normalized.startsWith("/_resux/");
}
function normalizeRoutePayloadKey(routePath){
  const target=new URL(String(routePath||"/"),typeof location!=="undefined"&&location.href?location.href:"http://resux.local/");
  const pathname=target.pathname==="/"?"/":target.pathname.replace(/\/+$/, "")||"/";
  return pathname + target.search;
}

function setBoundedRouteMapEntry(map, key, value, maxEntries){
  if(map.has(key))map.delete(key);map.set(key,value);
  while (map.size > maxEntries){const oldestKey=map.keys().next().value;if(oldestKey===undefined)break;map.delete(oldestKey)}
}
function readCachedRoutePayload(key){
  if(!routePayloadCache.has(key))return;
  const cached=routePayloadCache.get(key);routePayloadCache.delete(key);routePayloadCache.set(key,cached);return cached;
}
function countInFlightRoutePrefetches(){
  let count=routeStylePrefetchPromises.size;
  for(const entry of routePayloadRequests.values())if(entry?.reason==="prefetch")count++;
  return count;
}
function isRoutePrefetchCoolingDown(routePath,now=Date.now()){
  const key=normalizeRoutePayloadKey(routePath),failure=routePayloadFailures.get(key);
  if(!failure)return false;
  if(now-failure.failedAt>=ROUTE_PREFETCH_FAILURE_COOLDOWN_MS){routePayloadFailures.delete(key);return false}
  return true;
}
function invalidateRoutePayload(routePath){
  const key=normalizeRoutePayloadKey(routePath);routePayloadCache.delete(key);routePayloadFailures.delete(key);
}
function invalidateAllRoutePayloads(){
  routePayloadGeneration += 1;
  routePayloadCache.clear();routePayloadRequests.clear();routePayloadFailures.clear();
}
async function loadRoute(routePath, options = {}){
  const key=normalizeRoutePayloadKey(routePath),reason=options.reason==="prefetch"?"prefetch":"navigation",force=options.force===true;
  if(force)invalidateRoutePayload(key);else if(routePayloadCache.has(key))return readCachedRoutePayload(key);
  if(reason==="prefetch"&&!force&&isRoutePrefetchCoolingDown(key))throw routePayloadFailures.get(key)?.error??new Error("Route prefetch is cooling down after a recent failure.");
  const pending=routePayloadRequests.get(key);
  if(pending){
    try{
      return await pending.promise;
    }catch(error){
      if(reason==="navigation"&&pending.reason === "prefetch"){
        if(routePayloadRequests.get(key)===pending)routePayloadRequests.delete(key);
        routePayloadFailures.delete(key);return loadRoute(key, { reason: "navigation", force: true });
      }
      throw error;
    }
  }
  const generation = routePayloadGeneration;
  const promise=fetchRoutePayloadUncached(key);
  const entry = { promise, reason };
  routePayloadRequests.set(key, entry);
  try{
    const result=await promise;
    if(generation !== routePayloadGeneration){
      if(routePayloadRequests.get(key) === entry)routePayloadRequests.delete(key);
      return loadRoute(key,{reason,force:false});
    }
    routePayloadFailures.delete(key);
    setBoundedRouteMapEntry(routePayloadCache, key, result, ROUTE_PAYLOAD_CACHE_MAX_ENTRIES);
    return result;
  }catch(error){
    setBoundedRouteMapEntry(routePayloadFailures, key,{status:"failed",error,failedAt:Date.now()
    }, ROUTE_PAYLOAD_FAILURE_MAX_ENTRIES);
    throw error;
  }finally{if(routePayloadRequests.get(key) === entry)routePayloadRequests.delete(key)}
}
async function fetchRoutePayload(routePath){return loadRoute(routePath,{ reason: "navigation" })}

async function fetchRoutePayloadUncached(routePath){
  const isStatic=typeof window!=="undefined"&&window["__RESUX_STATIC__"],url=isStatic?"/__resux/route/payloads"+(routePath==="/"?"/index.json":routePath.replace(/\/$/,"")+".json"):"/__resux/route?path="+encodeURIComponent(routePath);
  const controller=typeof AbortController==="function"?new AbortController():null,timeout=setTimeout(()=>{controller?.abort();},ROUTE_PAYLOAD_TIMEOUT_MS);
  try{
    const response=await fetch(url,{headers:{accept:"application/json"},...(controller?{signal:controller.signal}:{})});
    if(!response.ok)throw new Error("Route payload request failed: "+response.status);
    return await response.json();
  }catch(error){
    if(controller?.signal.aborted)throw new Error("Route payload request timed out after "+ROUTE_PAYLOAD_TIMEOUT_MS+"ms.");
    throw error;
  }finally{clearTimeout(timeout);}
}

function readRoutePayloadBuildId(payload){const value=payload?.config?.public?.__resuxBuildId;return typeof value==="string"&&value?value:null}
function ensureRoutePayloadBuildCompatibility(result){
  const currentBuildId=readRoutePayloadBuildId(globalThis.__RESUX__),nextBuildId=readRoutePayloadBuildId(result?.payload);
  if(!currentBuildId||!nextBuildId||currentBuildId === nextBuildId)return true;
  invalidateAllRoutePayloads();
  dispatchManagedEvent(document, "resux:build-mismatch",{currentBuildId,nextBuildId});
  location.reload();
  return false;
}
function applyHtmlAttrs(attrs){
  const html=document.documentElement;if(!html)return;
  const marker="data-rx-html-attrs",previous=(html.getAttribute(marker)||"").split(",").map(v=>v.trim()).filter(Boolean),next=attrs&&typeof attrs==="object"?attrs:{},keys=[];
  for(const key of previous)if(!Object.prototype.hasOwnProperty.call(next,key))html.removeAttribute(key);
  for(const [key,value] of Object.entries(next)){
    if(value===undefined||value===null||value===false){html.removeAttribute(key);continue}
    html.setAttribute(key,String(value));keys.push(key);
  }
  if(!keys.includes("lang")){
    const currentLang = html.getAttribute("lang");
    if (!currentLang) {
      html.setAttribute("lang","en");
      keys.push("lang");
    } else {
      keys.push("lang");
    }
  }
  html.setAttribute(marker,keys.join(","));
}
const VALID_CLIENT_PRELOAD_AS_VALUES=new Set(["audio","document","embed","fetch","font","image","object","script","style","track","video","worker"]);
function normalizeClientHeadLinks(links=[]){const out=[];for(const link of links){const next=normalizeClientHeadLink(link);if(next)out.push(next)}return out}
function normalizeClientHeadLink(link){
  if(!link||typeof link!=="object"||Array.isArray(link))return null;
  const output={};for(const [key,value] of Object.entries(link))if(value!==undefined&&value!==null&&value!==false)output[key]=String(value);
  const rel=String(output.rel||"").trim().toLowerCase();
  if(rel==="modulepreload"){delete output.as;return output}
  if(rel!=="preload")return output;
  const normalizedAs=normalizeClientPreloadAs(output.as,output);
  if(!normalizedAs){
    if(typeof console!=="undefined"&&typeof console.warn==="function"){const href=String(output.href||"").trim();console.warn('[resux] Skipping invalid preload link for "'+(href||"<unknown>")+'". Unsupported as="'+String(output.as||"")+'".')}
    return null;
  }
  output.as=normalizedAs;return output;
}
function normalizeClientPreloadAs(value,link){
  const normalized=String(value||"").trim().toLowerCase();
  if(VALID_CLIENT_PRELOAD_AS_VALUES.has(normalized))return normalized;
  const hinted=inferClientPreloadAsFromHint(normalized);
  if(hinted&&VALID_CLIENT_PRELOAD_AS_VALUES.has(hinted))return hinted;
  const asset=detectClientPreloadAssetType(link);
  return asset&&VALID_CLIENT_PRELOAD_AS_VALUES.has(asset)?asset:undefined;
}
function detectClientPreloadAssetType(link){
  const byType=inferClientPreloadAsFromHint(String(link.type||"").trim().toLowerCase());
  if(byType)return byType;
  return inferClientPreloadAsFromHint(String(link.href||"").trim().toLowerCase().split(/[?#]/)[0]);
}

function inferClientPreloadAsFromHint(hint) {
  const normalized = String(hint || "").trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (
    normalized === "audio"
    || normalized === "document"
    || normalized === "embed"
    || normalized === "fetch"
    || normalized === "font"
    || normalized === "image"
    || normalized === "object"
    || normalized === "script"
    || normalized === "style"
    || normalized === "track"
    || normalized === "video"
    || normalized === "worker"
  ) {
    return normalized;
  }
  if (normalized === "module" || normalized === "runtime") {
    return "script";
  }
  if (
    normalized.startsWith("image/")
    || /(^|[/.])(avif|gif|ico|jpe?g|png|svg|webp)(?:$|[^a-z0-9])/.test(normalized)
  ) {
    return "image";
  }
  if (
    normalized.startsWith("video/")
    || /(^|[/.])(m4v|mov|mp4|webm|ogg)(?:$|[^a-z0-9])/.test(normalized)
  ) {
    return "video";
  }
  if (
    normalized.startsWith("audio/")
    || /(^|[/.])(mp3|wav|aac|flac|m4a|oga)(?:$|[^a-z0-9])/.test(normalized)
  ) {
    return "audio";
  }
  if (
    normalized.startsWith("font/")
    || /(^|[/.])(woff2?|ttf|otf)(?:$|[^a-z0-9])/.test(normalized)
  ) {
    return "font";
  }
  if (normalized === "text/css" || /(^|[/.])css(?:$|[^a-z0-9])/.test(normalized)) {
    return "style";
  }
  if (
    normalized.includes("javascript")
    || normalized.includes("ecmascript")
    || /(^|[/.])m?js(?:$|[^a-z0-9])/.test(normalized)
  ) {
    return "script";
  }
  return undefined;
}

function resolveClientAssetUrl(value,destinationUrl=location.href){
  const href=String(value||"").trim();if(!href)return "";
  try{return new URL(href,document.querySelector?.("base[href]")?document.baseURI:destinationUrl).href}catch{return href}
}
function routeStyleAttr(link,name,alias=name){return link?.getAttribute?link.getAttribute(name):(link?.[name]??link?.[alias]??null)}
function routeStyleIsDisabled(link){return link?.hasAttribute?link.hasAttribute("disabled"):!!link&&Object.prototype.hasOwnProperty.call(link,"disabled")}
function routeStyleRequestKey(link,destinationUrl){
  const cors=routeStyleAttr(link,"crossorigin","crossOrigin");
  return [resolveClientAssetUrl(routeStyleAttr(link,"href"),destinationUrl),cors===null?"-":cors,routeStyleAttr(link,"integrity")||"",routeStyleAttr(link,"referrerpolicy","referrerPolicy")||""].join("\n");
}
function findMatchingStylesheet(link,destinationUrl){
  const key=routeStyleRequestKey(link,destinationUrl);
  for(const current of document.querySelectorAll('link[rel="stylesheet"][href]'))if(routeStyleRequestKey(current,document.baseURI||location.href)===key)return current;
  return null;
}
function routeStyleMatchesCurrentMedia(link){
  const media=String(routeStyleAttr(link,"media")||"").trim();
  if(!media||media.toLowerCase()==="all"||typeof matchMedia!=="function")return true;
  try{return matchMedia(media).matches}catch{return true}
}
function waitForRouteStyleLink(link,signal){
  if(signal?.aborted)return Promise.resolve(false);
  return new Promise(resolve=>{
    let done=false;
    const finish=value=>{if(done)return;done=true;clearTimeout(timeout);link.removeEventListener("load",settled);link.removeEventListener("error",settled);signal?.removeEventListener("abort",cancelled);resolve(value)},settled=()=>finish(true),cancelled=()=>finish(false),timeout=setTimeout(cancelled,4000);
    link.addEventListener("load",settled,{once:true});link.addEventListener("error",settled,{once:true});signal?.addEventListener("abort",cancelled,{once:true});
  });
}
async function awaitRouteStylesheet(link,signal){
  if(signal?.aborted||routeStyleSettledLinks.has(link)||link.sheet)return;
  if(await waitForRouteStyleLink(link,signal))routeStyleSettledLinks.add(link);
}
function preloadRouteStyle(link,destinationUrl,signal){
  if(signal?.aborted||routeStyleIsDisabled(link)||!routeStyleMatchesCurrentMedia(link))return Promise.resolve();
  const existing=findMatchingStylesheet(link,destinationUrl);
  if(existing&&!routeStyleIsDisabled(existing)&&routeStyleMatchesCurrentMedia(existing))return awaitRouteStylesheet(existing,signal);
  const href=resolveClientAssetUrl(routeStyleAttr(link,"href"),destinationUrl);if(!href)return Promise.resolve();
  const key=routeStyleRequestKey(link,destinationUrl),pending=routeStylePreloadPromises.get(key);if(pending)return pending;
  const promise=(async()=>{
    const preload=document.createElement("link");if(preload.relList?.supports&&!preload.relList.supports("preload"))return;
    preload.rel="preload";preload.as="style";preload.href=href;preload.setAttribute("data-rx-route-style-preload","true");
    for(const [name,alias] of [["crossorigin","crossOrigin"],["integrity","integrity"],["referrerpolicy","referrerPolicy"],["media","media"]]){
      const value=routeStyleAttr(link,name,alias);if(value!==null&&value!==false&&(name==="crossorigin"||value!==""))preload.setAttribute(name,String(value));
    }
    document.head.appendChild(preload);await waitForRouteStyleLink(preload,signal);preload.remove();
    const raw=link.imports??link["data-imports"];
    const declaredImports=Array.isArray(raw)?raw:typeof raw==="string"?raw.split(",").map(s=>s.trim()).filter(Boolean):[];
    if(declaredImports.length>0){
      await Promise.all(declaredImports.map(imported=>preloadRouteStyle({href:imported,crossorigin:routeStyleAttr(link,"crossorigin","crossOrigin")},destinationUrl,signal)));
    }
  })().finally(()=>routeStylePreloadPromises.delete(key));
  routeStylePreloadPromises.set(key,promise);return promise;
}
function preloadRouteHeadStyles(head,destinationUrl=location.href,signal,sequential=false){
  const styles=normalizeClientHeadLinks(head?.link??[]).filter(link=>String(link.rel||"").trim().toLowerCase()==="stylesheet"&&link.href&&!routeStyleIsDisabled(link)&&routeStyleMatchesCurrentMedia(link));
  if(!styles.length)return null;
  const allStyles=[];
  for(const link of styles){
    allStyles.push(link);
    const raw=link.imports??link["data-imports"];
    const declaredImports=Array.isArray(raw)?raw:typeof raw==="string"?raw.split(",").map(s=>s.trim()).filter(Boolean):[];
    for(const imp of declaredImports){
      allStyles.push({href:imp,rel:"stylesheet",crossorigin:routeStyleAttr(link,"crossorigin","crossOrigin")});
    }
  }
  return sequential?(async()=>{for(const link of allStyles)await preloadRouteStyle(link,destinationUrl,signal)})():Promise.all(allStyles.map(link=>preloadRouteStyle(link,destinationUrl,signal)));
}

function applyHead(head) {
  if (!head) {
    return;
  }

  if (head.title) {
    document.title = head.title;
  }
  applyHtmlAttrs(head.htmlAttrs);

  const nextEntries = [];

  for (const meta of head.meta ?? []) {
    nextEntries.push({ tag: "meta", attrs: meta });
  }

  for (const link of normalizeClientHeadLinks(head.link ?? [])) {
    nextEntries.push({ tag: "link", attrs: link });
  }

  for (const style of head.style ?? []) {
    if (!style) continue;
    const attrs = {};
    if (typeof style === "object" && style.id) {
      attrs["data-rx-style"] = String(style.id);
    }
    const text = typeof style === "string"
      ? style
      : (style.textContent ?? style.css ?? style.content ?? style.children ?? style.innerHTML ?? "");
    nextEntries.push({ tag: "style", attrs, text });
  }

  const scripts = [];
  const scriptMap = new Map();
  for (const item of head.script ?? []) {
    if (!item || typeof item !== "object") continue;
    const dedupeKey = item.key ?? item.id ?? item.src;
    if (dedupeKey) {
      if (scriptMap.has(dedupeKey)) {
        const existing = scriptMap.get(dedupeKey);
        const idx = scripts.indexOf(existing);
        if (idx !== -1) {
          scripts[idx] = item;
        }
        scriptMap.set(dedupeKey, item);
      } else {
        scriptMap.set(dedupeKey, item);
        scripts.push(item);
      }
    } else {
      scripts.push(item);
    }
  }

  for (const script of scripts) {
    const attrs = { ...script };
    const text = attrs.textContent ?? attrs.innerHTML ?? attrs.children ?? undefined;
    delete attrs.textContent;
    delete attrs.innerHTML;
    delete attrs.children;
    delete attrs.key;
    nextEntries.push({ tag: "script", attrs, text: text !== undefined ? String(text) : undefined });
  }

  const existing = new Map();
  document.querySelectorAll("[data-rx-head]").forEach((element) => {
    existing.set(headElementKey(element), element);
  });

  const used = new Set();
  for (const entry of nextEntries) {
    const key = headEntryKey(entry.tag, entry.attrs);
    const current = existing.get(key);
    if (current) {
      if (entry.text !== undefined && current.textContent !== entry.text) {
        current.textContent = entry.text;
      }
      used.add(current);
      continue;
    }

    const element = document.createElement(entry.tag);
    element.setAttribute("data-rx-head", "true");
    for (const [key, value] of Object.entries(entry.attrs)) {
      if (value === false || value === null || value === undefined) {
        continue;
      }
      if (value === true) {
        element.setAttribute(key, "");
      } else {
        element.setAttribute(key, String(value));
      }
    }
    if (entry.text !== undefined) {
      element.textContent = entry.text;
    }
    document.head.appendChild(element);
    used.add(element);
  }

  document.querySelectorAll("[data-rx-head]").forEach((element) => {
    if (!used.has(element)) {
      element.remove();
    }
  });
}

function headElementKey(element) {
  const attrs = {};
  for (const attribute of Array.from(element.attributes || [])) {
    if (attribute.name !== "data-rx-head") {
      attrs[attribute.name] = attribute.value;
    }
  }
  return headEntryKey(element.tagName.toLowerCase(), attrs);
}

function headEntryKey(tag, attrs) {
  const normalized = Object.entries(attrs || {})
    .filter(([_, value]) => value !== undefined && value !== null && value !== false)
    .map(([key, value]) => [key, String(value)])
    .sort(([a], [b]) => a.localeCompare(b));
  return tag + ":" + JSON.stringify(normalized);
}

async function handleDelegatedEvent(eventName, event) {
  const target = event.target && event.target.closest
    ? event.target.closest("[data-rx-on-" + eventName + "]")
    : null;
  if (!target) {
    return;
  }
  const modifiers = readEventModifiers(target, eventName);
  if (modifiers.includes("self") && event.target !== target) {
    return;
  }
  if (!eventMatchesModifiers(event, modifiers, eventName)) {
    return;
  }
  const onceMarker = "data-rx-once-" + eventName;
  if (modifiers.includes("once")) {
    if (target.hasAttribute(onceMarker)) {
      return;
    }
    target.setAttribute(onceMarker, "true");
  }
  if ((eventName === "submit" || modifiers.includes("prevent")) && !modifiers.includes("passive")) {
    event.preventDefault();
  }
  if (modifiers.includes("stop")) {
    event.stopPropagation();
  }
  const marker = target.getAttribute("data-rx-on-" + eventName);
  if (!marker) {
    return;
  }
  const [scopeId, moduleId, handlerName] = marker.split(":");
  if (!scopeId || !moduleId || !handlerName) {
    return;
  }
  const payload = globalThis.__RESUX__;
  if (!payload || !payload.modules || !payload.scopes || !payload.scopes[scopeId]) {
    return;
  }
  try {
    const component = await importComponent(moduleId, payload.modules, devImportRevision);
    let scopeRecord = scopeCache.get(scopeId);
    if (!scopeRecord) {
      scopeRecord = await component.createScope(payload.scopes[scopeId], payload.route);
      scopeCache.set(scopeId, scopeRecord);
    }
    await prepareSlotProviders(scopeId);
    const patches = await component.run(scopeRecord, handlerName, event, readEventLocals(target, eventName));
    const serialized = component.serialize(scopeRecord);
    payload.scopes[scopeId].props = serialized.props;
    payload.scopes[scopeId].state = serialized.state;
    payload.scopes[scopeId].asyncData = serialized.asyncData;
    applyPatches(scopeId, patches);
    await drainComponentEmits(scopeId, scopeRecord);
  } catch (error) {
    dispatchManagedEvent(typeof document !== "undefined" ? document : null, "resux:handler-error", {
      event: eventName,
      scopeId,
      handler: handlerName,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

function normalizeEmitName(name) {
  return String(name).replace(/-([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
}

// A child's emit() only queues the call. After the child's own handler has finished and its state is
// serialized, each queued emit runs the parent handler named in the payload (events written on the child tag).
async function drainComponentEmits(scopeId, record) {
  const queue = record && record.emitQueue;
  if (!queue || queue.length === 0) return;
  const pending = queue.splice(0, queue.length);
  const payload = globalThis.__RESUX__;
  const bindings = payload && payload.scopes && payload.scopes[scopeId] ? payload.scopes[scopeId].emits : null;
  if (!bindings) return;
  for (const entry of pending) {
    const binding = bindings[normalizeEmitName(entry.name)];
    if (!binding) continue;
    const [parentScopeId, parentModuleId, handlerName] = String(binding.handler).split(":");
    if (!parentScopeId || !parentModuleId || !handlerName || !payload.scopes[parentScopeId]) continue;
    try {
      const component = await importComponent(parentModuleId, payload.modules, devImportRevision);
      let parentRecord = scopeCache.get(parentScopeId);
      if (!parentRecord) {
        parentRecord = await component.createScope(payload.scopes[parentScopeId], payload.route);
        scopeCache.set(parentScopeId, parentRecord);
      }
      await prepareSlotProviders(parentScopeId);
      const patches = await component.run(parentRecord, handlerName, entry.args[0], binding.locals || {}, entry.args);
      const serialized = component.serialize(parentRecord);
      payload.scopes[parentScopeId].props = serialized.props;
      payload.scopes[parentScopeId].state = serialized.state;
      payload.scopes[parentScopeId].asyncData = serialized.asyncData;
      applyPatches(parentScopeId, patches);
      await drainComponentEmits(parentScopeId, parentRecord);
    } catch (error) {
      dispatchManagedEvent(typeof document !== "undefined" ? document : null, "resux:handler-error", {
        event: "emit:" + entry.name,
        scopeId: parentScopeId,
        handler: handlerName,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

function readEventLocals(target, eventName) {
  const encoded = target.getAttribute("data-rx-locals-" + eventName);
  if (!encoded) return {};
  try {
    const parsed = JSON.parse(encoded);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function readEventModifiers(target, eventName) {
  return (target.getAttribute("data-rx-mod-" + eventName) || "")
    .split(",")
    .map((modifier) => modifier.trim())
    .filter(Boolean);
}

function eventMatchesModifiers(event, modifiers, eventName) {
  if (modifiers.includes("ctrl") && !event.ctrlKey) return false;
  if (modifiers.includes("shift") && !event.shiftKey) return false;
  if (modifiers.includes("alt") && !event.altKey) return false;
  if (modifiers.includes("meta") && !event.metaKey) return false;
  if (modifiers.includes("exact")) {
    const expected = new Set(modifiers.filter((modifier) => ["ctrl", "shift", "alt", "meta"].includes(modifier)));
    if (event.ctrlKey !== expected.has("ctrl")) return false;
    if (event.shiftKey !== expected.has("shift")) return false;
    if (event.altKey !== expected.has("alt")) return false;
    if (event.metaKey !== expected.has("meta")) return false;
  }
  if ((eventName === "click" || eventName === "mousedown" || eventName === "mouseup") && !mouseButtonMatches(event, modifiers)) {
    return false;
  }
  if (eventName.startsWith("key") && !keyMatches(event, modifiers)) {
    return false;
  }
  return true;
}

function mouseButtonMatches(event, modifiers) {
  const buttonModifiers = modifiers.filter((modifier) => ["left", "middle", "right"].includes(modifier));
  if (!buttonModifiers.length) {
    return true;
  }
  return buttonModifiers.some((modifier) => {
    if (modifier === "left") return event.button === 0;
    if (modifier === "middle") return event.button === 1;
    return event.button === 2;
  });
}

function keyMatches(event, modifiers) {
  const aliases = {
    enter: "Enter",
    tab: "Tab",
    delete: ["Delete", "Backspace"],
    esc: "Escape",
    escape: "Escape",
    space: " ",
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight"
  };
  const keyModifiers = modifiers.filter((modifier) => Object.prototype.hasOwnProperty.call(aliases, modifier));
  if (!keyModifiers.length) {
    return true;
  }
  return keyModifiers.some((modifier) => {
    const expected = aliases[modifier];
    return Array.isArray(expected) ? expected.includes(event.key) : event.key === expected;
  });
}

async function resumePendingAsyncData() {
  const payload = globalThis.__RESUX__;
  if (!payload || !payload.scopes || !payload.modules) {
    return;
  }

  beginManagedTeleportPatchBatch();
  try {
    await Promise.all(Object.entries(payload.scopes).map(async ([scopeId, serializedScope]) => {
    if (!hasPendingAsyncData(serializedScope)) {
      return;
    }

    const component = await importComponent(serializedScope.moduleId, payload.modules, devImportRevision).catch(() => null);
    if (!component) {
      return;
    }
    let scopeRecord = scopeCache.get(scopeId);
    if (!scopeRecord) {
      scopeRecord = await component.createScope(serializedScope, payload.route);
      scopeCache.set(scopeId, scopeRecord);
    }

    const completions = scopeRecord.pendingCompletions ?? [];
    if (completions.length === 0) {
      return;
    }

    await Promise.allSettled(completions);
    scopeRecord.pendingCompletions = [];
    const patches = component.render(scopeRecord);
    const serialized = component.serialize(scopeRecord);
    payload.scopes[scopeId].props = serialized.props;
    payload.scopes[scopeId].state = serialized.state;
    payload.scopes[scopeId].asyncData = serialized.asyncData;
    applyPatches(scopeId, patches, { flushDeferredTeleports: false });
  }));
  } finally {
    endManagedTeleportPatchBatch();
  }
}

function hasPendingAsyncData(serializedScope) {
  return Object.values(serializedScope.asyncData ?? {}).some((entry) => entry && entry.pending);
}

async function importComponent(moduleId, modules, revision = 0) {
  const modulePath = modules[moduleId];
  if (!modulePath) {
    throw new Error("Missing resumable module " + moduleId + ".");
  }
  const cacheBustedPath = revision ? appendImportRevision(modulePath, revision) : modulePath;
  return (await import(/* @vite-ignore */ cacheBustedPath)).default;
}

function appendImportRevision(modulePath, revision) {
  const separator = modulePath.includes("?") ? "&" : "?";
  return modulePath + separator + "t=" + encodeURIComponent(String(revision));
}

function renderClientPatches(template, scope, styleScopeId, scopeId, moduleId) {
  const patches = [];
  collectPatches(template, scope, {}, patches, styleScopeId, scopeId, moduleId);
  return patches;
}

function collectPatches(nodes, scope, locals, patches, styleScopeId, scopeId, moduleId) {
  for (const node of nodes) {
    if (node.type === "interpolation") {
      patches.push({ type: "text", id: node.bindingId, value: stringifyValue(evaluateExpression(node.expression, scope, locals)) });
      continue;
    }
    if (node.type !== "element") {
      continue;
    }
    if (node.for) {
      patches.push({ type: "block", id: node.for.blockId, value: renderNode(node, scope, locals, styleScopeId, scopeId, moduleId).replace(/^<span[^>]*>|<\/span>$/g, "") });
      continue;
    }
    if (node.if) {
      patches.push({ type: "block", id: node.if.blockId, value: renderNode(node, scope, locals, styleScopeId, scopeId, moduleId).replace(/^<span[^>]*>|<\/span>$/g, "") });
      continue;
    }
    if (node.html) {
      patches.push({ type: "html", id: node.html.bindingId, value: sanitizeHtml(evaluateExpression(node.html.expression, scope, locals)) });
    }
    const normalizedTag = String(node.tag || "").toLowerCase();
    if (normalizedTag === "teleport") {
      for (const attr of node.attrs) {
        if (
          attr.kind !== "dynamic"
          || !attr.bindingId
          || !["to", "disabled", "defer"].includes(attr.name)
        ) continue;
        const value = evaluateExpression(attr.value, scope, locals);
        patches.push({
          type: "attr",
          id: attr.bindingId,
          attr: "data-rx-teleport-" + attr.name,
          value: attr.name === "to"
            ? normalizeClientTeleportPatchTarget(value)
            : (isClientTeleportBooleanEnabled(value) ? "true" : "")
        });
      }
    } else if (normalizeTransitionBoundaryTagName(node.tag) === "transition" || normalizeTransitionBoundaryTagName(node.tag) === "transition-group") {
      for (const attr of node.attrs) {
        if (attr.name === "name" && attr.kind === "dynamic" && attr.bindingId) {
          patches.push({
            type: "attr",
            id: attr.bindingId,
            attr: "data-rx-transition",
            value: normalizeClientTransitionName(evaluateExpression(attr.value, scope, locals))
          });
        }
      }
    } else if (node.tag !== "ResuxImg" && node.tag !== "ResuxPicture" && node.tag !== "ResuxVideo") {
      for (const attr of node.attrs) {
        if (attr.kind === "dynamic" && attr.bindingId) {
          const attrName = nativeAttributeName(node, attr.name);
          const attrValue = evaluateExpression(attr.value, scope, locals);
          patches.push({ type: "attr", id: attr.bindingId, attr: attrName, value: stringifyAttributeValue(attrName, attrValue) });
          if (attrName === "ref") {
            const refText = typeof attrValue === "string" ? attrValue.trim() : "";
            patches.push({ type: "attr", id: attr.bindingId, attr: "data-rx-ref", value: refText ? scopeId + ":" + refText : "" });
          }
        }
      }
    }
    collectPatches(node.children, scope, locals, patches, styleScopeId, scopeId, moduleId);
    // Slot content belongs to this (the parent) scope, so its bindings are patched here. Content of a scoped slot
    // reads the child's slot props, which only the child's own render can supply, so it is not patched from here.
    if (node.slots) {
      for (const slotName of Object.keys(node.slots)) {
        if (node.slots[slotName].param) continue;
        collectPatches(node.slots[slotName].children, scope, locals, patches, styleScopeId, scopeId, moduleId);
      }
    }
  }
}

function renderNode(node, scope, locals, styleScopeId, scopeId, moduleId) {
  if (node.type === "text") {
    return escapeHtml(node.value);
  }
  if (node.type === "interpolation") {
    return '<span data-rx-text="' + scopeId + ':' + node.bindingId + '">' + escapeHtml(stringifyValue(evaluateExpression(node.expression, scope, locals))) + '</span>';
  }
  if (node.for) {
    const items = evaluateExpression(node.for.source, scope, locals);
    const previousInFor = clientRenderInFor;
    clientRenderInFor = true;
    const rendered = Array.isArray(items)
      ? items.map((item, index) => {
          const nextLocals = { ...locals, [node.for.value]: item };
          if (node.for.index) nextLocals[node.for.index] = index;
          return renderElement({ ...node, for: undefined, if: undefined }, scope, nextLocals, styleScopeId, scopeId, moduleId);
        }).join("")
      : "";
    clientRenderInFor = previousInFor;
    return '<span data-rx-block="' + scopeId + ':' + node.for.blockId + '" style="display: contents;">' + rendered + '</span>';
  }
  if (node.if) {
    const rendered = evaluateExpression(node.if.expression, scope, locals)
      ? renderElement({ ...node, if: undefined }, scope, locals, styleScopeId, scopeId, moduleId)
      : "";
    return '<span data-rx-block="' + scopeId + ':' + node.if.blockId + '" style="display: contents;">' + rendered + '</span>';
  }
  return renderElement(node, scope, locals, styleScopeId, scopeId, moduleId);
}

// Components inside client-rendered blocks (v-if / v-for). The block renderer is synchronous, so a
// component becomes a placeholder first. mountClientChildren then imports the component module on demand,
// creates a client-only scope (ids c1, c2, ... never clash with server ids s*), renders its template and
// swaps the placeholder for the real nodes. Scopes are released when their nodes leave the document.
let clientChildCounter = 0;
const pendingClientChildren = new Map();
const clientChildRoots = new Map();
const clientChildMeta = new Map();
const clientSlotProviders = new Map();
let clientRenderInFor = false;

function clientBlockComponentModuleId(tag) {
  const payload = globalThis.__RESUX__;
  const ids = payload && payload.componentIds;
  return ids && Object.prototype.hasOwnProperty.call(ids, tag) ? ids[tag] : "";
}

function renderClientChildPlaceholder(node, moduleId, scope, locals, styleScopeId, scopeId, parentModuleId) {
  const props = {};
  let key = "";
  let hasKey = false;
  for (const attr of node.attrs) {
    const value = attr.kind === "static" ? attr.value : evaluateExpression(attr.value, scope, locals);
    if (attr.name === "key") {
      key = String(value);
      hasKey = true;
      continue;
    }
    const name = String(attr.name).replace(/-([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
    props[name] = value;
  }
  if (clientRenderInFor && !hasKey && isClientDevMode()) {
    console.warn("[resux] <" + node.tag + "> inside v-for has no :key. Its state is matched by position, so reordering the list can move state to the wrong item.");
  }
  // Slot content is rendered by the parent (its scope and locals), like the server renderer does. Slots
  // without params are rendered once here and reused. Scoped slots depend on the child's props, so the
  // provider renders them on demand and the child is never reused (its slot html key is unique).
  let provider = null;
  let slotHtml = "";
  const clientSlotDefinitions = node.slots
    ? node.slots
    : (node.children && node.children.some((child) => child.type !== "text" || child.value.trim().length > 0) ? { default: { children: node.children } } : null);
  if (clientSlotDefinitions) {
    const definitions = clientSlotDefinitions;
    const cached = {};
    for (const slotName of Object.keys(definitions)) {
      const definition = definitions[slotName];
      if (definition.param) {
        slotHtml += "scoped:" + slotName + ":" + (++clientChildCounter) + ";";
        continue;
      }
      cached[slotName] = definition.children.map((child) => renderNode(child, scope, locals, styleScopeId, scopeId, parentModuleId)).join("");
      slotHtml += slotName + ":" + cached[slotName] + ";";
    }
    provider = (slotName, slotProps) => {
      if (!Object.prototype.hasOwnProperty.call(definitions, slotName)) return undefined;
      if (Object.prototype.hasOwnProperty.call(cached, slotName)) return cached[slotName];
      const definition = definitions[slotName];
      const slotLocals = bindClientSlotLocals(definition.param, slotProps, locals);
      return definition.children.map((child) => renderNode(child, scope, slotLocals, styleScopeId, scopeId, parentModuleId)).join("");
    };
  }
  let emits = null;
  if (node.events && node.events.length > 0) {
    emits = {};
    for (const event of node.events) {
      const binding = { handler: scopeId + ":" + parentModuleId + ":" + event.handler };
      if (event.locals && event.locals.length > 0) {
        binding.locals = {};
        for (const name of event.locals) {
          if (Object.prototype.hasOwnProperty.call(locals, name) && locals[name] !== undefined) binding.locals[name] = locals[name];
        }
      }
      emits[normalizeEmitName(event.name)] = binding;
    }
  }
  const rootAttrs = [];
  for (const event of node.events || []) {
    if (!event.native) continue;
    rootAttrs.push('data-rx-on-' + event.name + '="' + scopeId + ':' + parentModuleId + ':' + event.handler + '"');
    if (event.locals && event.locals.length) {
      const eventLocals = {};
      for (const name of event.locals) {
        if (Object.prototype.hasOwnProperty.call(locals, name) && locals[name] !== undefined) eventLocals[name] = locals[name];
      }
      rootAttrs.push('data-rx-locals-' + event.name + '=\"' + escapeAttribute(JSON.stringify(eventLocals)) + '\"');
    }
    if (event.modifiers && event.modifiers.length) {
      rootAttrs.push('data-rx-mod-' + event.name + '="' + escapeAttribute(event.modifiers.join(",")) + '"');
    }
  }
  const id = "c" + (++clientChildCounter);
  pendingClientChildren.set(id, { moduleId, tag: node.tag, props, key, hasKey, slotHtml, provider, emits, rootAttrs });
  return '<span data-rx-child="' + id + '" style="display: contents;"></span>';
}

async function mountClientChildren(root) {
  const host = root && root.querySelectorAll ? root : document;
  const placeholders = Array.from(host.querySelectorAll("[data-rx-child]"));
  if (host !== document && host.matches && host.matches("[data-rx-child]")) placeholders.unshift(host);
  await Promise.all(placeholders.map((placeholder) => mountClientChild(placeholder)));
}

async function mountClientChild(placeholder) {
  const id = placeholder.getAttribute("data-rx-child");
  const entry = pendingClientChildren.get(id);
  if (!entry) return;
  pendingClientChildren.delete(id);
  const payload = globalThis.__RESUX__;
  if (!placeholder.isConnected || !payload || !payload.modules || !payload.scopes) return;
  try {
    const component = await importComponent(entry.moduleId, payload.modules, devImportRevision);
    const serialized = { id, moduleId: entry.moduleId, props: serializeProps(entry.props), state: {}, globalStateKeys: [], asyncData: {} };
    const record = await component.createScope(serialized, payload.route);
    if (!placeholder.isConnected) return;
    if (entry.provider) clientSlotProviders.set(id, entry.provider);
    const html = entry.rootAttrs.length > 0 ? component.injectRootAttrs(component.renderHtml(record), entry.rootAttrs) : component.renderHtml(record);
    const state = component.serialize(record);
    scopeCache.set(id, record);
    payload.scopes[id] = { ...serialized, props: state.props, state: state.state, asyncData: state.asyncData, globalStateKeys: record.globalStateKeys ? [...record.globalStateKeys] : [] };
    if (entry.emits) payload.scopes[id].emits = entry.emits;
    const template = document.createElement("template");
    template.innerHTML = html;
    const parent = placeholder.parentNode;
    const nodes = Array.from(template.content.childNodes);
    clientChildRoots.set(id, nodes);
    clientChildMeta.set(id, { component, tag: entry.tag, key: entry.hasKey ? "k:" + entry.key : "", propsJson: JSON.stringify(entry.props), slotHtml: entry.slotHtml, emitsJson: JSON.stringify(entry.emits) + JSON.stringify(entry.rootAttrs) });

    placeholder.replaceWith(template.content);
    registerDelegatedEventsFromDom(parent && parent.nodeType === 1 ? parent : document);
    await Promise.all(nodes.filter((child) => child.nodeType === 1).map((child) => mountClientChildren(child)));
    await drainComponentEmits(id, record);
  } catch (error) {
    placeholder.replaceWith(document.createComment("resux-child-error"));
    dispatchManagedEvent(typeof document !== "undefined" ? document : null, "resux:handler-error", {
      event: "mount",
      scopeId: id,
      handler: entry.tag,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

// A block patch re-renders the whole block. Client-created children inside it are held aside in a
// fragment, then put back in place of their new placeholder when the key (or, unkeyed, the position
// among same-tag siblings) and the props match, so their state survives unrelated updates and reorders.
function holdClientChildrenOfBlock(block) {
  const held = [];
  for (const [id, nodes] of clientChildRoots) {
    const first = nodes[0];
    if (!first || !first.isConnected || !block.contains(first)) continue;
    const owner = first.parentNode && first.parentNode.closest ? first.parentNode.closest("[data-rx-block]") : null;
    if (owner !== block) continue;
    held.push({ id, nodes, meta: clientChildMeta.get(id) });
  }
  if (held.length === 0) return held;
  const holder = document.createDocumentFragment();
  for (const entry of held) for (const node of entry.nodes) holder.appendChild(node);
  held.holder = holder;
  return held;
}

function restoreClientChildrenOfBlock(block, held) {
  if (!held || held.length === 0) return;
  const byKey = new Map();
  const unkeyedCount = new Map();
  for (const entry of held) {
    const meta = entry.meta;
    if (!meta) continue;
    let slot = meta.key;
    if (!slot) {
      const n = unkeyedCount.get(meta.tag) || 0;
      unkeyedCount.set(meta.tag, n + 1);
      slot = "i:" + meta.tag + ":" + n;
    }
    byKey.set(slot, entry);
  }
  const seen = new Map();
  const updates = [];
  for (const placeholder of Array.from(block.querySelectorAll("[data-rx-child]"))) {
    const id = placeholder.getAttribute("data-rx-child");
    const pending = pendingClientChildren.get(id);
    if (!pending) continue;
    let slot = pending.hasKey ? "k:" + pending.key : "";
    if (!slot) {
      const n = seen.get(pending.tag) || 0;
      seen.set(pending.tag, n + 1);
      slot = "i:" + pending.tag + ":" + n;
    }
    const old = byKey.get(slot);
    if (!old || old.meta.tag !== pending.tag || old.meta.slotHtml !== pending.slotHtml || old.meta.emitsJson !== JSON.stringify(pending.emits) + JSON.stringify(pending.rootAttrs)) continue;
    const nextPropsJson = JSON.stringify(pending.props);
    const propsChanged = old.meta.propsJson !== nextPropsJson;
    if (propsChanged && !canUpdateClientChildProps(old)) continue;

    byKey.delete(slot);
    pendingClientChildren.delete(id);
    for (const node of old.nodes) placeholder.parentNode.insertBefore(node, placeholder);
    placeholder.remove();
    if (propsChanged) updates.push([old, pending.props, nextPropsJson]);
  }
  // Patching can mount pending placeholders of this block, so it runs after every held child is back in place.
  for (const update of updates) updateClientChildProps(update[0], update[1], update[2]);
}

// A held child whose props changed keeps its state and DOM: the new props are written into its scope and
// the child renders again in place, so only the bindings that changed are patched. Setup code that copied a
// prop into its own ref or computed reads the old value (props are plain values, not refs).
function canUpdateClientChildProps(entry) {
  return Boolean(entry.meta && entry.meta.component && typeof entry.meta.component.render === "function" && scopeCache.get(entry.id));
}

function updateClientChildProps(entry, nextProps, nextPropsJson) {
  const record = scopeCache.get(entry.id);
  const component = entry.meta.component;
  const payload = globalThis.__RESUX__;
  try {
    const target = record.props;
    for (const name of Object.keys(target)) delete target[name];
    Object.assign(target, nextProps);
    entry.meta.propsJson = nextPropsJson;
    const patches = component.render(record);
    const serialized = component.serialize(record);
    if (payload && payload.scopes && payload.scopes[entry.id]) {
      payload.scopes[entry.id].props = serialized.props;
      payload.scopes[entry.id].state = serialized.state;
    }
    applyPatches(entry.id, patches);
  } catch (error) {
    console.error("[resux] Failed to update props of client-created component " + entry.meta.tag + ".", error);
  }
}

function releaseDetachedClientChildren() {
  const payload = globalThis.__RESUX__;
  for (const [id, nodes] of Array.from(clientChildRoots)) {
    if (nodes.some((node) => node.isConnected)) continue;
    clientChildRoots.delete(id);
    clientChildMeta.delete(id);
    clientSlotProviders.delete(id);
    scopeCache.delete(id);
    if (payload && payload.scopes) delete payload.scopes[id];
  }
}

const unsafeClientTransitionContainerTags = new Set(`;
