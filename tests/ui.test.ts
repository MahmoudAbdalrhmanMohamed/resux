import { describe, expect, it } from "vitest";
import uiModule, {
  ResuxAccordion,
  ResuxAlert,
  ResuxAutoAnimate,
  ResuxAvatar,
  ResuxBadge,
  ResuxButton,
  ResuxCard,
  ResuxDatePicker,
  ResuxDivider,
  ResuxDropdown,
  ResuxIcon,
  ResuxInput,
  ResuxKbd,
  ResuxModal,
  ResuxMotion,
  ResuxPopover,
  ResuxReveal,
  ResuxSelect,
  ResuxSkeleton,
  ResuxSwitch,
  ResuxTabs,
  ResuxTextarea,
  ResuxTooltip,
  ResuxVerificationCode,
  RxAccordion,
  RxAlert,
  RxAutoAnimate,
  RxAvatar,
  RxBadge,
  RxButton,
  RxCard,
  RxDatePicker,
  RxDivider,
  RxDropdown,
  RxIcon,
  RxInput,
  RxKbd,
  RxModal,
  RxMotion,
  RxPopover,
  RxReveal,
  RxSelect,
  RxSkeleton,
  RxSwitch,
  RxTabs,
  RxTextarea,
  RxTooltip,
  RxVerificationCode,
  defineUiTokens,
  isReducedMotion,
  useAnimate,
  vAnime,
  vAnimate
} from "../src/ui/index.js";

