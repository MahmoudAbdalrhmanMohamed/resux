export type ResuxResumeHandler = (...args: unknown[]) => unknown | Promise<unknown>;
export type ResuxResumeModule = Record<string, unknown>;

export interface ResuxResumeLoadContext {
  /** Aborted when the configured handler-load deadline expires. */
  signal: AbortSignal;
}

export type ResuxResumeModuleLoader = (
  context?: ResuxResumeLoadContext,
) => Promise<ResuxResumeModule>;

export interface ResuxResumeManifestEntry {
  id: string;
  module: string;
  exportName: string;
}

export interface ResuxResumeRegistration extends ResuxResumeManifestEntry {
  load: ResuxResumeModuleLoader;
}

export interface ResuxResumeRegistryOptions {
  /**
   * Maximum time to wait for one lazy handler module. Set to 0 to disable the
   * deadline. Defaults to 30 seconds so a broken chunk request cannot leave an
   * interaction pending forever.
   */
  loadTimeoutMs?: number;
}

const DEFAULT_RESUME_LOAD_TIMEOUT_MS = 30_000;
const MAX_RESUME_LOAD_TIMEOUT_MS = 2_147_483_647;

export class ResuxResumeLoadTimeoutError extends Error {
  readonly handlerId: string;
  readonly timeoutMs: number;

  constructor(handlerId: string, timeoutMs: number) {
    super(`Timed out loading resumable handler ${handlerId} after ${timeoutMs}ms.`);
    this.name = "ResuxResumeLoadTimeoutError";
    this.handlerId = handlerId;
    this.timeoutMs = timeoutMs;
  }
}

function normalizeLoadTimeout(value: number | undefined): number {
  const timeoutMs = value ?? DEFAULT_RESUME_LOAD_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0 || timeoutMs > MAX_RESUME_LOAD_TIMEOUT_MS) {
    throw new RangeError(
      `loadTimeoutMs must be a finite non-negative number no greater than ${MAX_RESUME_LOAD_TIMEOUT_MS}.`,
    );
  }
  return timeoutMs;
}

/**
 * Lazily resolves resumable handlers from manifest-style registrations.
 * Resolved handlers are cached, concurrent loads are deduplicated, and replacing
 * a registration invalidates both cached and in-flight state for that handler id.
 * Handler loads are deadline-bound by default so one failed chunk cannot leave an
 * interaction pending forever.
 */
export class ResuxResumeHandlerRegistry {
  readonly #entries = new Map<string, ResuxResumeRegistration>();
  readonly #generations = new Map<string, number>();
  readonly #handlers = new Map<string, ResuxResumeHandler>();
  readonly #pending = new Map<string, Promise<ResuxResumeHandler>>();
  readonly #loadTimeoutMs: number;

  constructor(options: ResuxResumeRegistryOptions = {}) {
    this.#loadTimeoutMs = normalizeLoadTimeout(options.loadTimeoutMs);
  }

  /** Registers or replaces one resumable handler definition. */
  register(entry: ResuxResumeRegistration): void {
    if (!entry.id) throw new Error("Resume handler id must not be empty.");
    if (!entry.exportName) throw new Error(`Resume handler ${entry.id} must declare an export name.`);

    const storedEntry: ResuxResumeRegistration = {
      id: entry.id,
      module: entry.module,
      exportName: entry.exportName,
      load: entry.load,
    };

    this.#entries.set(storedEntry.id, storedEntry);
    this.#generations.set(storedEntry.id, (this.#generations.get(storedEntry.id) ?? 0) + 1);
    this.#handlers.delete(storedEntry.id);
    this.#pending.delete(storedEntry.id);
  }

  /** Registers multiple resumable handler definitions in order. */
  registerMany(entries: ResuxResumeRegistration[]): void {
    for (const entry of entries) this.register(entry);
  }

  /** Returns whether the registry knows about a handler id. */
  has(id: string): boolean {
    return this.#entries.has(id);
  }

  /** Loads one module with a deadline and exposes cancellation to cooperative loaders. */
  async #loadModule(id: string, entry: ResuxResumeRegistration): Promise<ResuxResumeModule> {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;

    // Promise executors run synchronously. Resolving with the loader's returned
    // promise adopts its eventual state, while a synchronous loader throw is
    // converted into a rejection by the Promise constructor itself.
    const modulePromise = new Promise<ResuxResumeModule>((resolve) => {
      resolve(entry.load({ signal: controller.signal }));
    });

