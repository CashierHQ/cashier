<script lang="ts">
  import { onMount } from "svelte";
  import { exchangeXToken } from "$lib/gate-service";

  let status = $state<"loading" | "success" | "error">("loading");
  let errorMessage = $state("");

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    const code = params.get("code");

    if (errorParam) {
      const msg = params.get("error_description") ?? errorParam;
      status = "error";
      errorMessage = msg;
      notifyParentError(msg);
      return;
    }

    if (!code) {
      const msg = "No authorization code in callback URL";
      status = "error";
      errorMessage = msg;
      notifyParentError(msg);
      return;
    }

    try {
      const result = await exchangeXToken(code);
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "gate_x_auth_complete",
            profile: result.profile,
            accessToken: result.access_token,
          },
          "*",
        );
      }
      status = "success";
      window.close();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to exchange X token";
      status = "error";
      errorMessage = msg;
      notifyParentError(msg);
    }
  });

  function notifyParentError(msg: string) {
    if (window.opener) {
      window.opener.postMessage({ type: "gate_x_auth_error", error: msg }, "*");
    }
    setTimeout(() => window.close(), 3000);
  }
</script>

<svelte:head>
  <title>Gate Service – Connecting…</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-4">
  {#if status === "loading"}
    <div class="flex flex-col items-center gap-3 text-center">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
        style="border-color: var(--green); border-top-color: transparent"
      ></div>
      <p class="text-sm" style="color: var(--foreground)">
        Connecting your X account…
      </p>
    </div>
  {:else if status === "success"}
    <p class="text-sm" style="color: var(--green)">
      Connected successfully. Closing…
    </p>
  {:else}
    <div class="flex flex-col items-center gap-3 text-center">
      <p class="text-sm font-medium" style="color: var(--error)">
        Connection failed
      </p>
      <p class="text-xs" style="color: var(--muted-foreground)">
        {errorMessage}
      </p>
    </div>
  {/if}
</div>
