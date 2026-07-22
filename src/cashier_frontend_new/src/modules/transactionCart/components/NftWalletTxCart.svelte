<script lang="ts">
  import { locale } from "$lib/i18n";
  import * as Drawer from "$lib/shadcn/components/ui/drawer";
  import PrimaryActionButton from "$modules/shared/components/PrimaryActionButton.svelte";
  import { transformShortAddress } from "$modules/shared/utils/transformShortAddress";
  import { NftTxCartStore } from "$modules/transactionCart/state/nftTxCartStore.svelte";
  import type { NftSource } from "$modules/transactionCart/types/transactionSource";
  import { NFT_FALLBACK_IMAGE_URL } from "$modules/wallet/constants";
  import type { EnrichedNFT } from "$modules/wallet/types/nft";
  import { X } from "lucide-svelte";
  import { onMount } from "svelte";
  import { SvelteSet } from "svelte/reactivity";

  type Props = {
    source: NftSource;
    isOpen: boolean;
    onCloseDrawer: () => void;
  };

  let { source, isOpen = $bindable(), onCloseDrawer }: Props = $props();

  let nftTxCartStore = $state<NftTxCartStore | null>(null);
  let failedImageLoads = new SvelteSet<string>();
  let errorMessage: string | null = $state(null);

  const nft = $derived(source.nft);
  const sendAddress = $derived(
    typeof source.to === "string" ? source.to : source.to.toText(),
  );
  const shortenedSendAddress = $derived(
    transformShortAddress(sendAddress.trim()),
  );
  const standard = $derived(
    nft.standard ??
      source.collectionStandard ??
      locale.t("wallet.nfts.send.standardFallback"),
  );
  const isProcessing = $derived(nftTxCartStore?.state === "PROCESSING");

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
    if (!open) {
      onCloseDrawer();
    }
  }

  async function handleConfirm() {
    if (!nftTxCartStore || isProcessing) {
      return;
    }

    errorMessage = null;
    const result = await nftTxCartStore.execute();
    if (result.isOk()) {
      source.onSuccess?.(result.value);
      onCloseDrawer();
      return;
    }

    errorMessage = result.error;
  }

  function getNftDisplayName(nft: EnrichedNFT) {
    return nft.name || `#${nft.tokenId.toString()}`;
  }

  onMount(() => {
    nftTxCartStore = new NftTxCartStore(source);
  });

  $effect(() => {
    if (nftTxCartStore && source) {
      nftTxCartStore.updateSource(source);
    }
  });
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
      {#if errorMessage}
        <div
          class="mb-3 rounded border border-red-300 bg-red-100 p-2 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      {/if}

      <p class="mb-3 text-sm font-medium text-gray-900">
        {locale.t("wallet.nfts.send.youSend")}
      </p>

      <div class="mb-5 flex items-center gap-4">
        <div
          class="bg-walletlightpurple flex grow items-center justify-center overflow-hidden rounded-lg"
        >
          <img
            src={getNftImage(nft)}
            alt={getNftDisplayName(nft)}
            class="aspect-square h-full w-full object-contain"
            onerror={() => handleImageError(getNftImageKey(nft))}
          />
        </div>
        <div class="grow">
          <p class="text-lg font-semibold text-gray-900">
            #{nft.tokenId.toString()}
          </p>
          <p class="text-lg font-semibold leading-tight text-gray-900">
            {getNftDisplayName(nft)}
          </p>
          <p class="mt-1 text-xs font-normal text-gray-700">
            {nft.collectionName}
          </p>
        </div>
      </div>

      <dl class="space-y-2 text-sm">
        <div class="flex justify-between gap-4">
          <dt class="text-base font-medium text-gray-900">
            {locale.t("wallet.nfts.send.to")}
          </dt>
          <dd class="truncate text-gray-500">{shortenedSendAddress}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-base font-medium text-gray-900">
            {locale.t("wallet.nfts.send.network")}
          </dt>
          <dd class="text-gray-500">ICP</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-base font-medium text-gray-900">
            {locale.t("wallet.nfts.send.standard")}
          </dt>
          <dd class="text-gray-500">{standard}</dd>
        </div>
      </dl>

      <p class="my-5 text-sm font-normal leading-snug text-gray-700">
        {locale.t("wallet.nfts.send.terms")}
      </p>
    </div>

    <div class="mb-2 px-3">
      <PrimaryActionButton
        onclick={handleConfirm}
        class="!bg-walletpurple hover:!bg-walletpurple/90 disabled:!bg-walletpurple/60"
        loading={isProcessing}
        loadingLabel={locale.t(
          "links.linkForm.drawers.txCart.wallet.processingButton",
        )}
        type="button"
      >
        {errorMessage
          ? locale.t("links.linkForm.drawers.txCart.wallet.retryButton")
          : locale.t("wallet.nfts.send.confirmButton")}
      </PrimaryActionButton>
    </div>
  </Drawer.Content>
</Drawer.Root>
