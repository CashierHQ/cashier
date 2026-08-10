/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdleSessionManager } from "$modules/auth/services/idleSessionManager";

describe("IdleSessionManager", () => {
  let manager: IdleSessionManager | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
  });

  afterEach(() => {
    manager?.exit();
    manager = undefined;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("refreshes inactivity when this tab receives user input", () => {
    const onIdle = vi.fn();
    manager = new IdleSessionManager({
      idleTimeoutMs: 500,
      initialExpiresAtMs: 10_500,
      onIdle,
    });

    vi.advanceTimersByTime(400);
    document.dispatchEvent(new MouseEvent("mousemove"));
    vi.advanceTimersByTime(100);

    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("accepts newer activity from another tab", () => {
    const onIdle = vi.fn();
    manager = new IdleSessionManager({
      idleTimeoutMs: 500,
      initialExpiresAtMs: 10_500,
      onIdle,
    });

    vi.advanceTimersByTime(400);
    manager.syncExpiresAt(10_900);
    vi.advanceTimersByTime(100);

    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("ignores stale activity messages", () => {
    const onIdle = vi.fn();
    manager = new IdleSessionManager({
      idleTimeoutMs: 500,
      initialExpiresAtMs: 10_500,
      onIdle,
    });

    manager.syncExpiresAt(10_400);
    vi.advanceTimersByTime(500);

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("notifies the caller when local activity extends the deadline", () => {
    const onActivity = vi.fn();
    manager = new IdleSessionManager({
      idleTimeoutMs: 500,
      initialExpiresAtMs: 10_500,
      onIdle: vi.fn(),
      onActivity,
    });

    vi.advanceTimersByTime(100);
    document.dispatchEvent(new KeyboardEvent("keydown"));

    expect(onActivity).toHaveBeenCalledWith(10_600);
  });

  it("removes activity listeners and timers on exit", () => {
    const onIdle = vi.fn();
    const onActivity = vi.fn();
    manager = new IdleSessionManager({
      idleTimeoutMs: 500,
      initialExpiresAtMs: 10_500,
      onIdle,
      onActivity,
    });

    manager.exit();
    document.dispatchEvent(new MouseEvent("mousemove"));
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(1_000);

    expect(onIdle).not.toHaveBeenCalled();
    expect(onActivity).not.toHaveBeenCalled();
  });
});
