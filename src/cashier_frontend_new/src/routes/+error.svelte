<script lang="ts">
  import { page } from "$app/state";
  import { resolve } from "$app/paths";
  const status = page.status;
  const msg = page.error?.message;
</script>

<svelte:head>
  <title>{status} — {msg ?? "Error"}</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center">
  <div class="text-center">
    {#if status === 404}
      <h1 class="text-4xl font-bold">404 — Not found</h1>
      <p class="mt-4">The page you're looking for doesn't exist.</p>
    {:else}
      <h1 class="text-2xl font-bold">{status ?? "Error"}</h1>
      <p class="mt-2">{msg ?? "An unexpected error occurred."}</p>
    {/if}
    <p class="mt-4"><a class="link" href={resolve("/")}>Go home</a></p>
  </div>
</div>