    if (this.#loadTimeoutMs === 0) return await modulePromise;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        const error = new ResuxResumeLoadTimeoutError(id, this.#loadTimeoutMs);
        // Reject the registry deadline first so a cooperative loader cannot replace
        // the stable timeout error with its own abort error in the Promise race.
        reject(error);
        controller.abort(error);
      }, this.#loadTimeoutMs);
    });

    try {
      return await Promise.race([modulePromise, timeoutPromise]);
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }

  /**
   * Resolves one handler lazily, reusing cached handlers and deduplicating active loads.
   * A load that started before a replacement may still resolve for its original caller,
   * but it cannot overwrite the newer registration or its cache. Timed-out loads follow
   * the same rule: a late underlying module resolution cannot populate the handler cache.
   */
  async load(id: string): Promise<ResuxResumeHandler> {
    const cached = this.#handlers.get(id);
    if (cached) return cached;

    const active = this.#pending.get(id);
    if (active) return active;

    const entry = this.#entries.get(id);
    if (!entry) throw new Error(`Unknown resumable handler ${id}.`);
    const generation = this.#generations.get(id);

    const pending = this.#loadModule(id, entry).then((module) => {
      const hasExport = Object.hasOwn(module, entry.exportName);
      const handler = hasExport ? module[entry.exportName] : undefined;
      if (typeof handler !== "function") {
        throw new Error(
          `Resumable handler ${id} expected function export ${entry.exportName} from ${entry.module}.`,
        );
      }

      const resolved = handler as ResuxResumeHandler;
      if (this.#generations.get(id) === generation) {
        this.#handlers.set(id, resolved);
      }
      return resolved;
    });

    if (this.#generations.get(id) === generation) {
      this.#pending.set(id, pending);
    }
    try {
      return await pending;
    } finally {
      if (this.#pending.get(id) === pending) {
        this.#pending.delete(id);
      }
    }
  }

  /** Loads and executes one resumable handler with the provided arguments. */
  async run(id: string, ...args: unknown[]): Promise<unknown> {
    const handler = await this.load(id);
    return handler(...args);
  }

  /** Loads and caches one handler without executing it. */
  preload(id: string): Promise<void> {
    return this.load(id).then(() => undefined);
  }
}

/** Creates a registry and seeds it with optional manifest registrations. */
export function createResumeHandlerRegistry(
  entries: ResuxResumeRegistration[] = [],
  options: ResuxResumeRegistryOptions = {},
): ResuxResumeHandlerRegistry {
  const registry = new ResuxResumeHandlerRegistry(options);
  registry.registerMany(entries);
  return registry;
}


export const RESUX_RESUME_BOOTSTRAP_MAX_EVENT_NAMES = 32;
export const RESUX_RESUME_BOOTSTRAP_MAX_EVENT_NAME_LENGTH = 64;

export interface ResuxResumeBootstrapOptions {
  eventNames: string[];
  runtimeSrc?: string;
  deferEnhancements?: boolean;
  deferVueIslands?: boolean;
}

/**
 * Generates the tiny browser bootstrap used by Resume-First documents.
 *
 * It registers only the event types present in the server HTML, preserves
 * synchronous prevent/stop modifiers while the runtime is absent, imports the
 * full client runtime once on first interaction, then hands the original event
 * to the runtime's resumable-event dispatcher. Normal links are intentionally
 * left to the browser until Resux has a reason to resume.
 */
