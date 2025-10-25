<!-- This layout is a workaround for https://github.com/sveltejs/kit/issues/4941 -->
<script lang="ts">
  import Protected from "$modules/shared/components/Protected.svelte";
  let { children } = $props();
</script>

<Protected>
    {@render children?.()}
</Protected>
