import type { SessionLifecycleTimestamps } from "$modules/auth/types";

/** Tracks the locally active session to reject duplicate and stale messages. */
export class AuthSessionMessageGuard {
  private sessionId: string | null = null;
  private hardExpiresAtMs: number | null = null;

  /** Active session identifier for outgoing synchronization messages. */
  public get currentSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Marks a session as the active session in this tab.
   *
   * @param session - Session identifier and absolute expiry timestamps.
   * @returns Nothing.
   */
  public activate(session: SessionLifecycleTimestamps): void {
    this.sessionId = session.sessionId;
    this.hardExpiresAtMs = session.hardExpiresAtMs;
  }

  /**
   * Clears the locally active session reference while retaining the newest
   * observed hard-expiry watermark. The watermark prevents a delayed login
   * message from restoring a session after logout.
   *
   * @returns Nothing.
   */
  public clear(): void {
    this.sessionId = null;
  }

  /**
   * Determines whether an incoming login represents a newer valid session.
   *
   * @param session - Incoming session identifier and expiry timestamps.
   * @param nowMs - Current timestamp in milliseconds since the Unix epoch.
   * @returns `true` when the message is unexpired and newer than the locally
   * active session; otherwise `false`.
   */
  public shouldAcceptLogin(
    session: SessionLifecycleTimestamps,
    nowMs = Date.now(),
  ): boolean {
    if (
      session.hardExpiresAtMs <= nowMs ||
      session.idleExpiresAtMs <= nowMs ||
      session.sessionId === this.sessionId
    ) {
      return false;
    }

    return (
      this.hardExpiresAtMs === null ||
      session.hardExpiresAtMs > this.hardExpiresAtMs
    );
  }

  /**
   * Checks whether a message belongs to the locally active session.
   *
   * @param sessionId - Session identifier carried by the incoming message.
   * @returns `true` only when the message targets the active session.
   */
  public isCurrent(sessionId: string): boolean {
    return sessionId === this.sessionId;
  }
}
