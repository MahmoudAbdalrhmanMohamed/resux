import { afterEach, describe, expect, it } from "vitest";
import { RxDatePicker, vAnime } from "../src/ui/index.js";

const originalWindow = globalThis.window;
const originalIntersectionObserver = globalThis.IntersectionObserver;

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as Record<string, unknown>).window;
  } else {
    globalThis.window = originalWindow;
  }
  if (originalIntersectionObserver === undefined) {
    delete (globalThis as Record<string, unknown>).IntersectionObserver;
  } else {
    globalThis.IntersectionObserver = originalIntersectionObserver;
  }
});

describe("UI regressions", () => {
  it("does not permanently hide directive targets when Web Animations are unavailable", () => {
    Object.assign(globalThis, {
      window: {},
    });
    const element = {
      style: {},
    } as unknown as HTMLElement;

    vAnime.mounted(element, { value: "pulse-glow" });

    expect(element.style.opacity).not.toBe("0");
    vAnime.unmounted(element);
  });

  it("disconnects pending animation observers when the directive unmounts", () => {
    let disconnected = 0;
    class MockIntersectionObserver {
      constructor(_callback: IntersectionObserverCallback) {}
      observe() {}
      unobserve() {}
      disconnect() {
        disconnected += 1;
      }
    }
    Object.assign(globalThis, {
      window: { IntersectionObserver: MockIntersectionObserver },
      IntersectionObserver: MockIntersectionObserver,
    });
    const element = {
      style: {},
    } as unknown as HTMLElement;

    vAnime.mounted(element, { value: "fade-up" });
    vAnime.unmounted(element);

    expect(disconnected).toBe(1);
  });

  it("recomputes RxDatePicker values when props change and tolerates invalid dates", () => {
    const props: {
      modelValue: string | Date;
      placeholder: string;
      unstyled: boolean;
    } = {
      modelValue: "2026-08-07",
      placeholder: "Pick a date",
      unstyled: false,
    };
    const component = RxDatePicker as unknown as {
      setup: (
        input: typeof props,
        context: { emit: () => void; attrs: Record<string, unknown> },
      ) => () => { props?: Record<string, unknown> };
    };
    const render = component.setup(props, {
      emit() {},
      attrs: {},
    });

    expect(render().props?.value).toBe("2026-08-07");

    props.modelValue = new Date("2026-08-09T12:00:00.000Z");
    expect(render().props?.value).toBe("2026-08-09");

    props.modelValue = new Date(Number.NaN);
    expect(render().props?.value).toBe("");
  });
});
