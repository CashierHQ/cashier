<!-- This layout is a workaround for https://github.com/sveltejs/kit/issues/4941 -->
<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();
</script>

{#key page.url.pathname}
    {@render children?.()}
{/key}
