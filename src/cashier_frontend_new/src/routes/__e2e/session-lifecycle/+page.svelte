<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { TypedBroadcastChannel } from "$lib/broadcast";
  import {
    AUTH_BROADCAST_MESSAGE_ACTIVITY,
    AUTH_BROADCAST_MESSAGE_LOGIN,
    AUTH_BROADCAST_MESSAGE_LOGOUT,
  } from "$modules/auth/constants";
  import { AuthSessionMessageGuard } from "$modules/auth/services/authSessionMessageGuard";
  import { SessionLifecycleManager } from "$modules/auth/services/sessionLifecycleManager";
  import type {
    AuthBroadcastMessage,
    LogoutReason,
    SessionLifecycleTimestamps,
  } from "$modules/auth/types";

  const STORAGE_KEY = "cashier-session-lifecycle-e2e";
  const CHANNEL_NAME = "cashier-session-lifecycle-e2e";
  const WALLET_ID = "iiSigner";

  type FixtureSession = SessionLifecycleTimestamps & { walletId: string };

  const guard = new AuthSessionMessageGuard();
  const lifecycle = new SessionLifecycleManager();
  let channel: TypedBroadcastChannel<AuthBroadcastMessage> | null = null;
  let unsubscribe: (() => void) | null = null;
  let session = $state<FixtureSession | null>(null);
  let logoutReason = $state<LogoutReason | null>(null);
  let appliedLoginCount = $state(0);
  let appliedLogoutCount = $state(0);
  let hardTimeoutMs = 3_000;
  let idleTimeoutMs = 2_000;

  const readStoredSession = (): FixtureSession | null => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as FixtureSession;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  };

  const persistSession = (nextSession: FixtureSession | null): void => {
    if (nextSession) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      return;
    }
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const logout = (reason: LogoutReason, shouldBroadcast = true): void => {
    const sessionId = guard.currentSessionId;
    if (!sessionId) return;

    lifecycle.exit();
    guard.clear();
    session = null;
    logoutReason = reason;
    appliedLogoutCount += 1;
    persistSession(null);

    if (shouldBroadcast) {
      channel?.post({
        type: AUTH_BROADCAST_MESSAGE_LOGOUT,
        sessionId,
        reason,
      });
    }
  };

  const startSession = (nextSession: FixtureSession): void => {
    session = nextSession;
    logoutReason = null;
    guard.activate(nextSession);
    persistSession(nextSession);
    lifecycle.renew({
      hardExpiresAtMs: nextSession.hardExpiresAtMs,
      idleExpiresAtMs: nextSession.idleExpiresAtMs,
      idleTimeoutMs,
      onHardExpiry: () => logout("hard-expiry"),
      onIdleExpiry: () => logout("idle-expiry"),
      onActivity: (idleExpiresAtMs) => {
        if (!guard.isCurrent(nextSession.sessionId)) return;

        const refreshedSession = { ...nextSession, idleExpiresAtMs };
        session = refreshedSession;
        persistSession(refreshedSession);
        channel?.post({
          type: AUTH_BROADCAST_MESSAGE_ACTIVITY,
          sessionId: nextSession.sessionId,
          idleExpiresAtMs,
        });
      },
    });
  };

  const login = (): void => {
    const now = Date.now();
    const nextSession: FixtureSession = {
      sessionId: globalThis.crypto.randomUUID(),
      walletId: WALLET_ID,
      hardExpiresAtMs: now + hardTimeoutMs,
      idleExpiresAtMs: now + idleTimeoutMs,
    };
    startSession(nextSession);
    appliedLoginCount += 1;
    channel?.post({
      type: AUTH_BROADCAST_MESSAGE_LOGIN,
      ...nextSession,
    });
  };

  const handleMessage = (message: AuthBroadcastMessage): void => {
    if (typeof message === "string") return;

    switch (message.type) {
      case AUTH_BROADCAST_MESSAGE_LOGIN: {
        if (!guard.shouldAcceptLogin(message)) return;
        startSession(message);
        appliedLoginCount += 1;
        return;
      }
      case AUTH_BROADCAST_MESSAGE_LOGOUT:
        if (!guard.isCurrent(message.sessionId)) return;
        logout(message.reason, false);
        return;
      case AUTH_BROADCAST_MESSAGE_ACTIVITY:
        if (
          !guard.isCurrent(message.sessionId) ||
          !session ||
          message.idleExpiresAtMs <= session.idleExpiresAtMs
        ) {
          return;
        }
        session = { ...session, idleExpiresAtMs: message.idleExpiresAtMs };
        persistSession(session);
        lifecycle.syncActivity(message.idleExpiresAtMs);
        return;
    }
  };

  const sendDuplicateLogin = (): void => {
    if (!session) return;
    channel?.post({ type: AUTH_BROADCAST_MESSAGE_LOGIN, ...session });
  };

  const sendStaleLogin = (): void => {
    if (!session) return;
    channel?.post({
      type: AUTH_BROADCAST_MESSAGE_LOGIN,
      ...session,
      sessionId: globalThis.crypto.randomUUID(),
      hardExpiresAtMs: session.hardExpiresAtMs - 1,
    });
  };

  const sendStaleLogout = (): void => {
    channel?.post({
      type: AUTH_BROADCAST_MESSAGE_LOGOUT,
      sessionId: "stale-session",
      reason: "manual",
    });
  };

  onMount(() => {
    const search = new URLSearchParams(window.location.search);
    hardTimeoutMs = Number(search.get("hardMs")) || hardTimeoutMs;
    idleTimeoutMs = Number(search.get("idleMs")) || idleTimeoutMs;
    channel = new TypedBroadcastChannel<AuthBroadcastMessage>(CHANNEL_NAME);
    unsubscribe = channel.onMessage(handleMessage);

    const storedSession = readStoredSession();
    if (
      storedSession &&
      storedSession.hardExpiresAtMs > Date.now() &&
      storedSession.idleExpiresAtMs > Date.now()
    ) {
      startSession(storedSession);
      appliedLoginCount += 1;
    } else {
      persistSession(null);
    }
  });

  onDestroy(() => {
    unsubscribe?.();
    channel?.close();
    lifecycle.exit();
  });
</script>

<main>
  <p data-testid="status">{session ? "authenticated" : "logged-out"}</p>
  <p data-testid="session-id">{session?.sessionId ?? "none"}</p>
  <p data-testid="hard-expiry">{session?.hardExpiresAtMs ?? 0}</p>
  <p data-testid="idle-expiry">{session?.idleExpiresAtMs ?? 0}</p>
  <p data-testid="logout-reason">{logoutReason ?? "none"}</p>
  <p data-testid="login-count">{appliedLoginCount}</p>
  <p data-testid="logout-count">{appliedLogoutCount}</p>

  <button data-testid="login" onclick={login}>Login</button>
  <button data-testid="renew" onclick={login}>Renew</button>
  <button data-testid="logout" onclick={() => logout("manual")}>Logout</button>
  <button data-testid="activity" onmousemove={() => undefined}>Activity</button>
  <button data-testid="duplicate-login" onclick={sendDuplicateLogin}>
    Duplicate login
  </button>
  <button data-testid="stale-login" onclick={sendStaleLogin}>Stale login</button
  >
  <button data-testid="stale-logout" onclick={sendStaleLogout}>
    Stale logout
  </button>
</main>
