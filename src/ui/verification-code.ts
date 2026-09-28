import {
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from "vue";

export type VerificationCodeStatus = "idle" | "verifying" | "success" | "error";
export type VerificationCodeMode = "numeric" | "alphanumeric";

type VerificationCodePhase = "input" | "collapsing" | "verifying" | "success" | "error";

const COLLAPSE_DURATION_MS = 360;
const DEFAULT_CELL_STEP_PX = 56;

function normalizedLength(value: number): number {
  if (!Number.isFinite(value)) return 4;
  return Math.min(12, Math.max(1, Math.trunc(value)));
}

function normalizeStatus(value: string): VerificationCodeStatus {
  return value === "verifying" || value === "success" || value === "error" ? value : "idle";
}

function sanitizeValue(value: string, mode: VerificationCodeMode, length: number): string {
  const clean = mode === "alphanumeric"
    ? value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
    : value.replace(/\D/g, "");

  return clean.slice(0, length);
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const RxVerificationCode = defineComponent({
  name: "RxVerificationCode",
  inheritAttrs: false,
  props: {
    modelValue: { type: String, default: "" },
    length: { type: Number, default: 4 },
    status: { type: String, default: "idle" },
    mode: { type: String, default: "numeric" },
    autoFocus: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    mask: { type: Boolean, default: false },
    name: { type: String, default: "" },
    ariaLabel: { type: String, default: "Verification code" },
    verifyingText: { type: String, default: "Verifying…" },
    successText: { type: String, default: "Verified and secure" },
    errorText: { type: String, default: "The verification code is invalid" },
    unstyled: { type: Boolean, default: false }
  },
  emits: ["update:modelValue", "change", "complete", "focus", "blur"],
  setup(props, { emit, attrs }) {
    const inputRef = ref<HTMLInputElement | null>(null);
    const focused = ref(false);
    const initialStatus = normalizeStatus(props.status);
    const phase = ref<VerificationCodePhase>(
      initialStatus === "idle" ? "input" : initialStatus
    );

    let requestedStatus = initialStatus;
    let transitionTimer: ReturnType<typeof setTimeout> | undefined;

    const clearTransitionTimer = () => {
      if (transitionTimer !== undefined) {
        clearTimeout(transitionTimer);
        transitionTimer = undefined;
      }
    };

    const settleRequestedStatus = () => {
      transitionTimer = undefined;
      phase.value = requestedStatus === "success" ? "success" : "verifying";
    };

    const transitionToStatus = (nextStatus: VerificationCodeStatus) => {
      requestedStatus = nextStatus;

      if (nextStatus === "idle") {
        clearTransitionTimer();
        phase.value = "input";
        return;
      }

      if (nextStatus === "error") {
        clearTransitionTimer();
        phase.value = "error";
        return;
      }

      if (phase.value === "collapsing") {
        return;
      }

      if (phase.value === "input" || phase.value === "error") {
        if (prefersReducedMotion()) {
          phase.value = nextStatus;
          return;
        }

        phase.value = "collapsing";
        clearTransitionTimer();
        transitionTimer = setTimeout(settleRequestedStatus, COLLAPSE_DURATION_MS);
        return;
      }

      phase.value = nextStatus;
    };

    watch(
      () => props.status,
      (status) => transitionToStatus(normalizeStatus(status))
    );

    const focusInput = () => {
      if (props.disabled || (phase.value !== "input" && phase.value !== "error")) return;
      inputRef.value?.focus();
    };

    const handleInput = (event: Event) => {
      const input = event.target as HTMLInputElement;
      const length = normalizedLength(props.length);
      const mode: VerificationCodeMode = props.mode === "alphanumeric" ? "alphanumeric" : "numeric";
      const nextValue = sanitizeValue(input.value, mode, length);

      if (input.value !== nextValue) {
        input.value = nextValue;
      }

      emit("update:modelValue", nextValue);
      emit("change", nextValue);

      if (nextValue.length === length) {
        emit("complete", nextValue);
      }
    };

    const handleFocus = (event: FocusEvent) => {
      focused.value = true;
      emit("focus", event);
    };

    const handleBlur = (event: FocusEvent) => {
      focused.value = false;
      emit("blur", event);
    };

    onMounted(() => {
      if (props.autoFocus && !props.disabled) {
        void nextTick(focusInput);
      }
    });

    onBeforeUnmount(clearTransitionTimer);

    return () => {
      const length = normalizedLength(props.length);
      const mode: VerificationCodeMode = props.mode === "alphanumeric" ? "alphanumeric" : "numeric";
      const code = sanitizeValue(String(props.modelValue || ""), mode, length);
      const status = normalizeStatus(props.status);
      const showCells = phase.value === "input" || phase.value === "error" || phase.value === "collapsing";

      const rootClass = props.unstyled
        ? attrs.class
        : [
            "rx-verification-code",
            focused.value ? "is-focused" : "",
            phase.value === "error" ? "is-error" : "",
            phase.value === "collapsing" ? "is-collapsing" : "",
            attrs.class
          ].filter(Boolean);

      const input = h("input", {
        ref: inputRef,
        value: code,
        type: props.mask ? "password" : "text",
        inputmode: mode === "numeric" ? "numeric" : "text",
        pattern: mode === "numeric" ? "[0-9]*" : undefined,
        maxlength: length,
        autocomplete: "one-time-code",
        autocapitalize: mode === "alphanumeric" ? "characters" : "off",
        spellcheck: false,
        disabled: props.disabled,
        name: props.name || undefined,
        "aria-label": props.ariaLabel,
        "aria-invalid": status === "error" ? "true" : undefined,
        "aria-describedby": status === "error" && props.errorText ? "rx-verification-code-message" : undefined,
        style: {
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: "0",
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: "0",
          opacity: "0"
        },
        onInput: handleInput,
        onFocus: handleFocus,
        onBlur: handleBlur
      });

      const cells = Array.from({ length }, (_, index) => {
        const char = code[index] || "";
        const isFilled = char.length > 0;
        const activeIndex = code.length >= length ? length - 1 : code.length;
        const isActive = focused.value && index === activeIndex && phase.value !== "collapsing";
        const shift = ((length - 1) / 2 - index) * DEFAULT_CELL_STEP_PX;
        const rotate = (index - (length - 1) / 2) * 5;

        const cellClass = props.unstyled
          ? undefined
          : [
              "rx-verification-code-cell",
              isFilled ? "is-filled" : "",
              isActive ? "is-active" : ""
            ].filter(Boolean);

        return h(
          "span",
          {
            key: index,
            class: cellClass,
            "aria-hidden": "true",
            "data-filled": isFilled ? "true" : "false",
            "data-active": isActive ? "true" : "false",
            style: props.unstyled
              ? undefined
              : {
                  "--rx-otp-shift": `${shift}px`,
                  "--rx-otp-rotate": `${rotate}deg`,
                  "--rx-otp-delay": `${index * 22}ms`
                }
          },
          char ? (props.mask ? "•" : char) : "\u00a0"
        );
      });

      const message = phase.value === "success"
        ? props.successText
        : phase.value === "verifying"
          ? props.verifyingText
          : phase.value === "error"
            ? props.errorText
            : "";

      const statusView = !showCells
        ? h(
            "div",
            {
              class: props.unstyled
                ? undefined
                : [
                    "rx-verification-code-status",
                    phase.value === "success" ? "is-success" : "is-verifying"
                  ],
              role: "status",
              "aria-live": "polite"
            },
            [
              h(
                "span",
                {
                  class: props.unstyled
                    ? undefined
                    : [
                        "rx-verification-code-orb",
                        phase.value === "success" ? "is-success" : "is-verifying"
                      ],
                  "aria-hidden": "true"
                },
                phase.value === "success"
                  ? [h("span", { class: props.unstyled ? undefined : "rx-verification-code-check" }, "✓")]
                  : [h("span", { class: props.unstyled ? undefined : "rx-verification-code-spinner" })]
              ),
              message
                ? h(
                    "span",
                    { class: props.unstyled ? undefined : "rx-verification-code-message" },
                    message
                  )
                : null
            ]
          )
        : null;

      const errorMessage = phase.value === "error" && props.errorText
        ? h(
            "span",
            {
              id: "rx-verification-code-message",
              class: props.unstyled ? undefined : "rx-verification-code-error",
              role: "alert"
            },
            props.errorText
          )
        : null;

      return h(
        "div",
        {
          ...attrs,
          class: rootClass,
          "data-phase": phase.value,
          "data-status": status,
          "data-disabled": props.disabled ? "true" : "false",
          onClick: focusInput
        },
        [
          input,
          showCells
            ? h(
                "div",
                {
                  class: props.unstyled ? undefined : "rx-verification-code-cells",
                  "aria-hidden": "true"
                },
                cells
              )
            : statusView,
          errorMessage
        ]
      );
    };
  }
});

export const verificationCodeStyles = `
@keyframes rxVerificationFill {
  0% { transform: translateY(5px) scale(0.72) rotate(-7deg); opacity: 0.2; }
  60% { transform: translateY(-2px) scale(1.08) rotate(3deg); opacity: 1; }
  100% { transform: translateY(0) scale(1) rotate(0); opacity: 1; }
}
@keyframes rxVerificationStatusIn {
  0% { transform: scale(0.18) rotate(-18deg); opacity: 0; }
  62% { transform: scale(1.12) rotate(5deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}
@keyframes rxVerificationPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.24); }
  50% { transform: scale(1.07); box-shadow: 0 10px 28px rgba(37, 99, 235, 0.36); }
}
@keyframes rxVerificationSpin {
  to { transform: rotate(360deg); }
}
@keyframes rxVerificationShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(5px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(3px); }
}

.rx-verification-code {
  --rx-verification-accent: #2563eb;
  --rx-verification-accent-soft: #dbeafe;
  --rx-verification-success: #10b981;
  --rx-verification-danger: #ef4444;
  --rx-verification-cell-bg: #ffffff;
  --rx-verification-cell-border: #cbd5e1;
  --rx-verification-cell-text: #0f172a;
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  max-width: 100%;
  cursor: text;
  -webkit-tap-highlight-color: transparent;
}
.rx-verification-code[data-disabled="true"] {
  cursor: not-allowed;
  opacity: 0.55;
}
.rx-verification-code-cells {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 3rem;
  perspective: 700px;
}
.rx-verification-code-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  box-sizing: border-box;
  border: 1.5px solid var(--rx-verification-cell-border);
  border-radius: 0.75rem;
  background: var(--rx-verification-cell-bg);
  color: var(--rx-verification-cell-text);
  font-size: 1.05rem;
  font-weight: 750;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 5px 14px rgba(15, 23, 42, 0.06);
  transform-origin: center;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background 180ms ease,
    color 180ms ease,
    transform 180ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 180ms ease;
}
.rx-verification-code-cell.is-active {
  border-color: var(--rx-verification-accent);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--rx-verification-accent) 15%, transparent),
    0 6px 18px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
}
.rx-verification-code-cell.is-filled {
  border-color: transparent;
  color: #ffffff;
  background: linear-gradient(145deg, #60a5fa, var(--rx-verification-accent));
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22);
  animation: rxVerificationFill 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.rx-verification-code.is-collapsing .rx-verification-code-cell {
  border-color: transparent;
  background: linear-gradient(145deg, #60a5fa, var(--rx-verification-accent));
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.2);
  transform:
    translateX(var(--rx-otp-shift))
    scale(0.16)
    rotate(var(--rx-otp-rotate));
  opacity: 0;
  transition:
    transform 340ms cubic-bezier(0.7, 0, 0.84, 0),
    opacity 260ms ease;
  transition-delay: var(--rx-otp-delay);
}
.rx-verification-code.is-error .rx-verification-code-cells {
  animation: rxVerificationShake 360ms ease-in-out;
}
.rx-verification-code.is-error .rx-verification-code-cell {
  border-color: color-mix(in srgb, var(--rx-verification-danger) 72%, white);
}
.rx-verification-code-status {
  min-height: 3rem;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  animation: rxVerificationStatusIn 420ms cubic-bezier(0.16, 1, 0.3, 1);
}
.rx-verification-code-orb {
  width: 3rem;
  height: 3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
}
.rx-verification-code-orb.is-verifying {
  background: linear-gradient(145deg, #60a5fa, var(--rx-verification-accent));
  animation: rxVerificationPulse 1.25s ease-in-out infinite;
}
.rx-verification-code-orb.is-success {
  color: #ffffff;
  background: linear-gradient(145deg, #34d399, var(--rx-verification-success));
  box-shadow: 0 10px 24px rgba(16, 185, 129, 0.28);
}
.rx-verification-code-spinner {
  width: 1.1rem;
  height: 1.1rem;
  box-sizing: border-box;
  border: 2px solid rgba(255, 255, 255, 0.42);
  border-top-color: #ffffff;
  border-radius: 9999px;
  animation: rxVerificationSpin 700ms linear infinite;
}
.rx-verification-code-check {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
  transform: translateY(-1px);
}
.rx-verification-code-message {
  color: var(--rx-verification-success);
  font-size: 0.8rem;
  font-weight: 650;
}
.rx-verification-code-status.is-verifying .rx-verification-code-message {
  color: #64748b;
}
.rx-verification-code-error {
  color: var(--rx-verification-danger);
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
}

@media (max-width: 420px) {
  .rx-verification-code-cells {
    gap: 0.375rem;
  }
  .rx-verification-code-cell {
    width: 2.65rem;
    height: 2.65rem;
    border-radius: 0.65rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rx-verification-code *,
  .rx-verification-code *::before,
  .rx-verification-code *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0ms !important;
  }
}
`;
