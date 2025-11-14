<!-- This layout is a workaround for https://github.com/sveltejs/kit/issues/4941 -->
<script lang="ts">
  let { children } = $props();
</script>

<div class="w-full mx-auto mt-4">
  {@render children?.()}
</div>
