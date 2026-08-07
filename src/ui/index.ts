import { defineComponent, h, onMounted, ref } from "vue";
import { defineResuxModule } from "../kit/index.js";

export interface ResuxUiModuleOptions {
  css?: string[];
  tokens?: Record<string, unknown>;
  defaultStyles?: boolean;
  animations?: {
    enabled?: boolean;
    defaultPreset?: string;
  };
}

export function defineUiTokens(tokens: Record<string, unknown>): Record<string, unknown> {
  return tokens;
}

export type AnimationPreset = "fade-up" | "fade-down" | "scale-in" | "slide-in-left" | "slide-in-right" | "pulse-glow" | "bounce-in";

export interface AnimateOptions {
  type?: AnimationPreset | string;
  duration?: number;
  delay?: number;
  easing?: string;
  fill?: FillMode;
}

export function isReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useAnimate(
  target: { value: HTMLElement | null } | HTMLElement | null,
  options: AnimateOptions = {}
) {
  const element = target && "value" in target ? target.value : target;
  if (!element || typeof window === "undefined") return null;

  if (isReducedMotion()) return null;

  const type = options.type || "fade-up";
  const duration = options.duration ?? 400;
  const delay = options.delay ?? 0;
  const easing = options.easing || "cubic-bezier(0.16, 1, 0.3, 1)";

  let keyframes: Keyframe[] = [];

  switch (type) {
    case "fade-up":
      keyframes = [
        { opacity: 0, transform: "translate3d(0, 30px, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" }
      ];
      break;
    case "fade-down":
      keyframes = [
        { opacity: 0, transform: "translate3d(0, -30px, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" }
      ];
      break;
    case "scale-in":
      keyframes = [
        { opacity: 0, transform: "scale3d(0.92, 0.92, 1)" },
        { opacity: 1, transform: "scale3d(1, 1, 1)" }
      ];
      break;
    case "slide-in-left":
      keyframes = [
        { opacity: 0, transform: "translate3d(-40px, 0, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" }
      ];
      break;
    case "slide-in-right":
      keyframes = [
        { opacity: 0, transform: "translate3d(40px, 0, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" }
      ];
      break;
    case "pulse-glow":
      keyframes = [
        { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(3, 200, 191, 0.4)" },
        { transform: "scale(1.03)", boxShadow: "0 0 20px 10px rgba(3, 200, 191, 0)" },
        { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(3, 200, 191, 0)" }
      ];
      break;
    case "bounce-in":
      keyframes = [
        { opacity: 0, transform: "scale3d(0.3, 0.3, 0.3)" },
        { opacity: 0.9, transform: "scale3d(1.05, 1.05, 1.05)" },
        { opacity: 1, transform: "scale3d(1, 1, 1)" }
      ];
      break;
    default:
      keyframes = [
        { opacity: 0, transform: "translate3d(0, 20px, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" }
      ];
  }

  if ("animate" in element && typeof element.animate === "function") {
    return element.animate(keyframes, {
      duration,
      delay,
      easing,
      fill: options.fill || "forwards"
    });
  }

  return null;
}

const animeDirectiveState = new WeakMap<HTMLElement, {
  observer?: IntersectionObserver;
  animation?: Animation;
}>();

export const vAnime = {
  mounted(el: HTMLElement, binding: { value?: string | AnimateOptions }) {
    if (typeof window === "undefined" || isReducedMotion()) return;

    const config: AnimateOptions =
      typeof binding.value === "string"
        ? { type: binding.value }
        : binding.value || { type: "fade-up" };
    const state: { observer?: IntersectionObserver; animation?: Animation } = {};
    animeDirectiveState.set(el, state);

    const triggerAnimation = () => {
      const animation = useAnimate(el, { ...config, fill: config.fill ?? "both" });
      if (animation) {
        state.animation = animation;
      }
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            triggerAnimation();
            observer.unobserve(el);
            state.observer = undefined;
          }
        },
        { rootMargin: "50px" }
      );
      state.observer = observer;
      observer.observe(el);
    } else {
      triggerAnimation();
    }
  },
  unmounted(el: HTMLElement) {
    const state = animeDirectiveState.get(el);
    state?.observer?.disconnect();
    state?.animation?.cancel();
    animeDirectiveState.delete(el);
  }
};

export const vAnimate = vAnime;

// --- UI & Motion Primitive Components ---

