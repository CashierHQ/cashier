<script lang="ts">
  import { locale } from "$lib/i18n";
  import { Button } from "$lib/shadcn/components/ui/button";
  import type { Link } from "$modules/links/types/link/link";
  import TokenBasketDisplay from "$modules/useLink/components/tokenbasket/TokenBasketDisplay.svelte";

  const { link }: { link?: Link } = $props();

  // Get all assets from asset_info
  const assets = $derived(link?.asset_info ?? []);
</script>

{#if assets && assets.length > 0}
  <TokenBasketDisplay {assets} />
{/if}

<div class="mt-4 flex gap-2 w-[95%] mx-auto">
  <Button
    variant="default"
    class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:!bg-white disabled:!text-[#36A18B] h-[44px] px-4 w-full"
    disabled={true}
  >
    {locale.t("links.linkForm.useLink.completed.claimedButton")}
  </Button>
</div>
