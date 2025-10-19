<!-- This layout is a workaround for https://github.com/sveltejs/kit/issues/4941 -->
<script lang="ts">
  import OnPathChange from "$modules/shared/components/OnPathChange.svelte";
  let { children } = $props();
</script>

<OnPathChange>
  <div class="w-full lg:w-1/3 mx-auto mt-4">
    {@render children?.()}
  </div>
</OnPathChange>