export const RxMotion = defineComponent({
  name: "RxMotion",
  props: {
    tag: { type: String, default: "div" },
    preset: { type: String, default: "fade-up" },
    duration: { type: Number, default: 400 },
    delay: { type: Number, default: 0 },
    easing: { type: String, default: "cubic-bezier(0.16, 1, 0.3, 1)" },
    unstyled: { type: Boolean, default: false }
  },
  setup(props, { slots, attrs }) {
    const elRef = ref<HTMLElement | null>(null);
    onMounted(() => {
      if (elRef.value && !props.unstyled && !isReducedMotion()) {
        useAnimate(elRef.value, {
          type: props.preset,
          duration: props.duration,
          delay: props.delay,
          easing: props.easing
        });
      }
    });
    return () => h(props.tag, { ref: elRef, ...attrs }, slots.default ? slots.default() : []);
  }
});

export const RxReveal = defineComponent({
  name: "RxReveal",
  props: {
    preset: { type: String, default: "fade-up" },
    duration: { type: Number, default: 400 },
    unstyled: { type: Boolean, default: false }
  },
  setup(props, { slots, attrs }) {
    const elRef = ref<HTMLElement | null>(null);
    onMounted(() => {
      if (elRef.value && !props.unstyled && !isReducedMotion()) {
        useAnimate(elRef.value, { type: props.preset, duration: props.duration });
      }
    });
    return () => h("div", { ref: elRef, ...attrs }, slots.default ? slots.default() : []);
  }
});

export const RxAutoAnimate = defineComponent({
  name: "RxAutoAnimate",
  props: {
    duration: { type: Number, default: 300 },
    unstyled: { type: Boolean, default: false }
  },
  setup(props, { slots, attrs }) {
    const elRef = ref<HTMLElement | null>(null);
    onMounted(() => {
      if (elRef.value && !props.unstyled && !isReducedMotion()) {
        useAnimate(elRef.value, { type: "scale-in", duration: props.duration });
      }
    });
    return () => h("div", { ref: elRef, ...attrs }, slots.default ? slots.default() : []);
  }
});

export const RxButton = defineComponent({
  name: "RxButton",
  props: {
    variant: { type: String, default: "primary" },
    size: { type: String, default: "md" },
    type: { type: String, default: "button" },
    disabled: { type: Boolean, default: false },
    unstyled: { type: Boolean, default: false }
  },
  setup(props, { slots, attrs }) {
    return () => {
      const classes = props.unstyled
        ? (attrs.class || "")
        : ["rx-btn", `rx-btn-${props.variant}`, `rx-btn-${props.size}`, attrs.class].filter(Boolean).join(" ");
      return h("button", { ...attrs, type: props.type, disabled: props.disabled, class: classes }, slots.default ? slots.default() : []);
    };
  }
});

export const RxCard = defineComponent({
  name: "RxCard",
  props: {
    variant: { type: String, default: "default" },
    unstyled: { type: Boolean, default: false }
  },
  setup(props, { slots, attrs }) {
    return () => {
      const classes = props.unstyled
        ? (attrs.class || "")
        : ["rx-card", props.variant !== "default" ? `rx-card-${props.variant}` : "", attrs.class].filter(Boolean).join(" ");
      return h("div", { ...attrs, class: classes }, slots.default ? slots.default() : []);
    };
  }
});

export const RxBadge = defineComponent({
  name: "RxBadge",
  props: {
    variant: { type: String, default: "default" },
    unstyled: { type: Boolean, default: false }
  },
  setup(props, { slots, attrs }) {
    return () => {
      const classes = props.unstyled
        ? (attrs.class || "")
        : ["rx-badge", `rx-badge-${props.variant}`, attrs.class].filter(Boolean).join(" ");
      return h("span", { ...attrs, class: classes }, slots.default ? slots.default() : []);
    };
  }
});

export const RxInput = defineComponent({
  name: "RxInput",
  props: {
    modelValue: { type: [String, Number], default: "" },
    type: { type: String, default: "text" },
    placeholder: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
    unstyled: { type: Boolean, default: false }
  },
  emits: ["update:modelValue"],
  setup(props, { emit, attrs }) {
    return () => {
      const classes = props.unstyled
        ? (attrs.class || "")
        : ["rx-input", attrs.class].filter(Boolean).join(" ");
      return h("input", {
        ...attrs,
        type: props.type,
        value: props.modelValue,
        placeholder: props.placeholder,
        disabled: props.disabled,
        class: classes,
        onInput: (e: Event) => emit("update:modelValue", (e.target as HTMLInputElement).value)
      });
    };
  }
});

