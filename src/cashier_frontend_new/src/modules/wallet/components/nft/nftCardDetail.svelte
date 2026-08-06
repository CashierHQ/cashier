<script lang="ts">
  import { locale } from "$lib/i18n";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { transformShortAddress } from "$modules/shared/utils/transformShortAddress";
  import { NFT_FALLBACK_IMAGE_URL } from "$modules/wallet/constants";
  import type {
    EnrichedNFT,
    NftCollectionSummary,
  } from "$modules/wallet/types/nft";
  import { ChevronDown, ChevronUp, Copy } from "lucide-svelte";
  import { toast } from "svelte-sonner";

  type Props = {
    nft: EnrichedNFT;
    collection: NftCollectionSummary;
    onSend: (collectionId: string, tokenId: bigint) => void;
  };

  let { nft, collection, onSend }: Props = $props();
  let imageFailed = $state(false);
  let attributesOpen = $state(true);
  let collectionOpen = $state(true);

  const owner = $derived(nft.owner ?? authState.account?.owner ?? "");
  const standard = $derived(
    nft.standard ??
      collection.standard ??
      locale.t("wallet.nfts.send.standardFallback"),
  );
  const symbol = $derived(nft.symbol ?? collection.symbol ?? "");
  const displayName = $derived(nft.name || `#${nft.tokenId.toString()}`);
  const collectionDescription = $derived(
    nft.collectionDescription ?? collection.description,
  );

  function handleImageError() {
    imageFailed = true;
  }

  async function copyOwner() {
    if (!owner) {
      return;
    }

    try {
      await navigator.clipboard.writeText(owner);
      toast.success(locale.t("constants.copiedToClipboard"));
    } catch {
      toast.error(locale.t("wallet.receive.copyError"));
    }
  }

  function handleSend() {
    onSend(nft.collectionId, nft.tokenId);
  }
</script>

