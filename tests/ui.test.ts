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
    expect(publicConfigs[0].public.ui.defaultStyles).toBe(true);
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
});
