<script lang="ts">
  let { children } = $props();
</script>

<div class="w-full mx-auto mt-4">
  {@render children?.()}
</div>
