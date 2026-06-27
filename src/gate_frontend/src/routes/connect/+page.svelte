<script lang="ts">
  import { onMount } from "svelte";
  import { X_CLIENT_ID } from "$lib/constants";
  import { buildXAuthUrl } from "$lib/x-oauth";

  onMount(() => {
    const redirectUri = `${window.location.origin}/auth`;
    const authUrl = buildXAuthUrl({
      clientId: X_CLIENT_ID,
      redirectUri,
      state: crypto.randomUUID(),
    });
    window.location.href = authUrl;
  });
</script>

<svelte:head>
  <title>Gate Service – Connecting…</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center">
  <p class="text-sm" style="color: var(--muted-foreground)">
    Redirecting to X…
  </p>
</div>
