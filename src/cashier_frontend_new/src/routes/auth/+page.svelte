<script lang="ts">
  import { onMount } from "svelte";

  let status = $state<"loading" | "success" | "error">("loading");
  let errorMessage = $state("");

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errorParam = params.get("error");

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

    // Send the code to the parent window so the GateSDK can forward it to gate_frontend.
    if (window.opener) {
      window.opener.postMessage({ type: "x_auth_code", code }, "*");
    }
    status = "success";
    window.close();
  });

  function notifyParentError(msg: string) {
    if (window.opener) {
      window.opener.postMessage({ type: "x_auth_error", error: msg }, "*");
    }
    setTimeout(() => window.close(), 3000);
  }
</script>

<div class="flex h-screen items-center justify-center bg-background p-4">
  {#if status === "loading"}
    <div class="flex flex-col items-center gap-3 text-center">
      <div
        class="h-8 w-8 animate-spin rounded-full border-4 border-green border-t-transparent"
      ></div>
      <p class="text-sm text-foreground">Connecting your X account…</p>
    </div>
  {:else if status === "success"}
    <p class="text-sm text-green">Connected successfully. Closing…</p>
  {:else}
    <div class="flex flex-col items-center gap-3 text-center">
      <p class="text-sm text-[#D26060]">Connection failed</p>
      <p class="text-xs text-muted-foreground">{errorMessage}</p>
    </div>
  {/if}
</div>
