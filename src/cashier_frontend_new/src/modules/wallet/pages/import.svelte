<script lang="ts">
  import NavBar from "$modules/token/components/navBar.svelte";
  import { locale } from "$lib/i18n";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { Clipboard, Info, LoaderCircle } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import { goto } from "$app/navigation";
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import NetworkSelector from "$modules/creationLink/components/shared/NetworkSelector.svelte";
  import { resolve } from "$app/paths";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import {
    MOCK_NETWORKS,
    MOCK_TOKEN_DATA,
    SECURITY_LEARN_MORE_URL,
  } from "../constants/mock";

  let isReview = $state(false);
  let selectedNetwork = $state("icp");
  let contractAddress = $state("");
  let indexCanisterId = $state("");
  let isLoading = $state(false);

  // TODO: Fetch from API based on contract address
  let tokenData = $state({ ...MOCK_TOKEN_DATA });

  let imageLoadFailed = $state(false);
  let networkIconLoadFailed = $state(false);

  const pageTitle = $derived(
    isReview
      ? locale.t("wallet.import.review")
      : locale.t("wallet.import.title"),
  );

  const tokenLogo = $derived(
    tokenData.address ? getTokenLogo(tokenData.address) : null,
  );

  const selectedNetworkName = $derived.by(() => {
    return MOCK_NETWORKS.find((n) => n.id === selectedNetwork)?.name || "";
  });

  const selectedNetworkIcon = $derived.by(() => {
    return MOCK_NETWORKS.find((n) => n.id === selectedNetwork)?.iconUrl || "";
  });

  async function handlePaste(field: "contract" | "index") {
    try {
      const text = await navigator.clipboard.readText();
      if (field === "contract") {
        contractAddress = text.trim();
      } else if (field === "index") {
        indexCanisterId = text.trim();
      }
      toast.success(locale.t("wallet.import.pasteSuccess"));
    } catch (err) {
      toast.error(locale.t("wallet.import.pasteError") + ": " + err);
    }
  }

  async function handleContinue() {
    if (!contractAddress.trim()) {
      toast.error(locale.t("wallet.import.errors.enterContractAddress"));
      return;
    }

    isLoading = true;

    try {
      // TODO: Validate contract address format
      // TODO: Fetch token data from API to populate tokenData
      tokenData.address = contractAddress;

      isReview = true;
      // Reset network icon error state when entering review
      networkIconLoadFailed = false;
    } catch (error) {
      toast.error(`${locale.t("wallet.import.error")} ${error}`);
    } finally {
      isLoading = false;
    }
  }

  function handleSelectNetwork(networkId: string) {
    selectedNetwork = networkId;
    networkIconLoadFailed = false;
  }

  async function handleImport() {
    if (!contractAddress.trim()) {
      toast.error(locale.t("wallet.import.errors.enterContractAddress"));
      return;
    }

    isLoading = true;

    try {
      await walletStore.addToken(
        contractAddress.trim(),
        indexCanisterId.trim() || undefined,
      );

      toast.success(locale.t("wallet.import.success"));

      // Redirect to token page
      goto(resolve(`/wallet/${contractAddress}`));
    } catch (error) {
      toast.error(`${locale.t("wallet.import.error")} ${error}`);
    } finally {
      isLoading = false;
    }
  }

  function handleImageError() {
    imageLoadFailed = true;
  }

  function handleNetworkIconError() {
    networkIconLoadFailed = true;
  }
</script>

<NavBar header={pageTitle} />