<article class="flex min-h-full flex-col px-4 pb-4">
  <div
    class="bg-walletlightpurple flex aspect-square items-center justify-center overflow-hidden rounded-lg"
  >
    <img
      src={imageFailed
        ? NFT_FALLBACK_IMAGE_URL
        : nft.imageUrl || NFT_FALLBACK_IMAGE_URL}
      alt={displayName}
      class="h-full w-full object-contain"
      onerror={handleImageError}
    />
  </div>

  <section class="pt-4">
    <div class="flex items-start justify-between gap-3">
      <h2 class="min-w-0 text-lg font-semibold leading-tight text-gray-950">
        {displayName}
      </h2>

      <div class="flex shrink-0 gap-1">
        <span
          class="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500"
        >
          ICP
        </span>
        <span
          class="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500"
        >
          {standard}
        </span>
      </div>
    </div>

    {#if nft.rarity}
      <p
        class="mt-2 inline-flex rounded-full bg-walletlightpurple px-2 font-medium py-1 text-xs text-walletpurple"
      >
        {locale.t("wallet.nfts.detail.rarity")}{nft.rarity}
      </p>
    {/if}

    <p class="mt-4 text-sm leading-snug text-gray-700">
      {nft.description || collectionDescription}
    </p>
  </section>

  <dl class="mt-5 space-y-1 border-b border-gray-100 pb-5 text-sm">
    <div class="flex justify-between gap-4">
      <dt class="font-medium text-gray-950 text-base">
        {locale.t("wallet.nfts.detail.tokenId")}
      </dt>
      <dd class="text-right text-gray-600">#{nft.tokenId.toString()}</dd>
    </div>
    <div class="flex justify-between gap-4">
      <dt class="font-medium text-gray-950 text-base">
        {locale.t("wallet.nfts.detail.owner")}
      </dt>
      <dd
        class="flex min-w-0 items-center justify-end gap-1 text-right text-gray-600"
      >
        <span class="truncate"
          >{owner ? transformShortAddress(owner) : "-"}</span
        >
        {#if owner}
          <button
            type="button"
            class="text-walletpurple flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full hover:bg-walletlightpurple"
            aria-label={locale.t("wallet.nfts.detail.copyOwner")}
            onclick={copyOwner}
          >
            <Copy size={15} />
          </button>
        {/if}
      </dd>
    </div>
    <div class="flex justify-between gap-4">
      <dt class="font-medium text-gray-950 text-base">
        {locale.t("wallet.nfts.detail.mintDate")}
      </dt>
      <dd class="text-right text-gray-600">{nft.mintedAt ?? "-"}</dd>
    </div>
    <div class="flex justify-between gap-4">
      <dt class="font-medium text-gray-950 text-base">
        {locale.t("wallet.nfts.detail.lastTransfer")}
      </dt>
      <dd class="text-right text-gray-600">{nft.lastTransferAt ?? "-"}</dd>
    </div>
  </dl>

  <section class="border-b border-gray-100 py-4">
    <button
      type="button"
      class="text-walletpurple flex w-full items-center justify-between text-left text-base font-medium"
      onclick={() => (attributesOpen = !attributesOpen)}
    >
      <span>{locale.t("wallet.nfts.detail.attributes")}</span>
      {#if attributesOpen}
        <ChevronUp size={18} />
      {:else}
        <ChevronDown size={18} />
      {/if}
    </button>

    {#if attributesOpen}
      {#if nft.attributes?.length}
        <div class="mt-3 grid grid-cols-2 gap-2">
          {#each nft.attributes as attribute (`${attribute.traitType}:${attribute.value}`)}
            <div class="rounded-lg bg-walletlightpurple px-3 py-2">
              <p class="truncate text-sm font-light text-gray-500">
                {attribute.traitType}
              </p>
              <p class="truncate text-sm font-normal text-gray-950">
                {attribute.value}
              </p>
              {#if attribute.rarity}
                <p class="mt-1 text-sm font-light text-walletpurple">
                  {attribute.rarity}
                </p>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <p class="mt-3 text-sm text-gray-500">
          {locale.t("wallet.nfts.detail.noAttributes")}
        </p>
      {/if}
    {/if}
  </section>

  <section class="py-4">
    <button
      type="button"
      class="text-walletpurple flex w-full items-center justify-between text-left text-base font-medium"
      onclick={() => (collectionOpen = !collectionOpen)}
    >
      <span
        >{locale
          .t("wallet.nfts.detail.aboutCollection")
          .replace("{{collection}}", collection.name)}</span
      >
      {#if collectionOpen}
        <ChevronUp size={18} />
      {:else}
        <ChevronDown size={18} />
      {/if}
    </button>

    {#if collectionOpen}
      <p class="mt-3 text-sm leading-snug text-gray-700">
        {collectionDescription}
      </p>
      <dl class="mt-3 space-y-1 text-sm">
        <div class="flex justify-between gap-4">
          <dt class="font-medium text-base text-gray-950">
            {locale.t("wallet.nfts.detail.collection")}
          </dt>
          <dd class="text-right text-gray-600">{collection.name}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="font-medium text-base text-gray-950">
            {locale.t("wallet.nfts.detail.symbol")}
          </dt>
          <dd class="text-right text-gray-600">{symbol}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="font-medium text-base text-gray-950">
            {locale.t("wallet.nfts.detail.supplyLabel")}
          </dt>
          <dd class="text-right text-gray-600">{collection.supply ?? "-"}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="font-medium text-base text-gray-950">
            {locale.t("wallet.nfts.detail.floorPrice")}
          </dt>
          <dd class="text-right text-gray-600">{collection.floor ?? "-"}</dd>
        </div>
      </dl>
    {/if}
  </section>

  <div class="sticky bottom-0 mt-auto bg-white pt-3">
    <Button
      onclick={handleSend}
      class="bg-walletpurple hover:bg-walletpurple/90 inline-flex h-[44px] w-full cursor-pointer items-center justify-center rounded-full px-4 font-medium text-primary-foreground shadow"
      type="button"
    >
      {locale.t("wallet.navBar.sendBtn")}
    </Button>
  </div>
</article>
