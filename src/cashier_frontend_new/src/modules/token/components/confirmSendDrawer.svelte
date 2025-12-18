<script lang="ts">
  import { X, LoaderCircle, CircleCheck } from "lucide-svelte";
  import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerClose,
  } from "$lib/shadcn/components/ui/drawer";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { locale } from "$lib/i18n";
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import { shortenAddress } from "../utils/address";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";

  interface Props {
    open: boolean;
    txState: "confirm" | "pending" | "success" | "error";
    amount: number;
    selectedToken: TokenWithPriceAndBalance | null;
    receiveAddress: string;
    networkFee: string;
    transactionLink: string;
    onClose: () => void;
    onConfirm: () => void;
  }

  let {
    open = $bindable(),
    txState,
    amount,
    selectedToken,
    receiveAddress,
    networkFee,
    transactionLink,
    onClose,
    onConfirm,
  }: Props = $props();

  const tokenLogo = $derived(
    selectedToken ? getTokenLogo(selectedToken.address) : null,
  );
  let imageLoadFailed = $state(false);

  let networkImageLoadFailed = $state(false);
</script>

<Drawer bind:open>
  <DrawerContent class="max-w-full w-[400px] mx-auto">
    <DrawerHeader>
      <div class="flex justify-center items-center relative mb-2">
        <DrawerTitle
          class="text-[18px] font-[600] leading-[20px] px-8 text-center w-[100%]"
        >
          {locale.t("wallet.send.confirmDrawer.title")}
        </DrawerTitle>
        {#if txState === "confirm"}
          <DrawerClose>
            <X
              size={24}
              stroke-width={2}
              class="absolute right-2 cursor-pointer top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
              aria-hidden="true"
            />
          </DrawerClose>
        {/if}
      </div>
    </DrawerHeader>

    <div class="px-4 pb-4">
      {#if txState === "confirm"}
        <div class="space-y-4">
          <div class="text-center">
            <div class="text-sm text-gray-600 mb-2">
              {locale.t("wallet.send.confirmDrawer.youWillSend")}
            </div>
            <div class="text-4xl font-bold text-ellipsis overflow-hidden">
              {amount}
              {selectedToken?.symbol || ""}
            </div>
          </div>

          <div class="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-gray-600"
                >{locale.t("wallet.send.confirmDrawer.to")}</span
              >
              <span class="text-sm font-mono truncate ml-2 max-w-[200px]"
                >{shortenAddress(receiveAddress)}</span
              >
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600"
                >{locale.t("wallet.send.confirmDrawer.network")}</span
              >
              <!-- TODO: Add actual network loading from api -->
              <div class="flex items-center gap-1">
                <span>ICP</span>
                <div
                  class="relative flex shrink-0 overflow-hidden rounded-full w-4 h-4"
                >
                  {#if !networkImageLoadFailed}
                    <img
                      alt="ICP Network"
                      class="w-full h-full object-cover rounded-full"
                      src="/icpLogo.png"
                      onerror={() => (networkImageLoadFailed = true)}
                    />
                  {:else}
                    <div
                      class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-[8px]"
                    >
                      ICP
                    </div>
                  {/if}
                </div>
              </div>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600"
                >{locale.t("wallet.send.confirmDrawer.networkFee")}</span
              >
              <div class="flex items-center gap-1">
                <span>{networkFee}</span>
                <div
                  class="relative flex shrink-0 overflow-hidden rounded-full w-4 h-4"
                >
                  {#if !imageLoadFailed}
                    <img
                      alt="ICP Network"
                      class="w-full h-full object-cover rounded-full"
                      src={tokenLogo}
                      onerror={() => (imageLoadFailed = true)}
                    />
                  {:else}
                    <div
                      class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-[8px]"
                    >
                      {selectedToken?.symbol[0]?.toUpperCase() || "?"}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>

          <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex justify-between items-center">
              <span class="font-medium"
                >{locale.t("wallet.send.confirmDrawer.totalFees")}</span
              >
              <div class="flex items-center gap-2">
                {#if selectedToken}
                  <div class="flex items-center gap-1">
                    <span class="font-medium"
                      >{amount} {selectedToken.symbol}</span
                    >
                    <div
                      class="relative flex shrink-0 overflow-hidden rounded-full w-4 h-4"
                    >
                      {#if tokenLogo && !imageLoadFailed}
                        <img
                          alt={selectedToken.symbol}
                          class="w-full h-full object-cover rounded-full"
                          src={tokenLogo}
                          onerror={() => (imageLoadFailed = true)}
                        />
                      {:else}
                        <div
                          class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-[8px]"
                        >
                          {selectedToken.symbol[0]?.toUpperCase() || "?"}
                        </div>
                      {/if}
                    </div>
                  </div>
                  <span class="font-medium">+</span>
                {/if}
                <div class="flex items-center gap-1">
                  <span class="font-medium">{networkFee}</span>
                  <div
                    class="relative flex shrink-0 overflow-hidden rounded-full w-4 h-4"
                  >
                    {#if !imageLoadFailed}
                      <img
                        alt="ICP Network"
                        class="w-full h-full object-cover rounded-full"
                        src={tokenLogo}
                        onerror={() => (imageLoadFailed = true)}
                      />
                    {:else}
                      <div
                        class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-[8px]"
                      >
                        {selectedToken?.symbol[0]?.toUpperCase() || "?"}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="text-xs text-gray-600 text-center">
            {locale.t("wallet.send.confirmDrawer.agreementText")}
          </div>

          <Button
            onclick={onConfirm}
            class="w-full rounded-full bg-[#36A18B] hover:bg-[#2d8a75] text-white h-[44px]"
          >
            {locale.t("wallet.send.confirmDrawer.confirmButton")}
          </Button>
        </div>
      {:else if txState === "pending"}
        <div class="text-center py-8 space-y-4">
          <div class="flex justify-center">
            <div
              class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <LoaderCircle size={32} class="text-[#36A18B] animate-spin" />
            </div>
          </div>
          <div>
            <div class="font-semibold mb-2">
              {locale.t("wallet.send.pendingDrawer.title")}
            </div>
            <div class="text-sm text-gray-600">
              {locale.t("wallet.send.pendingDrawer.description")}
            </div>
          </div>
          <a
            href={transactionLink}
            target="_blank"
            rel="noopener noreferrer"
            class="text-[#36A18B] text-sm font-medium inline-block cursor-pointer"
          >
            {locale.t("wallet.send.pendingDrawer.viewTransaction")}
          </a>
          <div class="text-gray-400 text-sm">
            {locale.t("wallet.send.pendingDrawer.statusText")}
          </div>
        </div>
      {:else if txState === "success"}
        <div class="text-center py-8 space-y-4">
          <div class="flex justify-center">
            <div
              class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center"
            >
              <CircleCheck size={32} class="text-[#36A18B]" />
            </div>
          </div>
          <div>
            <div class="font-semibold mb-2">
              {locale.t("wallet.send.successDrawer.title")}
            </div>
            <div class="text-sm text-gray-600">
              {locale.t("wallet.send.successDrawer.description")}
            </div>
          </div>
          <a
            href={transactionLink}
            target="_blank"
            rel="noopener noreferrer"
            class="text-[#36A18B] text-sm font-medium inline-block cursor-pointer"
          >
            {locale.t("wallet.send.pendingDrawer.viewTransaction")}
          </a>
          <Button
            onclick={onClose}
            class="w-full rounded-full bg-[#36A18B] hover:bg-[#2d8a75] text-white h-[44px]"
          >
            {locale.t("wallet.send.successDrawer.closeButton")}
          </Button>
        </div>
      {/if}
    </div>
  </DrawerContent>
</Drawer>