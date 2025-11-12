<script lang="ts">
  import type { Snippet } from "svelte";
  import type { LinkOrEmail } from "$modules/shared/constants/links";

  type Props = {
    link: LinkOrEmail;
    target?: string;
    rel?: string;
    class?: string;
    children?: Snippet;
  };

  let {
    link,
    target = "_blank",
    rel = "noopener noreferrer",
    class:
      className = "text-xs text-muted-foreground hover:text-primary transition-colors",
    children,
  }: Props = $props();

  // Get href from link (url or mailto:email)
  const href = $derived(
    link.url || (link.email ? `mailto:${link.email}` : undefined),
  );
</script>

{#if href}
  <a href={href} {target} {rel} class={className}>
    {#if children}
      {@render children()}
    {/if}
    {link.label}
  </a>
{/if}
