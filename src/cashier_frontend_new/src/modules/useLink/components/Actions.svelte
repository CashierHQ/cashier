<script lang="ts">
  import PrimaryActionButton from "$modules/shared/components/PrimaryActionButton.svelte";
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
    <PrimaryActionButton onclick={onCreateUseAction} {disabled} type="button">
      <span class="relative inline-flex items-center">
        {#if disabled}
          <span
            class="absolute right-full mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"
            aria-hidden="true"
          ></span>
        {/if}
        {locale.t("links.linkForm.useLink.claimButton")}
      </span>
    </PrimaryActionButton>
  </div>
{/if}
