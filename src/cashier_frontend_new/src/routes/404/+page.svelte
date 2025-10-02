<script lang="ts">
  import { resolve } from "$app/paths";
</script>

<svelte:head>
  <title>404 - Not Found</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center">
  <div class="text-center">
    <h1 class="text-4xl font-bold">404 — Not found</h1>
    <p class="mt-4 text-lg">The page you're looking for doesn't exist.</p>
    <p class="mt-6"><a class="link" href={resolve("/")}>Go home</a></p>
  </div>
</div>
