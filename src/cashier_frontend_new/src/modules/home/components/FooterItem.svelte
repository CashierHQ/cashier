<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    href?: string;
    label: string;
    target?: string;
    rel?: string;
    class?: string;
    children?: Snippet;
  };

  let {
    href,
    label,
    target = "_blank",
    rel = "noopener noreferrer",
    class:
      className = "text-xs text-muted-foreground hover:text-primary transition-colors",
    children,
  }: Props = $props();
</script>

{#if href}
  <a {href} {target} {rel} class={className}>
    {#if children}
      {@render children()}
    {/if}
    {label}
  </a>
{/if}
