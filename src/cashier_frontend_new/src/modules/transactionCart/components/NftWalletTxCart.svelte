<script lang="ts">
  import { locale } from "$lib/i18n";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import * as Drawer from "$lib/shadcn/components/ui/drawer";
  import FeeInfoDrawer from "$modules/creationLink/components/drawers/FeeInfoDrawer.svelte";
  import FeesBreakdownSection from "$modules/creationLink/components/previewSections/FeesBreakdownSection.svelte";
  import type { FeeBreakdownItem } from "$modules/links/utils/feesBreakdown";
  import { transformShortAddress } from "$modules/shared/utils/transformShortAddress";
  import { NFT_FALLBACK_IMAGE_URL } from "$modules/wallet/constants";
  import type { EnrichedNFT } from "$modules/wallet/types/nft";
  import { X } from "lucide-svelte";
  import { SvelteSet } from "svelte/reactivity";

  const MOCK_NFT_FEE_USD = 0.0502;
  const MOCK_NFT_FEE_BREAKDOWN: FeeBreakdownItem[] = [
    {
      name: "Network fee",
      amount: 2_008_000n,
      tokenAddress: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      tokenSymbol: "ICP",
      tokenDecimals: 8,
      usdAmount: MOCK_NFT_FEE_USD,
    },
  ];

  type Props = {
    nft: EnrichedNFT;
    collectionStandard?: string | null;
    sendAddress: string;
    isOpen: boolean;
    onCloseDrawer: () => void;
    onConfirm: () => void;
  };

  let {
    nft,
    collectionStandard = null,
    sendAddress,
    isOpen = $bindable(),
    onCloseDrawer,
    onConfirm,
  }: Props = $props();

  let failedImageLoads = new SvelteSet<string>();
  let showFeeInfoDrawer = $state(false);

  const shortenedSendAddress = $derived(
    transformShortAddress(sendAddress.trim()),
  );
  const standard = $derived(
    nft.standard ??
      collectionStandard ??
      locale.t("wallet.nfts.send.standardFallback"),
  );

  function getNftImageKey(nft: EnrichedNFT) {
    return `${nft.collectionId}:${nft.tokenId.toString()}`;
  }

  function getNftImage(nft: EnrichedNFT) {
    const imageKey = getNftImageKey(nft);

    if (failedImageLoads.has(imageKey)) {
      return NFT_FALLBACK_IMAGE_URL;
    }

    return nft.imageUrl || NFT_FALLBACK_IMAGE_URL;
  }

  function handleImageError(key: string) {
    failedImageLoads.add(key);
  }

  function handleOpenChange(open: boolean) {
    isOpen = open;

    if (!open && !showFeeInfoDrawer) {
      onCloseDrawer();
    }
  }

  function handleFeeBreakdownClick() {
    isOpen = false;
    showFeeInfoDrawer = true;
  }

  function handleFeeInfoDrawerBack(viaClose?: boolean) {
    showFeeInfoDrawer = false;

    if (!viaClose) {
      isOpen = true;
    }
  }
</script>

<Drawer.Root bind:open={isOpen} onOpenChange={handleOpenChange}>
  <Drawer.Content class="mx-auto w-[400px] max-w-full p-3">
    <Drawer.Header>
      <div class="relative mb-2 flex items-center justify-center px-3">
        <Drawer.Title
          class="w-full px-8 text-center text-[18px] font-semibold leading-[20px]"
        >
          {locale.t("wallet.nfts.send.confirmTitle")}
        </Drawer.Title>
        <Drawer.Close>
          <X
            size={28}
            stroke-width={1.5}
            class="absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer opacity-70 hover:opacity-100"
            aria-label={locale.t("wallet.drawer.close")}
            onclick={onCloseDrawer}
          />
        </Drawer.Close>
      </div>
    </Drawer.Header>

    <div class="h-auto px-4 pb-4">
      <p class="mb-3 text-sm font-medium text-gray-900">
        {locale.t("wallet.nfts.send.youSend")}
      </p>

      <div class="mb-5 flex items-center gap-4">
        <div
          class="bg-walletlightpurple flex grow items-center justify-center overflow-hidden rounded-lg"
        >
          <img
            src={getNftImage(nft)}
            alt={nft.name}
            class="h-full w-full aspect-square object-contain"
            onerror={() => handleImageError(getNftImageKey(nft))}
          />
        </div>
        <div class="grow">
          <p class="text-lg font-semibold text-gray-900">
            #{nft.tokenId.toString()}
          </p>
          <p class="text-lg font-semibold leading-tight text-gray-900">
            {nft.name}
          </p>
          <p class="mt-1 text-xs font-normal text-gray-700">
            {nft.collectionName}
          </p>
        </div>
      </div>

      <dl class="space-y-2 text-sm">
        <div class="flex justify-between gap-4">
          <dt class="text-gray-900 font-medium text-base">
            {locale.t("wallet.nfts.send.to")}
          </dt>
          <dd class="truncate text-gray-500">{shortenedSendAddress}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-gray-900 font-medium text-base">
            {locale.t("wallet.nfts.send.network")}
          </dt>
          <dd class="text-gray-500">ICP</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-gray-900 font-medium text-base">
            {locale.t("wallet.nfts.send.standard")}
          </dt>
          <dd class="text-gray-500">{standard}</dd>
        </div>
      </dl>

      <p class="my-5 text-sm font-normal leading-snug text-gray-700">
        {locale.t("wallet.nfts.send.terms")}
      </p>

      <div class="mb-6">
        <FeesBreakdownSection
          totalFeesUsd={MOCK_NFT_FEE_USD}
          onBreakdownClick={handleFeeBreakdownClick}
        />
      </div>
    </div>

    <div class="mb-2 px-3">
      <Button
        onclick={onConfirm}
        class="bg-walletpurple hover:bg-walletpurple/90 inline-flex h-[44px] w-full cursor-pointer items-center justify-center rounded-full px-4 font-medium text-primary-foreground shadow"
        type="button"
      >
        {locale.t("wallet.nfts.send.confirmButton")}
      </Button>
    </div>
  </Drawer.Content>
</Drawer.Root>

<FeeInfoDrawer
  bind:open={showFeeInfoDrawer}
  feesBreakdown={MOCK_NFT_FEE_BREAKDOWN}
  onBack={handleFeeInfoDrawerBack}
/>
