<script lang="ts">
  import type { Snippet } from "svelte";
  import type { LinkOrEmail } from "$modules/shared/constants/links";

  type Props = {
    link: LinkOrEmail;
    target?: string;
    rel?: string;
    children?: Snippet;
  };

  let { link, target = "_blank", rel = "noopener noreferrer", children }: Props = $props();
</script>

{#if link.url}
  <a
    href={link.url}
    {target}
    {rel}
    class="w-full font-semibold block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors group hover:text-green hover:cursor-pointer hover:bg-lightgreen focus:bg-accent focus:text-accent-foreground"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <span class="w-8 text-grey group-hover:text-green">
          {#if children}
            {@render children()}
          {/if}
        </span>
        <span
          class="text-[16px] font-semibold text-[#222] group-hover:text-green"
        >
          {link.label}
        </span>
      </div>
    </div>
  </a>
{/if}