describe("UI & Motion Primitives (resuxjs/ui)", () => {
  it("exports UI module primitives, composables, and Resux* aliases", () => {
    expect(typeof uiModule).toBe("object");
    expect(typeof uiModule.setup).toBe("function");
    expect(typeof defineUiTokens).toBe("function");
    expect(typeof useAnimate).toBe("function");
    expect(typeof isReducedMotion).toBe("function");
    expect(typeof vAnime).toBe("object");
    expect(typeof vAnimate).toBe("object");

    // Rx* components
    expect(typeof RxMotion).toBe("object");
    expect(typeof RxReveal).toBe("object");
    expect(typeof RxAutoAnimate).toBe("object");
    expect(typeof RxButton).toBe("object");
    expect(typeof RxCard).toBe("object");
    expect(typeof RxBadge).toBe("object");
    expect(typeof RxInput).toBe("object");
    expect(typeof RxSelect).toBe("object");
    expect(typeof RxDatePicker).toBe("object");
    expect(typeof RxPopover).toBe("object");
    expect(typeof RxIcon).toBe("object");
    expect(typeof RxAvatar).toBe("object");
    expect(typeof RxAlert).toBe("object");
    expect(typeof RxAccordion).toBe("object");
    expect(typeof RxTooltip).toBe("object");
    expect(typeof RxDropdown).toBe("object");
    expect(typeof RxTabs).toBe("object");
    expect(typeof RxTextarea).toBe("object");
    expect(typeof RxSwitch).toBe("object");
    expect(typeof RxSkeleton).toBe("object");
    expect(typeof RxDivider).toBe("object");
    expect(typeof RxKbd).toBe("object");
    expect(typeof RxModal).toBe("object");
    expect(typeof RxVerificationCode).toBe("object");

    // Resux* aliases
    expect(ResuxSelect).toBe(RxSelect);
    expect(ResuxDatePicker).toBe(RxDatePicker);
    expect(ResuxPopover).toBe(RxPopover);
    expect(ResuxIcon).toBe(RxIcon);
    expect(ResuxReveal).toBe(RxReveal);
    expect(ResuxAutoAnimate).toBe(RxAutoAnimate);
    expect(ResuxButton).toBe(RxButton);
    expect(ResuxCard).toBe(RxCard);
    expect(ResuxBadge).toBe(RxBadge);
    expect(ResuxAvatar).toBe(RxAvatar);
    expect(ResuxAlert).toBe(RxAlert);
    expect(ResuxAccordion).toBe(RxAccordion);
    expect(ResuxTooltip).toBe(RxTooltip);
    expect(ResuxDropdown).toBe(RxDropdown);
    expect(ResuxTabs).toBe(RxTabs);
    expect(ResuxTextarea).toBe(RxTextarea);
    expect(ResuxSwitch).toBe(RxSwitch);
    expect(ResuxSkeleton).toBe(RxSkeleton);
    expect(ResuxDivider).toBe(RxDivider);
    expect(ResuxKbd).toBe(RxKbd);
    expect(ResuxModal).toBe(RxModal);
    expect(ResuxMotion).toBe(RxMotion);
    expect(ResuxInput).toBe(RxInput);
    expect(ResuxVerificationCode).toBe(RxVerificationCode);
  });

  it("handles module setup and injects default styles when enabled", () => {
    const addedHead: any[] = [];
    const publicConfigs: any[] = [];

    const mockResuxContext: any = {
      addCss() {},
      addHead(head: any) {
        addedHead.push(head);
      },
      extendRuntimeConfig(cfg: any) {
        publicConfigs.push(cfg);
      }
    };

    uiModule.setup(
      {
        defaultStyles: true,
        animations: { enabled: true }
      },
      mockResuxContext
    );

    expect(addedHead.length).toBe(1);
    expect(addedHead[0].style.length).toBe(2);
    expect(addedHead[0].style.some((entry: any) => entry.children.includes(".rx-verification-code"))).toBe(true);
    expect(addedHead[0].style.every((entry: any) => entry.id && entry.css === entry.children)).toBe(true);
    expect(publicConfigs[0].public.ui.defaultStyles).toBe(true);
  });

  it("disables verification-code motion when UI animations are disabled", () => {
    const addedHead: any[] = [];
    const mockResuxContext: any = {
      addCss() {},
      addHead(head: any) { addedHead.push(head); },
      extendRuntimeConfig() {}
    };

    uiModule.setup(
      { defaultStyles: true, animations: { enabled: false } },
      mockResuxContext
    );

    expect(addedHead).toHaveLength(1);
    expect(addedHead[0].style.some((entry: any) => entry.children.includes("animation: none !important"))).toBe(true);
  });

  it("renders RxSelect as a native-backed accessible form control", () => {
    const emitted: Array<[string, unknown]> = [];
    const component = RxSelect as unknown as {
      setup: (
        props: {
          modelValue: string | number;
          options: Array<string | { label: string; value: string | number; disabled?: boolean }>;
          placeholder: string;
          disabled: boolean;
          unstyled: boolean;
        },
        context: { emit: (event: string, value: unknown) => void; attrs: Record<string, unknown> },
      ) => () => any;
    };

    const render = component.setup(
      {
        modelValue: "",
        options: [
          { label: "Egypt", value: "eg" },
          { label: "Saudi Arabia", value: 966 }
        ],
        placeholder: "Country",
        disabled: false,
        unstyled: false
      },
      {
        emit: (event, value) => emitted.push([event, value]),
        attrs: { name: "country", required: true, class: "consumer-class" }
      }
    );

    const wrapper = render();
    expect(wrapper.type).toBe("div");
    expect(wrapper.props.class).toContain("rx-select");
    expect(wrapper.props.class).toContain("consumer-class");

    const select = wrapper.children[0];
    expect(select.type).toBe("select");
    expect(select.props.name).toBe("country");
    expect(select.props.required).toBe(true);
    expect(select.props.class).toBe("rx-select-native");

    select.props.onChange({ target: { selectedIndex: 2 } });
    expect(emitted).toContainEqual(["update:modelValue", 966]);
  });

  it("preserves distinct numeric and string select values", () => {
    const emitted: Array<[string, unknown]> = [];
    const component = RxSelect as unknown as {
      setup: (
        props: {
          modelValue: string | number;
          options: Array<{ label: string; value: string | number }>;
          placeholder: string;
          disabled: boolean;
          unstyled: boolean;
        },
        context: { emit: (event: string, value: unknown) => void; attrs: Record<string, unknown> },
      ) => () => any;
    };

    const render = component.setup(
      {
        modelValue: "1",
        options: [
          { label: "Number", value: 1 },
          { label: "String", value: "1" }
        ],
        placeholder: "",
        disabled: false,
        unstyled: true
      },
      {
        emit: (event, value) => emitted.push([event, value]),
        attrs: { name: "typed-value" }
      }
    );

    const select = render();
    const options = select.children.filter(Boolean);
    expect(options[0].props.selected).toBe(false);
    expect(options[1].props.selected).toBe(true);
    select.props.onChange({ target: { selectedIndex: 0 } });
    select.props.onChange({ target: { selectedIndex: 1 } });
    expect(emitted).toContainEqual(["update:modelValue", 1]);
    expect(emitted).toContainEqual(["update:modelValue", "1"]);
  });

  it("keeps RxSwitch semantic, RTL-styleable, and preserves consumer click listeners", () => {
    const emitted: Array<[string, unknown]> = [];
    let consumerClicks = 0;
    const component = RxSwitch as unknown as {
      setup: (
        props: { modelValue: boolean; disabled: boolean; unstyled: boolean },
        context: { emit: (event: string, value: unknown) => void; attrs: Record<string, unknown> },
      ) => () => any;
    };

    const render = component.setup(
      { modelValue: false, disabled: false, unstyled: false },
      {
        emit: (event, value) => emitted.push([event, value]),
        attrs: { onClick: () => { consumerClicks += 1; }, "aria-label": "Notifications" }
      }
    );

    const button = render();
    expect(button.type).toBe("button");
    expect(button.props.role).toBe("switch");
    expect(button.props["aria-checked"]).toBe("false");
    expect(button.props["data-state"]).toBe("unchecked");
    expect(button.props["aria-label"]).toBe("Notifications");

    const clickHandlers = Array.isArray(button.props.onClick) ? button.props.onClick : [button.props.onClick];
    for (const handler of clickHandlers) handler();
    expect(consumerClicks).toBe(1);
    expect(emitted).toContainEqual(["update:modelValue", true]);
  });

  it("omits default primitive styles when defaultStyles is false", () => {
    const addedHead: any[] = [];
    const publicConfigs: any[] = [];

    const mockResuxContext: any = {
      addCss() {},
      addHead(head: any) {
        addedHead.push(head);
      },
      extendRuntimeConfig(cfg: any) {
        publicConfigs.push(cfg);
      }
    };

    uiModule.setup(
      {
        defaultStyles: false,
        animations: { enabled: true }
      },
      mockResuxContext
    );

    expect(addedHead.length).toBe(1);
    expect(addedHead[0].style.length).toBe(1);
    expect(publicConfigs[0].public.ui.defaultStyles).toBe(false);
  });

  it("renders RxButton with loading state and disabled behavior", () => {
    const comp = RxButton as any;
    const renderNormal = comp.setup({ variant: "outline", size: "lg", disabled: false, loading: false, unstyled: false }, { slots: { default: () => "Click" }, attrs: {} });
    const normal = renderNormal();
    expect(normal.type).toBe("button");
    expect(normal.props.class).toContain("rx-btn-outline");
    expect(normal.props.class).toContain("rx-btn-lg");
    expect(normal.props.disabled).toBe(false);

    const renderLoading = comp.setup({ variant: "primary", size: "md", disabled: false, loading: true, unstyled: false }, { slots: { default: () => "Submitting" }, attrs: {} });
    const loading = renderLoading();
    expect(loading.props.class).toContain("is-loading");
    expect(loading.props.disabled).toBe(true);
    expect(loading.children[0].type).toBe("span");
    expect(loading.children[0].props.class).toBe("rx-btn-spinner");
  });

  it("renders RxCard supporting header, default, and footer slots", () => {
    const comp = RxCard as any;
    const render = comp.setup(
      { variant: "elevated", unstyled: false },
      {
        slots: {
          header: () => "Card Header",
          default: () => "Card Body",
          footer: () => "Card Footer"
        },
        attrs: {}
      }
    );
    const card = render();
    expect(card.props.class).toContain("rx-card-elevated");
    expect(card.children[0].props.class).toBe("rx-card-header");
    expect(card.children[1].props.class).toBe("rx-card-body");
    expect(card.children[2].props.class).toBe("rx-card-footer");
  });

  it("renders RxBadge supporting dot indicator", () => {
    const comp = RxBadge as any;
    const render = comp.setup({ variant: "success", dot: true, unstyled: false }, { slots: { default: () => "Active" }, attrs: {} });
    const badge = render();
    expect(badge.props.class).toContain("rx-badge-success");
    expect(badge.children[0].props.class).toBe("rx-badge-dot");
  });

  it("renders RxAlert with title slot and emits dismiss", () => {
    const emitted: any[] = [];
    const comp = RxAlert as any;
    const render = comp.setup(
      { variant: "warning", dismissible: true, unstyled: false },
      {
        emit: (event: string) => emitted.push(event),
        slots: { title: () => "Alert Header", default: () => "Warning description" },
        attrs: {}
      }
    );
    const alert = render();
    expect(alert.props.class).toContain("rx-alert-warning");
    expect(alert.props.role).toBe("alert");
    expect(alert.children[0].props.class).toBe("rx-alert-title");
    const closeBtn = alert.children[2];
    expect(closeBtn.props["aria-label"]).toBe("Close alert");
    closeBtn.props.onClick();
    expect(emitted).toContain("dismiss");
  });

  it("renders RxAccordion with toggle and emits update:open", () => {
    const emitted: Array<[string, unknown]> = [];
    const comp = RxAccordion as any;
    const render = comp.setup(
      { title: "FAQ", open: false, unstyled: false },
      {
        emit: (event: string, value: unknown) => emitted.push([event, value]),
        slots: { default: () => "FAQ Answer" },
        attrs: {}
      }
    );
    let accordion = render();
    const headerBtn = accordion.children[0];
    expect(headerBtn.props["aria-expanded"]).toBe("false");
    headerBtn.props.onClick();
    expect(emitted).toContainEqual(["update:open", true]);
  });

  it("renders RxModal with role dialog and emits close", () => {
    const emitted: Array<[string, unknown]> = [];
    const comp = RxModal as any;
    const render = comp.setup(
      { open: true, title: "Dialog Title", unstyled: false },
      {
        emit: (event: string, value: unknown) => emitted.push([event, value]),
        slots: { default: () => "Modal Content" },
        attrs: {}
      }
    );
    const modal = render();
    expect(modal.props.class).toBe("rx-modal-backdrop");
    const content = modal.children[0];
    expect(content.props.role).toBe("dialog");
    expect(content.props["aria-modal"]).toBe("true");

    modal.props.onClick();
    expect(emitted).toContainEqual(["update:open", false]);
    expect(emitted.some(([evt]) => evt === "close")).toBe(true);
  });

  it("renders RxDropdown with menu items and emits select", () => {
    const emitted: Array<[string, unknown]> = [];
    const comp = RxDropdown as any;
    let actionRun = false;
    const item = { label: "Action 1", action: () => { actionRun = true; } };
    const render = comp.setup(
      { items: [item], open: true, unstyled: false },
      {
        emit: (event: string, value: unknown) => emitted.push([event, value]),
        slots: {},
        attrs: {}
      }
    );
    const dropdown = render();
    const menu = dropdown.children[1];
    expect(menu.props.role).toBe("menu");
    const menuItem = menu.children[0];
    expect(menuItem.props.role).toBe("menuitem");
    menuItem.props.onClick();
    expect(actionRun).toBe(true);
    expect(emitted).toContainEqual(["select", item]);
    expect(emitted).toContainEqual(["update:open", false]);
  });

  it("renders RxTabs with tablist semantics and emits update:modelValue", () => {
    const emitted: Array<[string, unknown]> = [];
    const comp = RxTabs as any;
    const items = [
      { label: "Tab A", key: "a" },
      { label: "Tab B", key: "b" }
    ];
    const render = comp.setup(
      { items, modelValue: "a", unstyled: false },
      {
        emit: (event: string, value: unknown) => emitted.push([event, value]),
        attrs: {}
      }
    );
    const tabs = render();
    expect(tabs.props.role).toBe("tablist");
    const tabA = tabs.children[0].children[0];
    expect(tabA.props.role).toBe("tab");
    expect(tabA.props["aria-selected"]).toBe("true");
    const tabB = tabs.children[0].children[1];
    expect(tabB.props["aria-selected"]).toBe("false");
    tabB.props.onClick();
    expect(emitted).toContainEqual(["update:modelValue", "b"]);
  });

  it("supports digits prop as an alias for length in RxVerificationCode", () => {
    const comp = RxVerificationCode as any;
    const render = comp.setup(
      { modelValue: "12", digits: 6, status: "idle", unstyled: false },
      { emit: () => {}, attrs: {} }
    );
    const code = render();
    expect(code.type).toBe("div");
    expect(code.props.class).toContain("rx-verification-code");
    const cellsWrapper = code.children[1];
    expect(cellsWrapper.children).toHaveLength(6);
  });
});
