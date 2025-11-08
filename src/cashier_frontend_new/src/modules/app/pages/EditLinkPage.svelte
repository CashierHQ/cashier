<script lang="ts">
  type Props = {
    linkId: string;
  };

  let { linkId }: Props = $props();
</script>

<div class="w-full">
  <h1 class="text-2xl font-bold mb-4">Edit Link Page</h1>
  <p class="text-sm text-muted-foreground">Link ID: {linkId}</p>
</div>
