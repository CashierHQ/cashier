<!-- This component is a workaround for https://github.com/sveltejs/kit/issues/4941 -->
<!-- It will re-render its children when the current path changes. -->
<!-- To be used in pages that contain dynamic slugs in the URL -->
<script lang="ts">
  import { page } from "$app/state";
  let { children } = $props();
</script>

{#key page.url.pathname}
  {@render children?.()}
{/key}
