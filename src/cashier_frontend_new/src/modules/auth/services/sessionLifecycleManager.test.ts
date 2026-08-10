/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionLifecycleManager } from "$modules/auth/services/sessionLifecycleManager";

describe("SessionLifecycleManager", () => {
  let manager: SessionLifecycleManager;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    manager = new SessionLifecycleManager();
  });

  afterEach(() => {
    manager.exit();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("disposes the previous lifecycle when a login renews the session", () => {
    const oldHardExpiry = vi.fn();
    const oldIdleExpiry = vi.fn();
    const renewedHardExpiry = vi.fn();

    manager.renew({
      hardExpiresAtMs: 11_000,
      idleExpiresAtMs: 10_500,
      idleTimeoutMs: 500,
      onHardExpiry: oldHardExpiry,
      onIdleExpiry: oldIdleExpiry,
    });

    vi.advanceTimersByTime(400);
    manager.renew({
      hardExpiresAtMs: 11_400,
      idleExpiresAtMs: 12_000,
      idleTimeoutMs: 500,
      onHardExpiry: renewedHardExpiry,
      onIdleExpiry: vi.fn(),
    });

    vi.advanceTimersByTime(600);
    expect(oldHardExpiry).not.toHaveBeenCalled();
    expect(oldIdleExpiry).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(renewedHardExpiry).toHaveBeenCalledTimes(1);
  });

  it("extends the idle deadline when another tab reports activity", () => {
    const onIdleExpiry = vi.fn();
    manager.renew({
      hardExpiresAtMs: 20_000,
      idleExpiresAtMs: 10_500,
      idleTimeoutMs: 500,
      onHardExpiry: vi.fn(),
      onIdleExpiry,
    });

    vi.advanceTimersByTime(400);
    manager.syncActivity(10_900);
    vi.advanceTimersByTime(100);

    expect(onIdleExpiry).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(onIdleExpiry).toHaveBeenCalledTimes(1);
  });

  it("never extends the hard deadline when local activity refreshes idle", () => {
    const onHardExpiry = vi.fn();
    const onIdleExpiry = vi.fn();
    manager.renew({
      hardExpiresAtMs: 11_000,
      idleExpiresAtMs: 10_500,
      idleTimeoutMs: 500,
      onHardExpiry,
      onIdleExpiry,
    });

    vi.advanceTimersByTime(400);
    document.dispatchEvent(new MouseEvent("mousemove"));
    vi.advanceTimersByTime(400);
    document.dispatchEvent(new KeyboardEvent("keydown"));
    vi.advanceTimersByTime(200);

    expect(onHardExpiry).toHaveBeenCalledTimes(1);
    expect(onIdleExpiry).not.toHaveBeenCalled();
  });

  it("cancels every callback when the session logs out", () => {
    const onHardExpiry = vi.fn();
    const onIdleExpiry = vi.fn();
    manager.renew({
      hardExpiresAtMs: 10_500,
      idleExpiresAtMs: 10_500,
      idleTimeoutMs: 500,
      onHardExpiry,
      onIdleExpiry,
    });

    manager.exit();
    vi.advanceTimersByTime(1_000);

    expect(onHardExpiry).not.toHaveBeenCalled();
    expect(onIdleExpiry).not.toHaveBeenCalled();
  });
});
