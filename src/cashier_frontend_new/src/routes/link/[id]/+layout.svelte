<script lang="ts">
  let { children } = $props();
</script>

<div class="w-full mx-auto">
  {@render children?.()}
</div>
