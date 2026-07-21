<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { IDLE_TIMEOUT_MILLIS_SECOND } from "$modules/auth/constants";
  import { authState } from "$modules/auth/state/auth.svelte";

  const idleEvents = [
    "mousedown",
    "mousemove",
    "keydown",
    "touchstart",
    "wheel",
  ];

  let now = $state(Date.now());
  let idleExpiresAt = $state(Date.now() + IDLE_TIMEOUT_MILLIS_SECOND);
  let intervalId: number | undefined;

  const resetIdleTimer = () => {
    now = Date.now();
    idleExpiresAt = now + IDLE_TIMEOUT_MILLIS_SECOND;
  };

  const formatRemaining = (expiresAt: number | null | undefined) => {
    if (!expiresAt) return "--:--";

    const remainingSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  onMount(() => {
    intervalId = window.setInterval(() => {
      now = Date.now();
    }, 1000);

    window.addEventListener("load", resetIdleTimer, true);
    idleEvents.forEach((eventName) => {
      document.addEventListener(eventName, resetIdleTimer, true);
    });
  });

  onDestroy(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (intervalId) {
      window.clearInterval(intervalId);
    }
    window.removeEventListener("load", resetIdleTimer, true);
    idleEvents.forEach((eventName) => {
      document.removeEventListener(eventName, resetIdleTimer, true);
    });
  });
</script>

<div class="debug-session-timers" aria-live="polite">
  <div>I: {formatRemaining(idleExpiresAt)}</div>
  <div>H: {formatRemaining(authState.sessionExpiresAtMs)}</div>
</div>

<style>
  .debug-session-timers {
    position: fixed;
    top: 4px;
    left: 4px;
    z-index: 2147483647;
    padding: 3px 5px;
    border-radius: 3px;
    background: rgb(0 0 0 / 72%);
    color: #fff;
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
      "Courier New", monospace;
    font-size: 9px;
    line-height: 1.25;
    pointer-events: none;
  }
</style>