export const RxSelect = defineComponent({
  name: "RxSelect",
  props: {
    modelValue: { type: [String, Number], default: "" },
    options: { type: Array as () => Array<string | { label: string; value: string | number }>, default: () => [] },
    placeholder: { type: String, default: "Select an option" },
    disabled: { type: Boolean, default: false },
    unstyled: { type: Boolean, default: false }
  },
  emits: ["update:modelValue"],
  setup(props, { emit, attrs }) {
    const isOpen = ref(false);
    const toggle = () => {
      if (!props.disabled) isOpen.value = !isOpen.value;
    };
    const selectOption = (val: string | number) => {
      emit("update:modelValue", val);
      isOpen.value = false;
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      } else if (e.key === "Escape") {
        isOpen.value = false;
      }
    };
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-select", attrs.class].filter(Boolean).join(" ");
      const normalizedOpts = props.options.map((opt) =>
        typeof opt === "string" ? { label: opt, value: opt } : opt
      );
      const selectedObj = normalizedOpts.find((o) => o.value === props.modelValue);
      return h("div", { class: classes, tabindex: props.disabled ? -1 : 0, onKeydown: handleKeyDown }, [
        h("div", { class: props.unstyled ? "" : "rx-select-trigger", onClick: toggle }, [
          h("span", selectedObj ? selectedObj.label : props.placeholder),
          h("span", { class: props.unstyled ? "" : "rx-select-arrow" }, "▾")
        ]),
        isOpen.value
          ? h(
              "ul",
              { class: props.unstyled ? "" : "rx-select-dropdown", role: "listbox" },
              normalizedOpts.map((opt) =>
                h(
                  "li",
                  {
                    class: [props.unstyled ? "" : "rx-select-option", opt.value === props.modelValue ? "selected" : ""]
                      .filter(Boolean)
                      .join(" "),
                    role: "option",
                    onClick: () => selectOption(opt.value)
                  },
                  opt.label
                )
              )
            )
          : null
      ]);
    };
  }
});

function formatDatePickerValue(value: string | Date): string {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString().split("T")[0] : "";
  }
  return String(value || "");
}

export const RxDatePicker = defineComponent({
  name: "RxDatePicker",
  props: {
    modelValue: { type: [String, Date], default: "" },
    placeholder: { type: String, default: "Select date" },
    unstyled: { type: Boolean, default: false }
  },
  emits: ["update:modelValue"],
  setup(props, { emit, attrs }) {
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-input", "rx-datepicker", attrs.class].filter(Boolean).join(" ");
      return h("input", {
        ...attrs,
        type: "date",
        value: formatDatePickerValue(props.modelValue),
        placeholder: props.placeholder,
        class: classes,
        onInput: (e: Event) => emit("update:modelValue", (e.target as HTMLInputElement).value)
      });
    };
  }
});

export const RxPopover = defineComponent({
  name: "RxPopover",
  props: {
    open: { type: Boolean, default: false },
    unstyled: { type: Boolean, default: false }
  },
  emits: ["update:open"],
  setup(props, { slots, emit, attrs }) {
    const toggle = () => emit("update:open", !props.open);
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-popover", attrs.class].filter(Boolean).join(" ");
      return h("div", { class: classes }, [
        h("div", { onClick: toggle }, slots.trigger ? slots.trigger() : [h("button", "Toggle")]),
        props.open ? h("div", { class: props.unstyled ? "" : "rx-popover-content", ...attrs }, slots.default ? slots.default() : []) : null
      ]);
    };
  }
});

export const RxIcon = defineComponent({
  name: "RxIcon",
  props: {
    name: { type: String, default: "check" },
    size: { type: [String, Number], default: "1.25rem" },
    color: { type: String, default: "currentColor" },
    unstyled: { type: Boolean, default: false }
  },
  setup(props, { attrs }) {
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-icon", attrs.class].filter(Boolean).join(" ");
      return h("span", {
        ...attrs,
        class: classes,
        style: { fontSize: typeof props.size === "number" ? `${props.size}px` : props.size, color: props.color }
      }, `[${props.name}]`);
    };
  }
});

