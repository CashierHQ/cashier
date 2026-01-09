<script lang="ts">
  import { locale } from "$lib/i18n";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import NetworkSelector from "$modules/creationLink/components/shared/NetworkSelector.svelte";
  import NavBar from "$modules/token/components/navBar.svelte";
  import { walletNftStore } from "$modules/wallet/state/walletNftStore.svelte";
  import { isValidPrincipal } from "$modules/wallet/utils/address";
  import { Principal } from "@dfinity/principal";
  import { Clipboard, LoaderCircle } from "lucide-svelte";
  import { toast } from "svelte-sonner";

  type Props = {
    onNavigateBack: () => void;
  };

  let { onNavigateBack }: Props = $props();

  let selectedNetwork = $state("icp");
  let collectionAddress = $state("");
  let tokenId = $state<number>(0);
  let isLoading = $state(false);

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      collectionAddress = text.trim();

      toast.success(locale.t("wallet.import.pasteSuccess"));
    } catch (err) {
      toast.error(locale.t("wallet.import.pasteError") + ": " + err);
    }
  }

  function handleSelectNetwork(networkId: string) {
    selectedNetwork = networkId;
  }

  async function handleImport() {
    if (!collectionAddress.trim()) {
      toast.error(locale.t("wallet.import.errors.enterContractAddress"));
      return;
    }

    if (isValidPrincipal(collectionAddress).isErr()) {
      toast.error(locale.t("wallet.import.errors.invalidContractAddress"));
      return;
    }

    isLoading = true;

    try {
      const collectionPrincipal = Principal.fromText(collectionAddress.trim());
      const nftId = BigInt(tokenId > 0 ? tokenId : 0);

      await walletNftStore.addNft(collectionPrincipal, nftId);
      toast.success(locale.t("wallet.import.success"));
    } catch (error) {
      toast.error(`${locale.t("wallet.import.error")} ${error}`);
    } finally {
      isLoading = false;
    }
  }
</script>

<NavBar
  mode="back-only"
  title={locale.t("wallet.import.importNftTitle")}
  onBack={onNavigateBack}
/>

<div class="px-4 grow-1 flex flex-col">
  <!-- Import Form -->
  <div class="space-y-4 grow-1 flex flex-col">
    <!-- Network Selector -->
    <div class="space-y-1">
      <Label class="text-sm font-medium"
        >{locale.t("wallet.import.network")}</Label
      >
      <NetworkSelector
        selectedNetworkId={selectedNetwork}
        onSelectNetwork={handleSelectNetwork}
      />
    </div>

    <!-- Collection Address -->
    <div class="space-y-1">
      <Label class="text-sm font-medium"
        >{locale.t("wallet.import.collectionAddress")}</Label
      >

      <div class="relative">
        <input
          type="text"
          bind:value={collectionAddress}
          class="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green"
          placeholder="______-_____-_____-_____-cai"
        />
        <button
          onclick={() => handlePaste()}
          class="absolute right-2 top-1/2 -translate-y-1/2 text-[#36A18B] hover:text-[#2d8a75] transition-colors"
        >
          <Clipboard size={20} />
        </button>
      </div>
    </div>

    <!-- NFT Token ID -->
    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <Label class="text-sm font-medium"
          >{locale.t("wallet.import.nftTokenId")}</Label
        >
      </div>

      <div class="relative">
        <input
          type="number"
          bind:value={tokenId}
          class="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green"
          placeholder="0"
        />
      </div>
    </div>

    <!-- Continue Button -->
    <div
      class="flex-none w-[95%] mx-auto px-2 sticky bottom-2 left-0 right-0 z-10 mt-auto"
    >
      <Button
        onclick={handleImport}
        disabled={isLoading}
        class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
        type="button"
      >
        {#if isLoading}
          <LoaderCircle class="animate-spin" size={20} />
        {:else}
          {locale.t("wallet.import.import")}
        {/if}
      </Button>
    </div>
  </div>
</div>
