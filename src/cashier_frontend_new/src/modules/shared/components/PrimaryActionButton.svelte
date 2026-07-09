<script lang="ts">
  import Button, {
    type ButtonProps,
  } from "$lib/shadcn/components/ui/button/button.svelte";
  import { cn } from "$lib/shadcn/components/utils.js";
  import type { Snippet } from "svelte";

  type Props = ButtonProps & {
    /**
     * Button label and optional inline content rendered in the center of the
     * action button.
     */
    children?: Snippet;
    /**
     * Shows a spinner, disables the button, and sets `aria-busy`.
     *
     * The spinner is positioned outside the centered label so the label does
     * not shift when loading starts.
     */
    loading?: boolean;
    /**
     * Optional text to render while `loading` is true.
     *
     * When omitted, the button keeps rendering `children` during loading.
     */
    loadingLabel?: string;
    /**
     * Visual intent for Cashier primary actions.
     *
     * `primary` renders the standard green CTA. `destructive` renders the red
     * outline action style used for reversible destructive actions such as
     * disconnecting or ending a link.
     */
    tone?: "primary" | "destructive";
  };

  let {
    class: className,
    children,
    disabled,
    loading = false,
    loadingLabel,
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
  disabled={disabled || loading}
  aria-busy={loading}
  variant={resolvedVariant}
  class={cn(
    "h-11 w-full rounded-full px-4 text-sm font-semibold shadow transition-colors disabled:cursor-not-allowed",
    variantClass,
    className,
  )}
>
  <span class="relative inline-flex items-center justify-center">
    {#if loading}
      <span
        class="absolute right-full mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
        aria-hidden="true"
      ></span>
    {/if}

    {#if loading && loadingLabel}
      {loadingLabel}
    {:else}
      {@render children?.()}
    {/if}
  </span>
</Button>