<div class="px-4 grow-1 flex flex-col">
  {#if !isReview}
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

      <!-- Info Message -->
      <div class="flex items-start gap-1.5">
        <Info class="h-4 w-4 text-[#36A18B] flex-shrink-0 mt-0.5" />
        <div class="text-sm text-green">
          {locale.t("wallet.import.ledgerIndexInfo")}
        </div>
      </div>

      <!-- Contract Address -->
      <div class="space-y-1">
        <Label class="text-sm font-medium"
          >{locale.t("wallet.import.contractAddress")}</Label
        >

        <div class="relative">
          <input
            type="text"
            bind:value={contractAddress}
            class="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green"
            placeholder="______-_____-_____-_____-cai"
          />
          <button
            onclick={() => handlePaste("contract")}
            class="absolute right-2 top-1/2 -translate-y-1/2 text-[#36A18B] hover:text-[#2d8a75] transition-colors"
          >
            <Clipboard size={20} />
          </button>
        </div>
      </div>

      <!-- Info Message -->
      <div class="flex items-start gap-1.5">
        <Info class="h-4 w-4 text-[#36A18B] flex-shrink-0 mt-0.5" />
        <div class="text-sm text-green">
          {locale.t("wallet.import.indexCanisterInfo")}
        </div>
      </div>

      <!-- Index Canister ID -->
      <div class="space-y-1">
        <div class="flex items-center justify-between">
          <Label class="text-sm font-medium"
            >{locale.t("wallet.import.indexCanisterId")}</Label
          >
          <span class="text-sm text-[#36A18B]"
            >{locale.t("wallet.import.optional")}</span
          >
        </div>

        <div class="relative">
          <input
            type="text"
            bind:value={indexCanisterId}
            class="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green"
            placeholder="______-_____-_____-_____-cai"
          />
          <button
            onclick={() => handlePaste("index")}
            class="absolute right-2 top-1/2 -translate-y-1/2 text-[#36A18B] hover:text-[#2d8a75] transition-colors"
          >
            <Clipboard size={20} />
          </button>
        </div>
      </div>

      <!-- Continue Button -->
      <div
        class="flex-none w-[95%] mx-auto px-2 sticky bottom-2 left-0 right-0 z-10 mt-auto"
      >
        <Button
          onclick={handleContinue}
          disabled={isLoading}
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
          type="button"
        >
          {#if isLoading}
            <LoaderCircle class="animate-spin" size={20} />
          {:else}
            {locale.t("wallet.import.continue")}
          {/if}
        </Button>
      </div>
    </div>
  {:else}
    <!-- Review Screen -->
    <div class="space-y-4 grow-1 flex flex-col">
      <!-- Token Info -->
      <div class="space-y-1">
        <Label class="text-sm font-medium"
          >{locale.t("wallet.import.token")}</Label
        >

        <div
          class="flex items-center gap-3 p-3 border border-gray-300 rounded-lg bg-white"
        >
          <div
            class="relative flex shrink-0 overflow-hidden rounded-full w-10 h-10"
          >
            {#if tokenLogo && !imageLoadFailed}
              <img
                alt={tokenData.symbol}
                class="w-full h-full object-cover rounded-full"
                src={tokenLogo}
                onerror={handleImageError}
              />
            {:else}
              <div
                class="w-full h-full flex items-center justify-center bg-gray-500 rounded-full text-sm font-bold text-white"
              >
                {tokenData.symbol[0]?.toUpperCase() || "?"}
              </div>
            {/if}
          </div>
          <div>
            <div class="font-medium">{tokenData.name}</div>
            <div class="text-sm text-gray-600">{tokenData.symbol}</div>
          </div>
        </div>
      </div>

      <!-- Network -->
      <div class="space-y-1">
        <Label class="text-sm font-medium"
          >{locale.t("wallet.import.network")}</Label
        >

        <div
          class="flex items-center gap-3 p-3 border border-gray-300 rounded-lg bg-white"
        >
          {#if selectedNetworkIcon && !networkIconLoadFailed}
            <img
              src={selectedNetworkIcon}
              alt={selectedNetworkName}
              class="w-8 h-8"
              onerror={handleNetworkIconError}
            />
          {:else}
            <div
              class="w-8 h-8 flex items-center justify-center bg-gray-500 rounded-full text-sm font-bold text-white"
            >
              {selectedNetworkName[0]?.toUpperCase() || "?"}
            </div>
          {/if}
          <span class="font-medium">{selectedNetworkName}</span>
        </div>
      </div>

      <!-- Contract Address -->
      <div class="space-y-1">
        <Label class="text-sm font-medium"
          >{locale.t("wallet.import.contractAddress")}</Label
        >

        <div
          class="p-3 border border-gray-300 rounded-lg bg-white break-all text-sm font-mono"
        >
          {contractAddress}
        </div>
      </div>

      <!-- Security Warning -->
      <div class="flex items-start gap-1.5">
        <Info class="h-4 w-4 text-[#36A18B] flex-shrink-0 mt-0.5" />
        <div class="text-sm text-green">
          {locale.t("wallet.import.securityWarning")}
          <a
            href={SECURITY_LEARN_MORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-[#2d8a75]"
          >
            {locale.t("wallet.import.learnMore")}
          </a>.
        </div>
      </div>

      <!-- Import Button -->
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
  {/if}
</div>