export const RxAvatar = defineComponent({
  name: "RxAvatar",
  props: {
    src: { type: String, default: "" },
    alt: { type: String, default: "Avatar" },
    size: { type: String, default: "md" },
    status: { type: String, default: "" },
    unstyled: { type: Boolean, default: false }
  },
  setup(props, { attrs }) {
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-avatar", `rx-avatar-${props.size}`, attrs.class].filter(Boolean).join(" ");
      const initials = props.alt ? props.alt.slice(0, 2).toUpperCase() : "RX";
      return h("div", { ...attrs, class: classes }, [
        props.src
          ? h("img", { src: props.src, alt: props.alt, class: props.unstyled ? "" : "rx-avatar-img" })
          : h("span", { class: props.unstyled ? "" : "rx-avatar-fallback" }, initials),
        props.status ? h("span", { class: props.unstyled ? "" : `rx-avatar-status rx-status-${props.status}` }) : null
      ]);
    };
  }
});

export const RxAlert = defineComponent({
  name: "RxAlert",
  props: {
    variant: { type: String, default: "info" },
    title: { type: String, default: "" },
    dismissible: { type: Boolean, default: false },
    unstyled: { type: Boolean, default: false }
  },
  emits: ["dismiss"],
  setup(props, { slots, emit, attrs }) {
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-alert", `rx-alert-${props.variant}`, attrs.class].filter(Boolean).join(" ");
      return h("div", { ...attrs, class: classes, role: "alert" }, [
        props.title ? h("div", { class: props.unstyled ? "" : "rx-alert-title" }, props.title) : null,
        h("div", { class: props.unstyled ? "" : "rx-alert-content" }, slots.default ? slots.default() : []),
        props.dismissible ? h("button", { class: props.unstyled ? "" : "rx-alert-close", onClick: () => emit("dismiss") }, "×") : null
      ]);
    };
  }
});

export const RxAccordion = defineComponent({
  name: "RxAccordion",
  props: {
    title: { type: String, default: "Accordion Title" },
    open: { type: Boolean, default: false },
    unstyled: { type: Boolean, default: false }
  },
  setup(props, { slots, attrs }) {
    const isOpen = ref(props.open);
    const toggle = () => (isOpen.value = !isOpen.value);
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-accordion", attrs.class].filter(Boolean).join(" ");
      return h("div", { ...attrs, class: classes }, [
        h("button", { class: props.unstyled ? "" : "rx-accordion-header", onClick: toggle }, [
          h("span", props.title),
          h("span", isOpen.value ? "−" : "+")
        ]),
        isOpen.value ? h("div", { class: props.unstyled ? "" : "rx-accordion-body" }, slots.default ? slots.default() : []) : null
      ]);
    };
  }
});

export const RxTooltip = defineComponent({
  name: "RxTooltip",
  props: {
    text: { type: String, default: "" },
    placement: { type: String, default: "top" },
    unstyled: { type: Boolean, default: false }
  },
  setup(props, { slots, attrs }) {
    const visible = ref(false);
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-tooltip-wrapper", attrs.class].filter(Boolean).join(" ");
      return h("div", {
        class: classes,
        onMouseenter: () => (visible.value = true),
        onMouseleave: () => (visible.value = false)
      }, [
        slots.default ? slots.default() : null,
        visible.value && props.text
          ? h("div", { class: props.unstyled ? "" : `rx-tooltip rx-tooltip-${props.placement}`, ...attrs }, props.text)
          : null
      ]);
    };
  }
});

export const RxDropdown = defineComponent({
  name: "RxDropdown",
  props: {
    items: { type: Array as () => Array<{ label: string; action?: () => void }>, default: () => [] },
    open: { type: Boolean, default: false },
    unstyled: { type: Boolean, default: false }
  },
  emits: ["update:open"],
  setup(props, { slots, emit, attrs }) {
    const toggle = () => emit("update:open", !props.open);
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-dropdown", attrs.class].filter(Boolean).join(" ");
      return h("div", { class: classes }, [
        h("div", { onClick: toggle }, slots.trigger ? slots.trigger() : [h("button", "Menu")]),
        props.open
          ? h("ul", { class: props.unstyled ? "" : "rx-dropdown-menu", ...attrs },
              props.items.map((item) =>
                h("li", {
                  class: props.unstyled ? "" : "rx-dropdown-item",
                  onClick: () => {
                    if (item.action) item.action();
                    emit("update:open", false);
                  }
                }, item.label)
              )
            )
          : null
      ]);
    };
  }
});

