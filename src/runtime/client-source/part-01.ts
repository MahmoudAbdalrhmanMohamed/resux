// Client runtime source, part 1 of 9. Concatenated by getClientRuntimeSource() in ../index.ts.
export const clientRuntimePart01 = String.raw`
const scopeCache = new Map();

function parseUserAgent(ua) {
  const userAgent = ua || "";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|PlayBook|Silk/i.test(userAgent) || (isMobile && /Tablet/i.test(userAgent));
  const isIos = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;
  return {
    isMobile,
    isTablet,
    isDesktop,
    isIos,
    isAndroid
  };
}

function useDevice() {
  const app = globalThis.__RESUX_APP__;
  const ua = app?.route?.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return parseUserAgent(ua);
}

if (typeof globalThis !== "undefined") {
  const defineProp = (name, getter) => {
    if (!(name in globalThis)) {
      let hasCustomVal = false;
      let customVal;
      Object.defineProperty(globalThis, name, {
        get() {
          return hasCustomVal ? customVal : getter();
        },
        set(v) {
          hasCustomVal = true;
          customVal = v;
        },
        configurable: true
      });
    }
  };

  defineProp("$device", () => {
    try {
      const app = globalThis.__RESUX_APP__;
      const ua = app?.route?.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : "");
      return parseUserAgent(ua);
    } catch (e) {
      return { isMobile: false, isTablet: false, isDesktop: true, isIos: false, isAndroid: false };
    }
  });
  defineProp("device", () => globalThis.$device);

  defineProp("$config", () => {
    try {
      const app = globalThis.__RESUX_APP__;
      return app ? app.$config : { public: {} };
    } catch (e) {
      return { public: {} };
    }
  });
  defineProp("config", () => globalThis.$config);

  defineProp("$route", () => {
    try {
      const app = globalThis.__RESUX_APP__;
      return app ? app.route : { path: "/", params: {}, query: {} };
    } catch (e) {
      return { path: "/", params: {}, query: {} };
    }
  });
  defineProp("route", () => globalThis.$route);

  defineProp("$router", () => {
    try {
      return globalThis.__RESUX_ROUTER__;
    } catch (e) {
      return null;
    }
  });
  defineProp("router", () => globalThis.$router);

  defineProp("$fetch", () => {
    return (url, init) => fetch(url, init).then(r => r.json());
  });

  defineProp("$t", () => {
    return (key, params) => {
      try {
        return useClientI18n().t(key, params);
      } catch (e) {
        return key;
      }
    };
  });
  defineProp("t", () => globalThis.$t);

  defineProp("$localePath", () => {
    return (to, localeCode) => {
      try {
        return globalThis.__RESUX_USE_LOCALE_PATH__ ? globalThis.__RESUX_USE_LOCALE_PATH__()(to, localeCode) : to;
      } catch (e) {
        return to;
      }
    };
  });
  defineProp("localePath", () => globalThis.$localePath);

  defineProp("$switchLocalePath", () => {
    return (localeCode, to) => {
      try {
        return globalThis.__RESUX_USE_SWITCH_LOCALE_PATH__ ? globalThis.__RESUX_USE_SWITCH_LOCALE_PATH__()(localeCode, to) : to;
      } catch (e) {
        return to;
      }
    };
  });
  defineProp("switchLocalePath", () => globalThis.$switchLocalePath);
}

const routePayloadCache = new Map();
const routePayloadRequests = new Map();
const routePayloadFailures = new Map();
const routeStylePreloadPromises = new Map();
const routeStylePrefetchPromises = new Map();
const routeStylePrefetchedDestinations = new WeakMap();
const routeStyleSettledLinks = new WeakSet();
let routeStyleNavigationController;
const ROUTE_PAYLOAD_CACHE_MAX_ENTRIES = 64;
const ROUTE_PAYLOAD_FAILURE_MAX_ENTRIES = 64;
const ROUTE_PREFETCH_MAX_IN_FLIGHT = 8;
const ROUTE_PREFETCH_FAILURE_COOLDOWN_MS = 5000;
const ROUTE_PAYLOAD_TIMEOUT_MS = 30000;
let routePayloadGeneration = 0;
let clientRouteRevision;
function getClientRouteRevision() {
  clientRouteRevision ||= ref(0);
  return clientRouteRevision;
}
const mountedVueIslands = new Map();
const scheduledVueIslands = new Map();
const mountingVueIslands = new Map();
const pendingAsyncDataControllers = globalThis.__RESUX_PENDING_ASYNC_DATA_CONTROLLERS__ ||= new Set();
let devImportRevision = 0;
let routeTransitionToken = 0;
let routeTransitionHideTimer = 0;
let routeTransitionShowTimer = 0;
let routeTransitionProgressTimer = 0;
let routeTransitionStartedAt = 0;
let routeTransitionVisible = false;
let routeTransitionIndicator = null;
const lazyImageObservers = new Map();
const lazyVideoObservers = new Map();
const clientPluginIds = new Set();
const clientMiddlewareById = new Map();
const clientProvides = globalThis.__RESUX_PROVIDES__ ||= {};
const globalStateRefs = globalThis.__RESUX_GLOBAL_STATE_REFS__ ||= new Map();
const globalStateSnapshots = globalThis.__RESUX_GLOBAL_STATE_SNAPSHOTS__ ||= new Map();
const dirtyGlobalStateKeys = new Set();
let globalStateRefreshQueued = false;
const RESUX_LAZY_PLACEHOLDER_SRC = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const RESUX_DEFAULT_PLACEHOLDER_SRC = "/__resux/resux-placeholder.svg";
const observedLazyImages = new Set();
const observedLazyVideos = new Set();
const lazyImageObserverByElement = new WeakMap();
const lazyVideoObserverByElement = new WeakMap();
const failedMediaSources = new Set();
const initializedVideoControlShells = new WeakSet();
const managedVideoControlSyncByShell = new WeakMap();
const managedVideoControlCleanupByShell = new WeakMap();
const managedVideoControlShells = new Set();
let managedVideoFullscreenListenersReady = false;
const registeredDelegatedEvents = new Set();
let managedPageLoadReady = typeof document !== "undefined"
  ? document.readyState === "complete"
  : true;
const resuxLazyPackageCache = new Map();
const resuxLoadedPackages = new Set();
const resuxInjectedPackageCss = new Set();
const resuxClientEnhancements = new Map();
const resuxActiveEnhancementDisposers = new Set();
const resuxScheduledEnhancementDisposers = new Set();
const resuxBoundEnhancementTargets = new WeakSet();
const resuxDeclaredEnhancementActivators = new WeakMap();
const resuxVisibleEnhancementCallbacks = new Map();
let resuxVisibleEnhancementObserver = null;
let resuxVisibleEnhancementPollTimer = 0;
const RESUX_ENHANCEMENT_IDLE_TIMEOUT_MS = 5000;
let resuxClientEnhancementManifestPromise = null;
`;
