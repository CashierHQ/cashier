<script lang="ts">
  import { ChevronDown } from "lucide-svelte";
  import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerClose,
  } from "$lib/shadcn/components/ui/drawer";
  import { X } from "lucide-svelte";
  import { locale } from "$lib/i18n";

  type Network = {
    id: string;
    name: string;
    iconUrl: string;
  };

  type Props = {
    selectedNetworkId: string;
    onSelectNetwork: (networkId: string) => void;
  };

  let { selectedNetworkId, onSelectNetwork }: Props = $props();

  let showDrawer = $state(false);
  let failedImageLoads = $state(new Set<string>());

  // TODO: Replace with real API data
  const AVAILABLE_NETWORKS: Network[] = [
    {
      id: "icp",
      name: "Internet Computer",
      iconUrl: "/icpLogo.png",
    },
    {
      id: "base",
      name: "Base",
      iconUrl: "https://avatars.githubusercontent.com/u/108554348?s=280&v=4",
    },
    {
      id: "eth",
      name: "Ethereum",
      iconUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    },
    {
      id: "sol",
      name: "Solana",
      iconUrl: "https://cryptologos.cc/logos/solana-sol-logo.png",
    },
    {
      id: "bnb",
      name: "BNB Chain",
      iconUrl: "https://cryptologos.cc/logos/bnb-bnb-logo.png",
    },
  ];

  const selectedNetwork = $derived(
    AVAILABLE_NETWORKS.find((n) => n.id === selectedNetworkId),
  );

  function handleSelectNetwork(networkId: string) {
    onSelectNetwork(networkId);
    showDrawer = false;
  }

  function handleOpenDrawer() {
    showDrawer = true;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpenDrawer();
    }
  }

  function handleImageError(networkId: string) {
    failedImageLoads.add(networkId);
    failedImageLoads = failedImageLoads; // Trigger reactivity
  }
</script>

<div>
  <!-- Network Selector Button -->
  <button
    onclick={handleOpenDrawer}
    onkeydown={handleKeyDown}
    class="input-field-asset flex items-center relative rounded-md border border-gray-300 hover:border-green focus:border-green focus:ring-0 py-2 px-3 focus:outline-none w-full"
  >
    {#if selectedNetwork}
      <div class="flex font-normal flex-grow items-center w-full">
        <div class="relative flex shrink-0 overflow-hidden mr-2">
          {#if selectedNetwork.iconUrl && !failedImageLoads.has(selectedNetwork.id)}
            <span
              class="relative flex shrink-0 overflow-hidden rounded-full w-6 h-6"
            >
              <img
                src={selectedNetwork.iconUrl}
                alt={selectedNetwork.name}
                class="w-full h-full object-cover"
                onerror={() => handleImageError(selectedNetwork.id)}
              />
            </span>
          {:else}
            <span
              class="relative flex shrink-0 overflow-hidden rounded-full w-6 h-6"
            >
              <div
                class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-xs font-medium"
              >
                {selectedNetwork.name[0]?.toUpperCase() || "?"}
              </div>
            </span>
          {/if}
        </div>
        <div
          class="text-left flex sm:gap-3 gap-1 w-full leading-none items-center"
        >
          <div
            class="text-[14px] font-normal whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {selectedNetwork.name}
          </div>
          <ChevronDown
            color="#36A18B"
            stroke-width={2}
            size={22}
            class="ml-auto min-w-[22px]"
          />
        </div>
      </div>
    {/if}
  </button>

  <!-- Network Selector Drawer -->
  <Drawer bind:open={showDrawer}>
    <DrawerContent class="max-w-full w-[400px] mx-auto">
      <DrawerHeader>
        <div class="flex justify-center items-center relative mb-2">
          <DrawerTitle
            class="text-[18px] font-[600] leading-[20px] px-8 text-center w-[100%]"
          >
            {locale.t("wallet.import.selectNetwork")}
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

      <div class="px-4 pb-4 max-h-[60vh] overflow-y-auto">
        <ul class="space-y-2">
          {#each AVAILABLE_NETWORKS as network (network.id)}
            <li>
              <button
                onclick={() => handleSelectNetwork(network.id)}
                class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors {selectedNetworkId ===
                network.id
                  ? 'bg-green-50 border border-[#36A18B]'
                  : 'border border-transparent'}"
              >
                {#if network.iconUrl && !failedImageLoads.has(network.id)}
                  <span
                    class="relative flex shrink-0 overflow-hidden rounded-full w-8 h-8"
                  >
                    <img
                      src={network.iconUrl}
                      alt={network.name}
                      class="w-full h-full object-cover"
                      onerror={() => handleImageError(network.id)}
                    />
                  </span>
                {:else}
                  <span
                    class="relative flex shrink-0 overflow-hidden rounded-full w-8 h-8"
                  >
                    <div
                      class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-sm font-medium"
                    >
                      {network.name[0]?.toUpperCase() || "?"}
                    </div>
                  </span>
                {/if}
                <span class="font-medium text-left">{network.name}</span>
              </button>
            </li>
          {/each}
        </ul>
      </div>
    </DrawerContent>
  </Drawer>
</div>
