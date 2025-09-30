<script lang="ts">
  export let error: Error;
  export let status: number;
</script>

<svelte:head>
  <title>{status} — {error?.message ?? 'Error'}</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center">
  {#if status === 404}
    <div class="text-center">
      <h1 class="text-4xl font-bold">404 — Not found</h1>
      <p class="mt-4">The page you're looking for doesn't exist.</p>
      <p class="mt-4"><a class="link" href="/">Go home</a></p>
    </div>
  {:else}
    <div>
      <h1 class="text-2xl font-bold">{status ?? 'Error'}</h1>
      <p class="mt-2">{error?.message ?? 'An unexpected error occurred.'}</p>
      <p class="mt-4"><a class="link" href="/">Go home</a></p>
    </div>
  {/if}
</div>