export function getResumeBootstrapSource(options: ResuxResumeBootstrapOptions): string {
  const eventNames = [...new Set(
    options.eventNames
      .map((name) => String(name || "").trim())
      .filter((name) => /^[\w:-]+$/.test(name)),
  )];
  if (eventNames.length > RESUX_RESUME_BOOTSTRAP_MAX_EVENT_NAMES) {
    throw new RangeError(
      `Resume bootstrap supports at most ${RESUX_RESUME_BOOTSTRAP_MAX_EVENT_NAMES} distinct event types.`,
    );
  }
  const oversizedEventName = eventNames.find(
    (name) => name.length > RESUX_RESUME_BOOTSTRAP_MAX_EVENT_NAME_LENGTH,
  );
  if (oversizedEventName) {
    throw new RangeError(
      `Resume bootstrap event names must be at most ${RESUX_RESUME_BOOTSTRAP_MAX_EVENT_NAME_LENGTH} characters.`,
    );
  }
  const runtimeSrc = options.runtimeSrc?.trim() || "/__resux/runtime-client.mjs";

  return `const __rxEvents=${JSON.stringify(eventNames)};
const __rxRuntime=${JSON.stringify(runtimeSrc)};
const __rxDeferEnhancements=${options.deferEnhancements === true};
const __rxDeferVueIslands=${options.deferVueIslands === true};
const __rxCleanups=[];
let __rxActive=true;
let __rxRuntimePromise;
let __rxRuntimeAttempt=0;
function __rxFindTarget(start,attr){
  let node=start && start.nodeType===1 ? start : start && start.parentElement;
  while(node){
    if(typeof node.hasAttribute==="function" && node.hasAttribute(attr)) return node;
    node=node.parentElement;
  }
  return null;
}
function __rxMods(target,name){
  const raw=target && target.getAttribute ? target.getAttribute("data-rx-mod-"+name) : "";
  return raw ? raw.split(",").map((value)=>value.trim()).filter(Boolean) : [];
}
function __rxMouseMatches(event,mods){
  const buttons=mods.filter((mod)=>mod==="left" || mod==="middle" || mod==="right");
  if(!buttons.length) return true;
  return buttons.some((mod)=>mod==="left" ? event.button===0 : mod==="middle" ? event.button===1 : event.button===2);
}
function __rxKeyMatches(event,mods){
  const aliases={enter:"Enter",tab:"Tab",delete:["Delete","Backspace"],esc:"Escape",escape:"Escape",space:" ",up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight"};
  const keys=mods.filter((mod)=>Object.prototype.hasOwnProperty.call(aliases,mod));
  if(!keys.length) return true;
  return keys.some((mod)=>{
    const expected=aliases[mod];
    return Array.isArray(expected) ? expected.includes(event.key) : event.key===expected;
  });
}
function __rxMatches(event,mods,name,target){
  if(mods.includes("self") && event.target!==target) return false;
  if(mods.includes("ctrl") && !event.ctrlKey) return false;
  if(mods.includes("shift") && !event.shiftKey) return false;
  if(mods.includes("alt") && !event.altKey) return false;
  if(mods.includes("meta") && !event.metaKey) return false;
  if(mods.includes("exact")){
    const expected=new Set(mods.filter((mod)=>mod==="ctrl" || mod==="shift" || mod==="alt" || mod==="meta"));
    if(event.ctrlKey!==expected.has("ctrl")) return false;
    if(event.shiftKey!==expected.has("shift")) return false;
    if(event.altKey!==expected.has("alt")) return false;
    if(event.metaKey!==expected.has("meta")) return false;
  }
  if((name==="click" || name==="mousedown" || name==="mouseup") && !__rxMouseMatches(event,mods)) return false;
  if(name.startsWith("key") && !__rxKeyMatches(event,mods)) return false;
  return true;
}
function __rxCleanup(){
  if(!__rxActive) return;
  __rxActive=false;
  while(__rxCleanups.length) __rxCleanups.pop()();
}
function __rxRuntimeRequest(){
  if(__rxRuntimeAttempt===0) return __rxRuntime;
  const separator=__rxRuntime.includes("?") ? "&" : "?";
  return __rxRuntime+separator+"rx_retry="+__rxRuntimeAttempt;
}
function __rxLoad(){
  if(!__rxRuntimePromise){
    const request=__rxRuntimeRequest();
    __rxRuntimePromise=import(request).catch((error)=>{
      __rxRuntimePromise=undefined;
      __rxRuntimeAttempt+=1;
      throw error;
    });
  }
  return __rxRuntimePromise;
}
function __rxCapture(name){
  return name==="focus"
    || name==="blur"
    || name==="mouseenter"
    || name==="mouseleave"
    || name==="pointerenter"
    || name==="pointerleave"
    || name==="load"
    || name==="error"
    || name==="loadstart"
    || name==="loadedmetadata"
    || name==="loadeddata"
    || name==="canplay"
    || name==="lazy-load-start"
    || name==="lazy-load-complete"
    || name==="invalid";
}
function __rxNormalizeTrigger(value,fallback){
  const trigger=String(value || "").trim();
  return trigger==="visible" || trigger==="interaction" || trigger==="idle" || trigger==="immediate" || trigger==="manual" || trigger==="page-load"
    ? trigger
    : fallback;
}
function __rxActivateTarget(target){
  const activate=globalThis.__RESUX_ACTIVATE_DEFERRED_TARGET__;
  return typeof activate==="function" ? Promise.resolve(activate(target)) : Promise.resolve(false);
}
async function __rxActivateManual(targetOrSelector){
  const target=typeof targetOrSelector==="string" ? document.querySelector(targetOrSelector) : targetOrSelector;
  if(!target) return false;
  await __rxLoad();
  const activated=await __rxActivateTarget(target);
  __rxCleanup();
  return activated;
}
globalThis.__RESUX_ACTIVATE_DEFERRED__=__rxActivateManual;
__rxCleanups.push(()=>{
  if(globalThis.__RESUX_ACTIVATE_DEFERRED__===__rxActivateManual){
    delete globalThis.__RESUX_ACTIVATE_DEFERRED__;
  }
});
function __rxInteractionPath(boundary,eventTarget){
  const path=[];
  let node=eventTarget && eventTarget.nodeType===1 ? eventTarget : boundary;
  while(node && node!==boundary){
    const parent=node.parentElement;
    if(!parent) return [];
    const index=Array.prototype.indexOf.call(parent.children,node);
    if(index<0) return [];
    path.push(index);
    node=parent;
  }
  return node===boundary ? path.reverse() : [];
}
function __rxCaptureInteraction(boundary,event){
  if(!event) return null;
  if(event.type==="click" && event.cancelable){
    event.preventDefault();
    event.stopImmediatePropagation();
  }else if(event.type==="focusin" || event.type==="keydown"){
    event.stopPropagation();
  }
  return {event,path:__rxInteractionPath(boundary,event.target)};
}
function __rxResolveInteractionTarget(boundary,interaction){
  let node=boundary;
  for(const index of interaction.path){
    const child=node.children && node.children[index];
    if(!child) return boundary;
    node=child;
  }
  return node;
}
function __rxReplayInteraction(boundary,interaction){
  if(!interaction) return;
  const replayTarget=__rxResolveInteractionTarget(boundary,interaction);
  if(!replayTarget || !replayTarget.isConnected) return;
  if(interaction.event.type==="click" && typeof replayTarget.click==="function"){
    replayTarget.click();
    return;
  }
  if(
    interaction.event.type==="focusin"
    && typeof replayTarget.focus==="function"
    && document.activeElement!==replayTarget
  ){
    replayTarget.focus();
    return;
  }
  let replay;
  try{
    replay=new interaction.event.constructor(interaction.event.type,interaction.event);
  }catch{
    replay=new Event(interaction.event.type,{
      bubbles:interaction.event.bubbles,
      cancelable:interaction.event.cancelable,
      composed:interaction.event.composed
    });
  }
  replayTarget.dispatchEvent(replay);
}
function __rxFindInteractionBoundary(start){
  let current=start && start.nodeType===1 ? start : start && start.parentElement;
  while(current){
    if(
      current.hasAttribute
      && current.hasAttribute("data-rx-vue-island")
      && __rxNormalizeTrigger(current.getAttribute("data-rx-vue-trigger"),"immediate")==="interaction"
    ){
      return current;
    }
    if(current.matches && current.matches("[data-resux-enhancement], [use-client-enhancement]")){
      const trigger=__rxNormalizeTrigger(
        current.getAttribute("data-resux-trigger") || current.getAttribute("data-trigger") || current.getAttribute("trigger"),
        "visible"
      );
      if(trigger==="interaction") return current;
    }
    current=current.parentElement;
  }
  return null;
}
function __rxScheduleTarget(target,trigger){
  if(!target || trigger==="manual") return;
  let disposed=false;
  let activating=false;
  let interactions=[];
  let cancel=()=>{};
  const setCancel=(next)=>{
    cancel();
    cancel=typeof next==="function" ? next : ()=>{};
  };
  const fire=(interaction)=>{
    if(interaction) interactions.push(interaction);
    if(disposed || !__rxActive || !target.isConnected || activating) return;
    activating=true;
    if(!interaction) setCancel();
    void __rxLoad()
      .then(async()=>{
        await __rxActivateTarget(target);
        const queuedInteractions=interactions;
        interactions=[];
        setCancel();
        for(const queuedInteraction of queuedInteractions){
          __rxReplayInteraction(target,queuedInteraction);
        }
        __rxCleanup();
      })
      .catch(()=>{
        activating=false;
        interactions=[];
        if(disposed || !__rxActive || !target.isConnected) return;
        const retryId=window.setTimeout(()=>{
          if(!disposed && __rxActive && target.isConnected) arm();
        },250);
        setCancel(()=>window.clearTimeout(retryId));
      });
  };
  const scheduleTimeout=(delay=0)=>{
    const id=window.setTimeout(()=>fire(),delay);
    setCancel(()=>window.clearTimeout(id));
  };
  const arm=()=>{
    if(disposed || !__rxActive || !target.isConnected) return;
    if(trigger==="immediate"){
      scheduleTimeout();
      return;
    }
    if(trigger==="page-load"){
      if(document.readyState==="complete"){
        scheduleTimeout();
        return;
      }
      const onLoad=()=>fire();
      window.addEventListener("load",onLoad,{once:true});
      setCancel(()=>window.removeEventListener("load",onLoad));
      return;
    }
    if(trigger==="idle"){
      if(typeof window.requestIdleCallback==="function"){
        const id=window.requestIdleCallback(()=>fire());
        setCancel(()=>window.cancelIdleCallback && window.cancelIdleCallback(id));
      }else{
        scheduleTimeout(32);
      }
      return;
    }
    if(trigger==="interaction"){
      const events=["click","focusin","keydown"];
      const onInteraction=(event)=>{
        fire(__rxCaptureInteraction(target,event));
      };
      for(const eventName of events){
        target.addEventListener(eventName,onInteraction,{capture:true});
      }
      setCancel(()=>{
        for(const eventName of events){
          target.removeEventListener(eventName,onInteraction,true);
        }
      });
      return;
    }
    if(trigger==="visible"){
      if(typeof IntersectionObserver!=="function"){
        scheduleTimeout();
        return;
      }
      const observer=new IntersectionObserver((entries)=>{
        if(entries.some((entry)=>entry.isIntersecting)){
          observer.disconnect();
          fire();
        }
      });
      observer.observe(target);
      setCancel(()=>observer.disconnect());
    }
  };
  arm();
  __rxCleanups.push(()=>{
    disposed=true;
    cancel();
  });
}
function __rxScheduleDeferredTargets(){
  if(__rxDeferEnhancements){
    for(const target of document.querySelectorAll("[data-resux-enhancement], [use-client-enhancement]")){
      const trigger=__rxNormalizeTrigger(
        target.getAttribute("data-resux-trigger") || target.getAttribute("data-trigger") || target.getAttribute("trigger"),
        "visible"
      );
      __rxScheduleTarget(target,trigger);
    }
  }
  if(__rxDeferVueIslands){
    for(const target of document.querySelectorAll("[data-rx-vue-island]")){
      const trigger=__rxNormalizeTrigger(target.getAttribute("data-rx-vue-trigger"),"immediate");
      __rxScheduleTarget(target,trigger);
    }
  }
}
for(const name of __rxEvents){
  const listener=(event)=>{
    if(!__rxActive) return;
    if(
      (name==="click" || name==="focusin" || name==="keydown")
      && __rxFindInteractionBoundary(event.target)
    ) return;
    const target=__rxFindTarget(event.target,"data-rx-on-"+name);
    if(!target) return;
    const mods=__rxMods(target,name);
    if(!__rxMatches(event,mods,name,target)) return;
    if((name==="submit" || mods.includes("prevent")) && !mods.includes("passive") && event.cancelable){
      event.preventDefault();
    }
    if(mods.includes("stop")) event.stopPropagation();
    void __rxLoad().then(()=>{
      const dispatch=globalThis.__RESUX_DISPATCH_RESUMED_EVENT__;
      const result=typeof dispatch==="function" ? dispatch(name,event) : undefined;
      __rxCleanup();
      return result;
    }).catch(()=>{});
  };
  const useCapture=__rxCapture(name);
  document.addEventListener(name,listener,useCapture);
  __rxCleanups.push(()=>document.removeEventListener(name,listener,useCapture));
}
__rxScheduleDeferredTargets();
`;
}
