<script lang="ts">
  import Button, {
    type ButtonProps,
  } from "$lib/shadcn/components/ui/button/button.svelte";
  import { cn } from "$lib/shadcn/components/utils.js";
  import type { Snippet } from "svelte";

  type Props = ButtonProps & {
    children?: Snippet;
    tone?: "primary" | "destructive";
  };

  let {
    class: className,
    children,
    tone = "primary",
    variant = "default",
    ...restProps
  }: Props = $props();

  const resolvedVariant = $derived(
    tone === "destructive" ? "outline" : variant,
  );

  const variantClass = $derived(
    tone === "destructive"
      ? "border border-red-200 bg-transparent text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400 disabled:cursor-not-allowed"
      : variant === "destructive"
        ? "bg-[#D26060] text-white hover:bg-[#D26060]/90"
        : variant === "default"
          ? "bg-green text-primary-foreground hover:bg-green/90 disabled:!bg-disabledgreen disabled:!text-primary-foreground"
          : "",
  );
</script>

<Button
  {...restProps}
  variant={resolvedVariant}
  class={cn(
    "h-11 w-full rounded-full px-4 text-sm font-semibold shadow transition-colors",
    variantClass,
    className,
  )}
>
  {@render children?.()}
</Button>
