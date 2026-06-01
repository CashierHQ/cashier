<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
</script>

<div
  class="mx-auto flex min-h-[28rem] w-full max-w-xl flex-col items-center justify-center gap-6 px-6 py-12 text-center"
>
  <div class="space-y-3">
    <h2 class="text-2xl font-semibold">This link has ended</h2>
    <p class="mx-auto max-w-sm text-sm text-muted-foreground">
      This link is no longer available, so it cannot be claimed or used.
    </p>
  </div>

  <Button href="/" class="w-full max-w-xs rounded-full">Go Back</Button>
</div>
