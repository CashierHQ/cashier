/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SessionManager } from "./sessionManager";

describe("SessionManager", () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (sessionManager) {
      sessionManager.exit();
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("should initialize with provided timeout", () => {
      const timeout = 5000;
      sessionManager = new SessionManager({ timeout });

      expect(sessionManager.timeout).toBe(timeout);
      expect(sessionManager.callbacks).toEqual([]);
    });

    it("should initialize with onTimeout callback", () => {
      const onTimeout = vi.fn();
      const timeout = 5000;

      sessionManager = new SessionManager({ timeout, onTimeout });

      expect(sessionManager.callbacks).toHaveLength(1);
      expect(sessionManager.callbacks[0]).toBe(onTimeout);
    });

    it("should set up window load event listener", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");
      const timeout = 5000;

      sessionManager = new SessionManager({ timeout });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "load",
        expect.any(Function),
        true,
      );
    });

    it("should start timer immediately", () => {
      const timeout = 5000;
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

      sessionManager = new SessionManager({ timeout });

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), timeout);
    });
  });

  describe("registerCallback", () => {
    it("should add callback to callbacks array", () => {
      const timeout = 5000;
      sessionManager = new SessionManager({ timeout });

      const callback = vi.fn();
      sessionManager.registerCallback(callback);

      expect(sessionManager.callbacks).toHaveLength(1);
      expect(sessionManager.callbacks[0]).toBe(callback);
    });

    it("should add multiple callbacks", () => {
      const timeout = 5000;
      sessionManager = new SessionManager({ timeout });

      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      sessionManager.registerCallback(callback1);
      sessionManager.registerCallback(callback2);
      sessionManager.registerCallback(callback3);

      expect(sessionManager.callbacks).toHaveLength(3);
      expect(sessionManager.callbacks).toEqual([
        callback1,
        callback2,
        callback3,
      ]);
    });

    it("should preserve onTimeout callback when registering additional callbacks", () => {
      const onTimeout = vi.fn();
      const timeout = 5000;
      sessionManager = new SessionManager({ timeout, onTimeout });

      const callback = vi.fn();
      sessionManager.registerCallback(callback);

      expect(sessionManager.callbacks).toHaveLength(2);
      expect(sessionManager.callbacks[0]).toBe(onTimeout);
      expect(sessionManager.callbacks[1]).toBe(callback);
    });
  });

  describe("timeout behavior", () => {
    it("should call onTimeout callback after timeout period", () => {
      const onTimeout = vi.fn();
      const timeout = 5000;

      sessionManager = new SessionManager({ timeout, onTimeout });

      expect(onTimeout).not.toHaveBeenCalled();

      vi.advanceTimersByTime(timeout);

      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it("should call all registered callbacks after timeout", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();
      const timeout = 5000;

      sessionManager = new SessionManager({ timeout });
      sessionManager.registerCallback(callback1);
      sessionManager.registerCallback(callback2);
      sessionManager.registerCallback(callback3);

      vi.advanceTimersByTime(timeout);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);
    });

    it("should not call callbacks before timeout", () => {
      const onTimeout = vi.fn();
      const timeout = 5000;

      sessionManager = new SessionManager({ timeout, onTimeout });

      vi.advanceTimersByTime(timeout - 1);

      expect(onTimeout).not.toHaveBeenCalled();
    });

    it("should handle different timeout values", () => {
      const onTimeout = vi.fn();
      const timeout = 10000;

      sessionManager = new SessionManager({ timeout, onTimeout });

      vi.advanceTimersByTime(5000);
      expect(onTimeout).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5000);
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });
  });

  describe("_resetTimer", () => {
    it("should reset timer and delay callback execution", () => {
      const onTimeout = vi.fn();
      const timeout = 5000;

      sessionManager = new SessionManager({ timeout, onTimeout });

      vi.advanceTimersByTime(3000);
      expect(onTimeout).not.toHaveBeenCalled();

      // Reset timer manually
      sessionManager._resetTimer();

      // Advance by another 3 seconds (total 6 seconds from start)
      vi.advanceTimersByTime(3000);
      expect(onTimeout).not.toHaveBeenCalled();

      // Advance by remaining 2 seconds to complete the reset timeout
      vi.advanceTimersByTime(2000);
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it("should clear previous timeout before setting new one", () => {
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
      const timeout = 5000;

      sessionManager = new SessionManager({ timeout });
      const firstTimeoutId = sessionManager.timeoutID;

      sessionManager._resetTimer();

      expect(clearTimeoutSpy).toHaveBeenCalledWith(firstTimeoutId);
    });

    it("should update timeoutID with new timeout", () => {
      const timeout = 5000;
      sessionManager = new SessionManager({ timeout });

      const firstTimeoutId = sessionManager.timeoutID;

      sessionManager._resetTimer();
      const secondTimeoutId = sessionManager.timeoutID;

      expect(secondTimeoutId).toBeDefined();
      expect(secondTimeoutId).not.toBe(firstTimeoutId);
    });
  });

  describe("exit", () => {
    it("should clear timeout", () => {
      const timeout = 5000;
      sessionManager = new SessionManager({ timeout });

      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
      const timeoutId = sessionManager.timeoutID;

      sessionManager.exit();

      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
    });

    it("should remove load event listener", () => {
      const timeout = 5000;
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      sessionManager = new SessionManager({ timeout });

      sessionManager.exit();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "load",
        expect.any(Function),
        true,
      );
    });

    it("should prevent callbacks from being called after exit", () => {
      const onTimeout = vi.fn();
      const timeout = 5000;

      sessionManager = new SessionManager({ timeout, onTimeout });

      sessionManager.exit();

      vi.advanceTimersByTime(timeout);

      expect(onTimeout).not.toHaveBeenCalled();
    });

    it("should be safe to call multiple times", () => {
      const timeout = 5000;
      sessionManager = new SessionManager({ timeout });

      expect(() => {
        sessionManager.exit();
        sessionManager.exit();
      }).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle zero timeout", () => {
      const onTimeout = vi.fn();
      const timeout = 0;

      sessionManager = new SessionManager({ timeout, onTimeout });

      vi.advanceTimersByTime(0);

      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it("should handle very large timeout values", () => {
      const onTimeout = vi.fn();
      const timeout = 1000000000; // 1 billion milliseconds (about 11.5 days)

      sessionManager = new SessionManager({ timeout, onTimeout });

      vi.advanceTimersByTime(1000000); // advance 1 million ms
      expect(onTimeout).not.toHaveBeenCalled();

      // Advance to the full timeout
      vi.advanceTimersByTime(timeout);
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it("should handle callback that throws error", () => {
      const errorCallback = vi.fn(() => {
        throw new Error("Callback error");
      });
      const normalCallback = vi.fn();
      const timeout = 5000;

      sessionManager = new SessionManager({ timeout });
      sessionManager.registerCallback(errorCallback);
      sessionManager.registerCallback(normalCallback);

      expect(() => {
        vi.advanceTimersByTime(timeout);
      }).toThrow("Callback error");

      expect(errorCallback).toHaveBeenCalledTimes(1);
      // normalCallback won't be called due to error in errorCallback
    });

    it("should handle empty callbacks array", () => {
      const timeout = 5000;
      sessionManager = new SessionManager({ timeout });

      expect(() => {
        vi.advanceTimersByTime(timeout);
      }).not.toThrow();
    });

    it("should maintain correct timeout reference after multiple resets", () => {
      const onTimeout = vi.fn();
      const timeout = 5000;

      sessionManager = new SessionManager({ timeout, onTimeout });

      sessionManager._resetTimer();
      sessionManager._resetTimer();
      sessionManager._resetTimer();

      vi.advanceTimersByTime(timeout);

      expect(onTimeout).toHaveBeenCalledTimes(1);
    });
  });

  describe("integration scenarios", () => {
    it("should handle typical user session scenario", () => {
      const onTimeout = vi.fn();
      const timeout = 30000; // 30 seconds

      sessionManager = new SessionManager({ timeout, onTimeout });

      // User is active for 20 seconds
      vi.advanceTimersByTime(20000);
      expect(onTimeout).not.toHaveBeenCalled();

      // User performs action, timer resets
      sessionManager._resetTimer();

      // Another 20 seconds pass
      vi.advanceTimersByTime(20000);
      expect(onTimeout).not.toHaveBeenCalled();

      // Finally, 30 seconds of inactivity
      vi.advanceTimersByTime(30000);
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it("should support multiple callback registrations during lifecycle", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();
      const timeout = 5000;

      sessionManager = new SessionManager({ timeout });

      sessionManager.registerCallback(callback1);
      vi.advanceTimersByTime(2000);

      sessionManager.registerCallback(callback2);
      vi.advanceTimersByTime(2000);

      sessionManager.registerCallback(callback3);
      vi.advanceTimersByTime(1000);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);
    });

    it("should cleanup properly before page unload", () => {
      const onTimeout = vi.fn();
      const timeout = 5000;

      sessionManager = new SessionManager({ timeout, onTimeout });

      // Simulate page unload
      sessionManager.exit();

      // Advance time after exit
      vi.advanceTimersByTime(timeout * 2);

      expect(onTimeout).not.toHaveBeenCalled();
    });
  });
});
