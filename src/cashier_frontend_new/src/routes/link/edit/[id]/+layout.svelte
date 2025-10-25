<!-- This layout is a workaround for https://github.com/sveltejs/kit/issues/4941 -->
<script lang="ts">
    import Protected from "$modules/shared/components/Protected.svelte";
  let { children } = $props();
</script>

<Protected>
  <div class="w-full lg:w-1/3 mx-auto mt-4">
    {@render children?.()}
  </div>
</Protected>
