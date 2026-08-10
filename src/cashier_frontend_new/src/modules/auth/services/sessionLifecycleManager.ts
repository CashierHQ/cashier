import { IdleSessionManager } from "$modules/auth/services/idleSessionManager";
import { SessionManager } from "$modules/auth/services/sessionManager";
import type { SessionLifecycleOptions } from "$modules/auth/types";

/** Owns the hard- and idle-expiry timers for a single authenticated session. */
export class SessionLifecycleManager {
  private hardExpiryManager: SessionManager | null = null;
  private idleSessionManager: IdleSessionManager | null = null;

  /**
   * Replaces the current lifecycle, disposing every timer and listener first.
   *
   * @param options - Absolute hard and idle deadlines, idle duration, and
   * lifecycle callbacks for the renewed session.
   * @returns Nothing.
   */
  public renew(options: SessionLifecycleOptions): void {
    this.exit();

    this.hardExpiryManager = new SessionManager({
      timeout: Math.max(0, options.hardExpiresAtMs - Date.now()),
      onTimeout: options.onHardExpiry,
    });
    this.idleSessionManager = new IdleSessionManager({
      idleTimeoutMs: options.idleTimeoutMs,
      initialExpiresAtMs: options.idleExpiresAtMs,
      onIdle: options.onIdleExpiry,
      onActivity: options.onActivity,
    });
  }

  /**
   * Extends the idle deadline using activity received from another tab.
   *
   * @param idleExpiresAtMs - Absolute inactivity-expiry timestamp in
   * milliseconds since the Unix epoch.
   * @returns Nothing.
   */
  public syncActivity(idleExpiresAtMs: number): void {
    this.idleSessionManager?.syncExpiresAt(idleExpiresAtMs);
  }

  /**
   * Disposes the current hard- and idle-expiry managers.
   *
   * @returns Nothing. Repeated calls are safe.
   */
  public exit(): void {
    this.hardExpiryManager?.exit();
    this.idleSessionManager?.exit();
    this.hardExpiryManager = null;
    this.idleSessionManager = null;
  }
}