export const RxTabs = defineComponent({
  name: "RxTabs",
  props: {
    items: { type: Array as () => Array<{ label: string; key: string }>, default: () => [] },
    modelValue: { type: String, default: "" },
    unstyled: { type: Boolean, default: false }
  },
  emits: ["update:modelValue"],
  setup(props, { emit, attrs }) {
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-tabs", attrs.class].filter(Boolean).join(" ");
      return h("div", { ...attrs, class: classes }, [
        h("div", { class: props.unstyled ? "" : "rx-tabs-header" },
          props.items.map((item) =>
            h("button", {
              class: [props.unstyled ? "" : "rx-tab-btn", item.key === props.modelValue ? "active" : ""].filter(Boolean).join(" "),
              onClick: () => emit("update:modelValue", item.key)
            }, item.label)
          )
        )
      ]);
    };
  }
});

export const RxTextarea = defineComponent({
  name: "RxTextarea",
  props: {
    modelValue: { type: String, default: "" },
    rows: { type: Number, default: 3 },
    placeholder: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
    unstyled: { type: Boolean, default: false }
  },
  emits: ["update:modelValue"],
  setup(props, { emit, attrs }) {
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-input", "rx-textarea", attrs.class].filter(Boolean).join(" ");
      return h("textarea", {
        ...attrs,
        rows: props.rows,
        value: props.modelValue,
        placeholder: props.placeholder,
        disabled: props.disabled,
        class: classes,
        onInput: (e: Event) => emit("update:modelValue", (e.target as HTMLTextAreaElement).value)
      });
    };
  }
});

export const RxSwitch = defineComponent({
  name: "RxSwitch",
  props: {
    modelValue: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    unstyled: { type: Boolean, default: false }
  },
  emits: ["update:modelValue"],
  setup(props, { emit, attrs }) {
    const toggle = () => {
      if (!props.disabled) emit("update:modelValue", !props.modelValue);
    };
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-switch", props.modelValue ? "checked" : "", attrs.class].filter(Boolean).join(" ");
      return h("button", {
        ...attrs,
        type: "button",
        role: "switch",
        "aria-checked": props.modelValue,
        disabled: props.disabled,
        class: classes,
        onClick: toggle
      }, [
        h("span", { class: props.unstyled ? "" : "rx-switch-thumb" })
      ]);
    };
  }
});

export const RxSkeleton = defineComponent({
  name: "RxSkeleton",
  props: {
    width: { type: String, default: "100%" },
    height: { type: String, default: "1rem" },
    rounded: { type: String, default: "0.375rem" },
    unstyled: { type: Boolean, default: false }
  },
  setup(props, { attrs }) {
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-skeleton", attrs.class].filter(Boolean).join(" ");
      return h("div", {
        ...attrs,
        class: classes,
        style: { width: props.width, height: props.height, borderRadius: props.rounded }
      });
    };
  }
});

export const RxDivider = defineComponent({
  name: "RxDivider",
  props: {
    label: { type: String, default: "" },
    orientation: { type: String, default: "horizontal" },
    unstyled: { type: Boolean, default: false }
  },
  setup(props, { attrs }) {
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-divider", `rx-divider-${props.orientation}`, attrs.class].filter(Boolean).join(" ");
      return h("div", { ...attrs, class: classes }, [
        props.label ? h("span", { class: props.unstyled ? "" : "rx-divider-label" }, props.label) : null
      ]);
    };
  }
});

export const RxKbd = defineComponent({
  name: "RxKbd",
  props: {
    unstyled: { type: Boolean, default: false }
  },
  setup(props, { slots, attrs }) {
    return () => {
      const classes = props.unstyled ? (attrs.class || "") : ["rx-kbd", attrs.class].filter(Boolean).join(" ");
      return h("kbd", { ...attrs, class: classes }, slots.default ? slots.default() : []);
    };
  }
});

export const RxModal = defineComponent({
  name: "RxModal",
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: "" },
    unstyled: { type: Boolean, default: false }
  },
  emits: ["update:open", "close"],
  setup(props, { slots, emit, attrs }) {
    const close = () => {
      emit("update:open", false);
      emit("close");
    };
    return () => {
      if (!props.open) return null;
      const backdropClasses = props.unstyled ? "" : "rx-modal-backdrop";
      const contentClasses = props.unstyled ? "" : "rx-modal-content";
      return h("div", { class: backdropClasses, onClick: close }, [
        h("div", { class: contentClasses, onClick: (e: Event) => e.stopPropagation(), ...attrs }, [
          props.title ? h("h3", { style: { marginTop: 0 } }, props.title) : null,
          slots.default ? slots.default() : null
        ])
      ]);
    };
  }
});

