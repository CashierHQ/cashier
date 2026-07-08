<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";

	let {
		shouldScaleBackground = true,
		repositionInputs = false,
		open = $bindable(false),
		activeSnapPoint = $bindable(null),
		...restProps
	}: DrawerPrimitive.RootProps = $props();
</script>

<DrawerPrimitive.Root
	{shouldScaleBackground}
	{repositionInputs}
	bind:open
	bind:activeSnapPoint
	{...restProps}
/>
