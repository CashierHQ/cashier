<script lang="ts">
  import { page } from "$app/state";
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
  <h1 class="text-xl font-semibold" style="color: var(--error)">
    {page.status}
  </h1>
  <p class="text-sm" style="color: var(--muted-foreground)">
    {page.error?.message}
  </p>
</div>
