import {
  ACTIVITY_NOTIFICATION_THROTTLE_MS,
  IDLE_ACTIVITY_EVENTS,
} from "$modules/auth/constants";
import type {
  ActivityCallback,
  IdleCallback,
  IdleSessionManagerOptions,
} from "$modules/auth/types";

/**
 * Tracks inactivity in one tab while accepting newer activity timestamps from
 * other tabs. Local activity notifications are throttled to avoid flooding the
 * cross-tab channel during mouse movement.
 */
export class IdleSessionManager {
  private readonly idleTimeoutMs: number;
  private readonly onIdle: IdleCallback;
  private readonly onActivity?: ActivityCallback;
  private readonly handleActivity: () => void;
  private idleExpiresAtMs: number;
  private timeoutID?: number;
  private activityNotificationTimeoutID?: number;
  private pendingActivityExpiresAtMs?: number;
  private lastActivityNotificationAtMs = 0;
  private exited = false;

  /**
   * Creates an inactivity manager and starts listening for local activity.
   *
   * @param options - Idle timeout, initial absolute expiry, and lifecycle
   * callbacks for the authenticated session.
   */
  constructor(options: IdleSessionManagerOptions) {
    this.idleTimeoutMs = options.idleTimeoutMs;
    this.idleExpiresAtMs = options.initialExpiresAtMs;
    this.onIdle = options.onIdle;
    this.onActivity = options.onActivity;
    this.handleActivity = () => this.recordActivity();

    IDLE_ACTIVITY_EVENTS.forEach((eventName) => {
      document.addEventListener(eventName, this.handleActivity, true);
    });
    window.addEventListener("scroll", this.handleActivity, true);

    this.scheduleIdleTimeout();
  }

  /**
   * Records activity originating in this tab and refreshes its idle deadline.
   *
   * @param activityAtMs - Activity timestamp in milliseconds since the Unix
   * epoch. Defaults to the current time.
   * @returns Nothing.
   */
  public recordActivity(activityAtMs = Date.now()): void {
    if (this.exited) return;

    const idleExpiresAtMs = activityAtMs + this.idleTimeoutMs;
    if (idleExpiresAtMs <= this.idleExpiresAtMs) return;

    this.idleExpiresAtMs = idleExpiresAtMs;
    this.scheduleIdleTimeout();
    this.notifyActivity(idleExpiresAtMs);
  }

  /**
   * Applies a newer idle deadline received from another Cashier tab.
   *
   * @param idleExpiresAtMs - Absolute inactivity-expiry timestamp in
   * milliseconds since the Unix epoch.
   * @returns Nothing. Stale deadlines and updates after exit are ignored.
   */
  public syncExpiresAt(idleExpiresAtMs: number): void {
    if (this.exited || idleExpiresAtMs <= this.idleExpiresAtMs) return;

    this.idleExpiresAtMs = idleExpiresAtMs;
    this.scheduleIdleTimeout();
  }

  /**
   * Stops the idle timer and removes every activity listener.
   *
   * @returns Nothing. Repeated calls are safe.
   */
  public exit(): void {
    if (this.exited) return;

    this.exited = true;
    window.clearTimeout(this.timeoutID);
    window.clearTimeout(this.activityNotificationTimeoutID);
    this.timeoutID = undefined;
    this.activityNotificationTimeoutID = undefined;

    IDLE_ACTIVITY_EVENTS.forEach((eventName) => {
      document.removeEventListener(eventName, this.handleActivity, true);
    });
    window.removeEventListener("scroll", this.handleActivity, true);
  }

  /**
   * Replaces the current idle timer using the latest absolute deadline.
   *
   * @returns Nothing.
   */
  private scheduleIdleTimeout(): void {
    window.clearTimeout(this.timeoutID);
    this.timeoutID = window.setTimeout(
      () => {
        if (Date.now() < this.idleExpiresAtMs) {
          this.scheduleIdleTimeout();
          return;
        }

        this.onIdle();
      },
      Math.max(0, this.idleExpiresAtMs - Date.now()),
    );
  }

  /**
   * Schedules a throttled cross-tab notification for local activity.
   *
   * @param idleExpiresAtMs - Refreshed absolute inactivity-expiry timestamp in
   * milliseconds since the Unix epoch.
   * @returns Nothing.
   */
  private notifyActivity(idleExpiresAtMs: number): void {
    if (!this.onActivity) return;

    this.pendingActivityExpiresAtMs = idleExpiresAtMs;
    const elapsedMs = Date.now() - this.lastActivityNotificationAtMs;

    if (elapsedMs >= ACTIVITY_NOTIFICATION_THROTTLE_MS) {
      this.flushActivityNotification();
      return;
    }

    if (this.activityNotificationTimeoutID !== undefined) return;

    this.activityNotificationTimeoutID = window.setTimeout(() => {
      this.activityNotificationTimeoutID = undefined;
      this.flushActivityNotification();
    }, ACTIVITY_NOTIFICATION_THROTTLE_MS - elapsedMs);
  }

  /**
   * Emits the newest pending activity deadline to the session coordinator.
   *
   * @returns Nothing. No callback is emitted after exit or without a pending
   * activity deadline.
   */
  private flushActivityNotification(): void {
    if (
      this.exited ||
      !this.onActivity ||
      this.pendingActivityExpiresAtMs === undefined
    ) {
      return;
    }

    const idleExpiresAtMs = this.pendingActivityExpiresAtMs;
    this.pendingActivityExpiresAtMs = undefined;
    this.lastActivityNotificationAtMs = Date.now();
    this.onActivity(idleExpiresAtMs);
  }
}
