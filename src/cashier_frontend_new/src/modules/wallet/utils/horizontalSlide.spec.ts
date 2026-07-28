import { describe, expect, it, vi } from "vitest";
import { horizontalSlide } from "$modules/wallet/utils/horizontalSlide";

const node = {} as Element;

describe("horizontalSlide", () => {
  it("returns transition duration and easing", () => {
    const easing = vi.fn((t: number) => t * t);
    const transition = horizontalSlide(node, {
      xPercent: 100,
      duration: 260,
      easing,
    });

    expect(transition.duration).toBe(260);
    expect(transition.easing).toBe(easing);
  });

  it("builds horizontal translate CSS from remaining transition progress", () => {
    const transition = horizontalSlide(node, {
      xPercent: 100,
      duration: 260,
    });

    expect(transition.css(0, 1)).toBe("transform: translateX(100%);");
    expect(transition.css(0.5, 0.5)).toBe("transform: translateX(50%);");
    expect(transition.css(1, 0)).toBe("transform: translateX(0%);");
  });

  it("supports negative horizontal offsets", () => {
    const transition = horizontalSlide(node, {
      xPercent: -100,
      duration: 260,
    });

    expect(transition.css(0.25, 0.75)).toBe("transform: translateX(-75%);");
  });
});
