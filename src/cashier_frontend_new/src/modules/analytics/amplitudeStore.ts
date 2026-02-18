import { browser } from "$app/environment";
import { PUBLIC_AMPLITUDE_API_KEY } from "$env/static/public";
import * as amplitude from "@amplitude/analytics-browser";
import { AnalyticsEvent } from "$modules/analytics/analyticsEvents";

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
    // In dev we want to see misconfiguration; in prod it will just do nothing
    if (import.meta.env.DEV) {
      console.warn("[Amplitude] PUBLIC_AMPLITUDE_API_KEY is not set");
    }
    return;
  }

  amplitude.init(PUBLIC_AMPLITUDE_API_KEY, {
    // Use EU zone if project is created in EU (can be changed if needed) 
    serverZone: "EU",
    // More logs in dev, less in prod
    logLevel: import.meta.env.DEV
      ? amplitude.Types.LogLevel.Debug
      : amplitude.Types.LogLevel.Warn,
    // We control which events to send, autocapture is disabled
    autocapture: false,
  });

  isInitialized = true;
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
    // Lazy-init on first call, to avoid forgetting to call initAmplitude in all entrypoints
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


