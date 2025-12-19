import { describe, it, expect, afterEach, vi } from "vitest";
import { getMobileImageHeight } from "./getMobileImageHeight";

describe("getMobileImageHeight", () => {
  // Helper function to mock window dimensions
  const mockWindow = (width: number, height: number) => {
    vi.stubGlobal("window", {
      innerWidth: width,
      innerHeight: height,
    });
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("SSR scenario (window undefined)", () => {
    it("should return '200px' when window is undefined", () => {
      vi.stubGlobal("window", undefined);
      expect(getMobileImageHeight()).toBe("200px");
    });
  });

  describe("Desktop/Tablet (width >= 768px)", () => {
    it("should return null for desktop width (1920px)", () => {
      mockWindow(1920, 1080);
      expect(getMobileImageHeight()).toBeNull();
    });

    it("should return null for tablet width (768px)", () => {
      mockWindow(768, 1024);
      expect(getMobileImageHeight()).toBeNull();
    });

    it("should return null for width at breakpoint boundary (768px)", () => {
      mockWindow(768, 800);
      expect(getMobileImageHeight()).toBeNull();
    });
  });

  describe("Mobile scenarios (width < 768px)", () => {
    it("should calculate correctly for normal mobile viewport (375x667)", () => {
      mockWindow(375, 667);
      // 667 - 426 = 241
      expect(getMobileImageHeight()).toBe("241px");
    });

    it("should calculate correctly for large mobile viewport (414x896)", () => {
      mockWindow(414, 896);
      // 896 - 426 = 470
      expect(getMobileImageHeight()).toBe("470px");
    });

    it("should calculate correctly for iPhone SE viewport (375x667)", () => {
      mockWindow(375, 667);
      // 667 - 426 = 241
      expect(getMobileImageHeight()).toBe("241px");
    });

    it("should calculate correctly for small mobile viewport (360x640)", () => {
      mockWindow(360, 640);
      // 640 - 426 = 214
      expect(getMobileImageHeight()).toBe("214px");
    });

    it("should use mobile calculation for width just below breakpoint (767px)", () => {
      mockWindow(767, 1024);
      // 1024 - 426 = 598
      expect(getMobileImageHeight()).toBe("598px");
    });
  });

  describe("Minimum height constraint (200px)", () => {
    it("should return minimum height when calculated height is below 200px", () => {
      mockWindow(375, 600);
      // 600 - 426 = 174, but min is 200
      expect(getMobileImageHeight()).toBe("200px");
    });

    it("should return '200px' for very small viewport (375x500)", () => {
      mockWindow(375, 500);
      // 500 - 426 = 74, but min is 200
      expect(getMobileImageHeight()).toBe("200px");
    });

    it("should return '200px' when calculated height is exactly at minimum boundary", () => {
      mockWindow(375, 626);
      // 626 - 426 = 200, exactly at minimum
      expect(getMobileImageHeight()).toBe("200px");
    });

    it("should return calculated height when just above minimum (627px height)", () => {
      mockWindow(375, 627);
      // 627 - 426 = 201, just above minimum
      expect(getMobileImageHeight()).toBe("201px");
    });
  });

  describe("Edge cases", () => {
    it("should handle extremely small mobile height", () => {
      mockWindow(320, 400);
      // 400 - 426 = -26, but min is 200
      expect(getMobileImageHeight()).toBe("200px");
    });

    it("should handle extremely large mobile height", () => {
      mockWindow(375, 2000);
      // 2000 - 426 = 1574
      expect(getMobileImageHeight()).toBe("1574px");
    });

    it("should handle minimum mobile width (320px)", () => {
      mockWindow(320, 568);
      // 568 - 426 = 142, but min is 200
      expect(getMobileImageHeight()).toBe("200px");
    });

    it("should handle width at mobile boundary (767px)", () => {
      mockWindow(767, 700);
      // 700 - 426 = 274
      expect(getMobileImageHeight()).toBe("274px");
    });
  });
});
