<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { locale } from "$lib/i18n";
  import type { Link } from "$modules/links/types/link/link";
  import { LinkState } from "$modules/links/types/link/linkState";
  interface Props {
    link: Link;
    onCreateUseAction?: () => Promise<void>;
    disabled?: boolean;
  }

  let { link, onCreateUseAction, disabled = false }: Props = $props();
</script>

{#if link?.state === LinkState.ACTIVE}
  <div
    class="flex-none w-[95%] mx-auto px-2 sticky bottom-2 left-0 right-0 z-10 mt-auto"
  >
    <Button
      onclick={onCreateUseAction}
      {disabled}
      class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
      type="button"
    >
      <span class="relative inline-flex items-center">
        {#if disabled}
          <span
            class="absolute right-full mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"
            aria-hidden="true"
          ></span>
        {/if}
        {locale.t("links.linkForm.useLink.claimButton")}
      </span>
    </Button>
  </div>
{/if}
