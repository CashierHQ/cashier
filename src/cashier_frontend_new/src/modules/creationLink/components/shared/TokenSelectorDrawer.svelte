<script lang="ts">
  import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerClose,
  } from "$lib/shadcn/components/ui/drawer";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { locale } from "$lib/i18n";
  import { Search, X } from "lucide-svelte";
  import { SvelteSet } from "svelte/reactivity";
  import TokenItem from "./TokenItem.svelte";
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import { preloadTokenImages } from "$modules/shared/utils/preloadTokenImage";

  type Props = {
    open?: boolean;
    selectedAddress?: string;
    onSelectToken: (address: string) => void;
    onClose?: () => void;
    excludeAddresses?: string[];
  };

  let {
    open = $bindable(false),
    selectedAddress,
    onSelectToken,
    onClose,
    excludeAddresses = [],
  }: Props = $props();

  let searchQuery = $state("");
  let failedImageLoads = new SvelteSet<string>();

  const filteredTokens = $derived.by(() => {
    if (!walletStore.query.data) return [];

    const excludeSet = new Set(excludeAddresses ?? []);

    const baseTokens = walletStore.query.data.filter((token) => {
      if (token.address === selectedAddress) return true;
      return !excludeSet.has(token.address);
    });

    if (!searchQuery.trim()) return baseTokens;

    const query = searchQuery.toLowerCase().trim();
    return baseTokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query),
    );
  });

  function handleSelectToken(address: string) {
    onSelectToken(address);
    if (onClose) {
      onClose();
    }
  }

  function handleImageError(address: string) {
    failedImageLoads.add(address);
  }

  $effect(() => {
    if (!open) {
      searchQuery = "";
    } else {
      // Preload images when drawer opens to ensure they're cached
      if (walletStore.query.data && walletStore.query.data.length > 0) {
        const logoUrls = walletStore.query.data.map((token) =>
          getTokenLogo(token.address),
        );
        // Preload images immediately when drawer opens
        preloadTokenImages(logoUrls).catch((error) => {
          console.warn("Failed to preload token images in drawer:", error);
        });
      }
    }
  });
</script>

<Drawer bind:open>
  <DrawerContent class="max-w-full w-[400px] mx-auto">
    <DrawerHeader>
      <div class="flex justify-center items-center relative mb-2">
        <DrawerTitle
          class="text-[18px] font-[600] leading-[20px] px-8 text-center w-[100%]"
        >
          {locale.t("links.linkForm.addAsset.selectAsset")}
        </DrawerTitle>
        <DrawerClose>
          <X
            size={24}
            stroke-width={2}
            class="absolute right-2 cursor-pointer top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
            aria-hidden="true"
          />
        </DrawerClose>
      </div>
    </DrawerHeader>
    <div class="mb-3 px-4">
      <div class="relative w-full">
        <input
          class="input-field w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md hover:border-green focus:border-green focus:ring-0 focus:outline-none"
          placeholder={locale.t("links.linkForm.addAsset.searchAssets")}
          bind:value={searchQuery}
        />
        <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Search
            size={20}
            class="text-[#35A18B]"
            stroke-width={2}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
    <div class="px-4 pb-4 max-h-[60vh] overflow-y-auto">
      {#if walletStore.query.data}
        {#if filteredTokens.length > 0}
          <div class="font-semibold">
            {locale.t("links.linkForm.addAsset.yourAssets")}
          </div>
          <ul class="space-y-1 py-4">
            {#each filteredTokens as token (token.address)}
              <TokenItem
                {token}
                {selectedAddress}
                onSelect={handleSelectToken}
                {failedImageLoads}
                onImageError={handleImageError}
              />
            {/each}
          </ul>
        {:else if searchQuery.trim()}
          <p class="text-center py-4">
            {locale.t("links.linkForm.addAsset.noTokensMatchingSearch")}
          </p>
        {:else}
          <p class="text-center py-4">
            {locale.t("links.linkForm.addAsset.noTokensFound")}
          </p>
        {/if}
      {:else if walletStore.query.error}
        <p class="text-red-600 text-center py-4">
          {locale.t("links.linkForm.addAsset.error")}: {walletStore.query.error}
        </p>
      {:else}
        <p class="text-center py-4">
          {locale.t("links.linkForm.addAsset.loadingTokens")}
        </p>
      {/if}
    </div>
  </DrawerContent>
</Drawer>
