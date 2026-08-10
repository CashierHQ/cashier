import { beforeEach, describe, expect, it } from "vitest";
import { AuthSessionMessageGuard } from "$modules/auth/services/authSessionMessageGuard";

describe("AuthSessionMessageGuard", () => {
  let guard: AuthSessionMessageGuard;

  beforeEach(() => {
    guard = new AuthSessionMessageGuard();
  });

  it("accepts an unexpired login when no session is active", () => {
    expect(
      guard.shouldAcceptLogin(
        {
          sessionId: "new",
          hardExpiresAtMs: 2_000,
          idleExpiresAtMs: 1_500,
        },
        1_000,
      ),
    ).toBe(true);
  });

  it("rejects duplicate login messages", () => {
    const session = {
      sessionId: "current",
      hardExpiresAtMs: 2_000,
      idleExpiresAtMs: 1_500,
    };
    guard.activate(session);

    expect(guard.shouldAcceptLogin(session, 1_000)).toBe(false);
  });

  it("rejects stale and expired login messages", () => {
    guard.activate({
      sessionId: "current",
      hardExpiresAtMs: 3_000,
      idleExpiresAtMs: 2_000,
    });

    expect(
      guard.shouldAcceptLogin(
        {
          sessionId: "stale",
          hardExpiresAtMs: 2_500,
          idleExpiresAtMs: 2_000,
        },
        1_000,
      ),
    ).toBe(false);
    expect(
      guard.shouldAcceptLogin(
        {
          sessionId: "expired",
          hardExpiresAtMs: 900,
          idleExpiresAtMs: 800,
        },
        1_000,
      ),
    ).toBe(false);
  });

  it("accepts a newer renewed session", () => {
    guard.activate({
      sessionId: "current",
      hardExpiresAtMs: 2_000,
      idleExpiresAtMs: 1_500,
    });

    expect(
      guard.shouldAcceptLogin(
        {
          sessionId: "renewed",
          hardExpiresAtMs: 3_000,
          idleExpiresAtMs: 2_500,
        },
        1_000,
      ),
    ).toBe(true);
  });

  it("matches activity and logout messages only to the active session", () => {
    guard.activate({
      sessionId: "current",
      hardExpiresAtMs: 2_000,
      idleExpiresAtMs: 1_500,
    });

    expect(guard.isCurrent("current")).toBe(true);
    expect(guard.isCurrent("stale")).toBe(false);

    guard.clear();
    expect(guard.isCurrent("current")).toBe(false);
  });

  it("rejects delayed login messages after the current session logs out", () => {
    const loggedOutSession = {
      sessionId: "logged-out",
      hardExpiresAtMs: 2_000,
      idleExpiresAtMs: 1_500,
    };
    guard.activate(loggedOutSession);
    guard.clear();

    expect(guard.shouldAcceptLogin(loggedOutSession, 1_000)).toBe(false);
    expect(
      guard.shouldAcceptLogin(
        {
          sessionId: "older-delayed-message",
          hardExpiresAtMs: 1_900,
          idleExpiresAtMs: 1_400,
        },
        1_000,
      ),
    ).toBe(false);
  });
});
