import { browser } from "$app/environment";
import { PUBLIC_AMPLITUDE_API_KEY } from "$env/static/public";
import * as amplitude from "@amplitude/analytics-browser";
import { AnalyticsEvent } from "$modules/analytics/analyticsEvents";
import { authState } from "$modules/auth/state/auth.svelte";

// Track initialization state to avoid double init on HMR / re-mounts
let isInitialized = false;

/**
 * Initialize Amplitude Browser SDK 2.
 * Safe to call multiple times; subsequent calls are ignored.
 */
export function initAmplitude(): void {
  if (!browser) return;
  if (isInitialized) return;
  if (!PUBLIC_AMPLITUDE_API_KEY) {
    if (import.meta.env.DEV) {
      console.warn("[Amplitude] PUBLIC_AMPLITUDE_API_KEY is not set");
    }
    return;
  }

  amplitude.init(PUBLIC_AMPLITUDE_API_KEY, {
    serverZone: "US",
    logLevel: import.meta.env.DEV
      ? amplitude.Types.LogLevel.Warn
      : amplitude.Types.LogLevel.Warn,
    autocapture: false,
  });

  // If user is already logged in, attach user id immediately
  const owner = authState.account?.owner;
  if (owner) {
    amplitude.setUserId(owner);
  }

  isInitialized = true;
}

/**
 * Sync Amplitude userId with current authState.
 * Safe to call after login/logout.
 */
export function refreshAmplitudeUserIdFromAuth(): void {
  if (!browser) return;

  if (!isInitialized) {
    initAmplitude();
    if (!isInitialized) {
      return;
    }
  }

  const owner = authState.account?.owner;
  amplitude.setUserId(owner ?? undefined);
}

/**
 * Track Amplitude event.
 * @param event – event from enum
 * @param props – arbitrary event properties
 */
export function trackEvent(
  event: AnalyticsEvent,
  props?: Record<string, unknown>,
): void {
  if (!browser) return;

  if (!isInitialized) {
    initAmplitude();
  }

  try {
    amplitude.track(event, props);
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("[Amplitude] Failed to track event", event, e);
    }
  }
}

export { AnalyticsEvent };