// --- Resux* Aliases ---
export const ResuxMotion = RxMotion;
export const ResuxReveal = RxReveal;
export const ResuxAutoAnimate = RxAutoAnimate;
export const ResuxButton = RxButton;
export const ResuxCard = RxCard;
export const ResuxBadge = RxBadge;
export const ResuxInput = RxInput;
export const ResuxSelect = RxSelect;
export const ResuxDatePicker = RxDatePicker;
export const ResuxPopover = RxPopover;
export const ResuxIcon = RxIcon;
export const ResuxAvatar = RxAvatar;
export const ResuxAlert = RxAlert;
export const ResuxAccordion = RxAccordion;
export const ResuxTooltip = RxTooltip;
export const ResuxDropdown = RxDropdown;
export const ResuxTabs = RxTabs;
export const ResuxTextarea = RxTextarea;
export const ResuxSwitch = RxSwitch;
export const ResuxSkeleton = RxSkeleton;
export const ResuxDivider = RxDivider;
export const ResuxKbd = RxKbd;
export const ResuxModal = RxModal;

const uiStyles = `
@keyframes rxFadeUp {
  from { opacity: 0; transform: translate3d(0, 30px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes rxScaleIn {
  from { opacity: 0; transform: scale3d(0.92, 0.92, 1); }
  to { opacity: 1; transform: scale3d(1, 1, 1); }
}
@keyframes rxPulseGlow {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(3, 200, 191, 0.4); }
  50% { transform: scale(1.03); box-shadow: 0 0 20px 10px rgba(3, 200, 191, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(3, 200, 191, 0); }
}
@keyframes rxShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.rx-animate-fade-up { animation: rxFadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.rx-animate-scale-in { animation: rxScaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.rx-animate-pulse { animation: rxPulseGlow 2s infinite; }
`;

