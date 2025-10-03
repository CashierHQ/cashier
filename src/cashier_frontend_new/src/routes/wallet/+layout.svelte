<script lang="ts">
  import Protected from "$modules/shared/components/Protected.svelte";
  let { children } = $props();
</script>

<Protected>
  {@render children?.()}
</Protected>
