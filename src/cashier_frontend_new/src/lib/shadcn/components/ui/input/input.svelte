<script lang="ts">
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/shadcn/components/utils.js";

	type InputType = Exclude<HTMLInputTypeAttribute, "file">;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, "type"> &
			({ type: "file"; files?: FileList } | { type?: InputType; files?: undefined })
	>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		...restProps
	}: Props = $props();
</script>

{#if type === "file"}
	<input
		bind:this={ref}
		data-slot="input"
		class={cn(
			"selection:bg-primary dark:bg-input/30 selection:text-primary-foreground border-input ring-offset-background placeholder:text-muted-foreground shadow-xs flex w-full min-w-0 rounded-lg border bg-transparent px-3 py-2 text-base font-normal leading-6 tracking-normal !outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50",
			"focus:!outline-none focus-visible:border-green focus-visible:!ring-0",
			"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
			className
		)}
		type="file"
		bind:files
		bind:value
		{...restProps}
	/>
{:else}
	<input
		bind:this={ref}
		data-slot="input"
		class={cn(
			"border-input bg-background selection:bg-primary dark:bg-input/30 selection:text-primary-foreground ring-offset-background placeholder:text-muted-foreground shadow-xs flex w-full min-w-0 rounded-lg border px-3 py-2 text-base font-normal leading-6 tracking-normal !outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50",
			"focus:!outline-none focus-visible:border-green focus-visible:!ring-0",
			"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
			className
		)}
		{type}
		bind:value
		{...restProps}
	/>
{/if}