const uiPrimitiveStyles = `
.rx-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 1px solid transparent;
}
.rx-btn-primary { background-color: #03c8bf; color: #0f172a; border-color: #03c8bf; }
.rx-btn-primary:hover { background-color: #02b3ab; }
.rx-btn-secondary { background-color: #334155; color: #f8fafc; border-color: #334155; }
.rx-btn-secondary:hover { background-color: #475569; }
.rx-btn-outline { background-color: transparent; color: #03c8bf; border-color: #03c8bf; }
.rx-btn-outline:hover { background-color: rgba(3, 200, 191, 0.1); }
.rx-btn-ghost { background-color: transparent; color: #cbd5e1; border-color: transparent; }
.rx-btn-ghost:hover { background-color: rgba(255, 255, 255, 0.08); }
.rx-btn-sm { padding: 0.25rem 0.625rem; font-size: 0.75rem; }
.rx-btn-md { padding: 0.5rem 1rem; font-size: 0.875rem; }
.rx-btn-lg { padding: 0.75rem 1.5rem; font-size: 1rem; }

.rx-card {
  background-color: #1e293b;
  border-radius: 0.5rem;
  padding: 1.25rem;
  border: 1px solid #334155;
  color: #f8fafc;
}
.rx-card-glass {
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.rx-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.rx-badge-default { background-color: #334155; color: #e2e8f0; }
.rx-badge-success { background-color: rgba(16, 185, 129, 0.2); color: #34d399; }
.rx-badge-warning { background-color: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.rx-badge-danger { background-color: rgba(239, 68, 68, 0.2); color: #f87171; }
.rx-badge-info { background-color: rgba(59, 130, 246, 0.2); color: #60a5fa; }

.rx-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  background-color: #0f172a;
  border: 1px solid #334155;
  color: #f8fafc;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s ease;
}
.rx-input:focus { border-color: #03c8bf; }

.rx-select {
  position: relative;
  width: 100%;
  border-radius: 0.375rem;
  background-color: #0f172a;
  border: 1px solid #334155;
  color: #f8fafc;
  font-size: 0.875rem;
  cursor: pointer;
  outline: none;
}
.rx-select-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
}
.rx-select-dropdown {
  position: absolute;
  top: 100%;
  left: 0; right: 0;
  margin-top: 0.25rem;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.375rem;
  list-style: none;
  padding: 0.25rem 0;
  z-index: 100;
}
.rx-select-option {
  padding: 0.5rem 0.75rem;
}
.rx-select-option:hover, .rx-select-option.selected {
  background-color: rgba(3, 200, 191, 0.15);
  color: #03c8bf;
}

.rx-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background-color: #334155;
  color: #f8fafc;
  font-weight: 600;
  overflow: hidden;
}
.rx-avatar-sm { width: 2rem; height: 2rem; font-size: 0.75rem; }
.rx-avatar-md { width: 2.5rem; height: 2.5rem; font-size: 0.875rem; }
.rx-avatar-lg { width: 3.5rem; height: 3.5rem; font-size: 1.125rem; }
.rx-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.rx-avatar-status {
  position: absolute;
  bottom: 0; right: 0;
  width: 0.625rem; height: 0.625rem;
  border-radius: 9999px;
  border: 2px solid #0f172a;
}
.rx-status-online { background-color: #10b981; }
.rx-status-offline { background-color: #64748b; }

.rx-alert {
  padding: 0.875rem 1rem;
  border-radius: 0.375rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  position: relative;
}
.rx-alert-info { background-color: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); color: #93c5fd; }
.rx-alert-success { background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #6ee7b7; }
.rx-alert-warning { background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #fde047; }
.rx-alert-danger { background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; }
.rx-alert-title { font-weight: 600; font-size: 0.9375rem; }

.rx-accordion {
  border: 1px solid #334155;
  border-radius: 0.375rem;
  overflow: hidden;
}
.rx-accordion-header {
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: #1e293b;
  color: #f8fafc;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: none;
  cursor: pointer;
}
.rx-accordion-body {
  padding: 1rem;
  background-color: #0f172a;
  color: #cbd5e1;
}

.rx-switch {
  position: relative;
  width: 2.75rem;
  height: 1.5rem;
  border-radius: 9999px;
  background-color: #334155;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  padding: 0.125rem;
}
.rx-switch.checked { background-color: #03c8bf; }
.rx-switch-thumb {
  display: block;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  background-color: #ffffff;
  transition: transform 0.2s ease;
}
.rx-switch.checked .rx-switch-thumb { transform: translateX(1.25rem); }

.rx-skeleton {
  background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
  background-size: 200% 100%;
  animation: rxShimmer 1.5s infinite;
}

.rx-kbd {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  font-family: monospace;
  background-color: #1e293b;
  border: 1px solid #475569;
  border-radius: 0.25rem;
  color: #e2e8f0;
}

.rx-divider {
  display: flex;
  align-items: center;
  margin: 1rem 0;
}
.rx-divider-horizontal { border-bottom: 1px solid #334155; width: 100%; }
.rx-divider-label { padding: 0 0.5rem; color: #94a3b8; font-size: 0.75rem; }

.rx-modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.rx-modal-content {
  background-color: #1e293b;
  border-radius: 0.5rem;
  padding: 1.5rem;
  max-width: 500px;
  width: 90%;
  border: 1px solid #334155;
  color: #f8fafc;
}
`;

export default defineResuxModule<ResuxUiModuleOptions>({
  defaults: {
    css: [],
    tokens: {},
    defaultStyles: true,
    animations: {
      enabled: true,
      defaultPreset: "fade-up"
    }
  },
  setup(options, resux) {
    const css = Array.isArray(options.css) ? options.css : [];
    for (const href of css) {
      if (typeof href === "string" && href.trim()) {
        resux.addCss(href);
      }
    }

    const stylesToInject: string[] = [];
    if (options.animations?.enabled !== false) {
      stylesToInject.push(uiStyles);
    }
    if (options.defaultStyles !== false) {
      stylesToInject.push(uiPrimitiveStyles);
    }

    if (stylesToInject.length > 0) {
      resux.addHead({
        style: stylesToInject.map((children) => ({ children }))
      });
    }

    resux.extendRuntimeConfig({
      public: {
        ui: {
          tokens: options.tokens && typeof options.tokens === "object" ? options.tokens : {},
          defaultStyles: options.defaultStyles !== false,
          animations: {
            enabled: options.animations?.enabled !== false,
            defaultPreset: options.animations?.defaultPreset || "fade-up"
          }
        }
      }
    });
  }
});


