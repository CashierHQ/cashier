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
  import type { SendFeeOutput } from "$modules/shared/types/feeService";
  import { TxState } from "$modules/wallet/types/walletSendStore";

  interface Props {
    open: boolean;
    txState: TxState;
    sendFeeOutput: SendFeeOutput | null;
    transactionLink: string | null;
    onClose: () => void;
    onConfirm: () => void;
  }

  let {
    open = $bindable(),
    txState,
    sendFeeOutput,
    transactionLink,
    onClose,
    onConfirm,
  }: Props = $props();

  // Image load error states
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
        {#if txState === TxState.CONFIRM}
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
      {#if txState === TxState.CONFIRM}
        <div class="space-y-4">
          <!-- You Will Send Section -->
          <div class="text-center">
            <div class="text-sm text-gray-600 mb-2">
              {locale.t("wallet.send.confirmDrawer.youWillSend")}
            </div>
            <div class="text-4xl font-bold text-ellipsis overflow-hidden">
              {sendFeeOutput?.sendAmountFormatted || "0"}
              {sendFeeOutput?.symbol || ""}
            </div>
          </div>

          <!-- Transaction Details Card -->
          <div class="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <!-- To Address -->
            <div class="flex justify-between items-center">
              <span class="text-gray-600"
                >{locale.t("wallet.send.confirmDrawer.to")}</span
              >
              <span class="text-sm font-mono truncate ml-2 max-w-[200px]"
                >{sendFeeOutput?.receiveAddressShortened || ""}</span
              >
            </div>

            <!-- Network -->
            <div class="flex justify-between items-center">
              <span class="text-gray-600"
                >{locale.t("wallet.send.confirmDrawer.network")}</span
              >
              <div class="flex items-center gap-1">
                <span>{sendFeeOutput?.networkName || ""}</span>
                <div
                  class="relative flex shrink-0 overflow-hidden rounded-full w-4 h-4"
                >
                  {#if !networkImageLoadFailed && sendFeeOutput?.networkLogo}
                    <img
                      alt={sendFeeOutput?.networkName || ""}
                      class="w-full h-full object-cover rounded-full"
                      src={sendFeeOutput.networkLogo}
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

            <!-- Network Fee (conditional: only show if fee > 0) -->
            {#if sendFeeOutput && sendFeeOutput.fee > 0n}
              <div class="flex justify-between items-center">
                <span class="text-gray-600"
                  >{locale.t("wallet.send.confirmDrawer.networkFee")}</span
                >
                <div class="flex justify-end gap-2 w-full max-w-[60%]">
                  <div class="flex flex-col items-end">
                    <div class="flex items-center gap-1">
                      <p class="text-[14px] font-normal">
                        {sendFeeOutput.feeFormatted}
                      </p>
                    </div>
                    {#if sendFeeOutput.feeUsdFormatted}
                      <p class="text-[10px] font-normal text-[#b6b6b6]">
                        ~${sendFeeOutput.feeUsdFormatted}
                      </p>
                    {/if}
                  </div>

                  <div class="flex gap-1.5">
                    <p class="text-[14px] font-medium">
                      {sendFeeOutput.symbol}
                    </p>
                    {#if !imageLoadFailed && sendFeeOutput.tokenLogo}
                      <img
                        src={sendFeeOutput.tokenLogo}
                        alt={sendFeeOutput.symbol}
                        class="w-4 h-4 mt-0.5 rounded-full overflow-hidden"
                        onerror={() => (imageLoadFailed = true)}
                      />
                    {:else}
                      <div
                        class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs overflow-hidden"
                      >
                        {sendFeeOutput.symbol[0]?.toUpperCase() || "?"}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <!-- Total Fees Section -->
          {#if sendFeeOutput}
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="flex justify-between items-center gap-x-0.5">
                <span class="font-medium whitespace-nowrap"
                  >{locale.t("wallet.send.confirmDrawer.totalFees")}</span
                >
                <div class="flex items-center gap-1">
                  <span class="font-medium">
                    {sendFeeOutput.totalAmountFormatted}
                    {sendFeeOutput.symbol}
                  </span>
                  <div
                    class="relative flex shrink-0 overflow-hidden rounded-full w-4 h-4"
                  >
                    {#if sendFeeOutput.tokenLogo && !imageLoadFailed}
                      <img
                        alt={sendFeeOutput.symbol}
                        class="w-full h-full object-cover rounded-full"
                        src={sendFeeOutput.tokenLogo}
                        onerror={() => (imageLoadFailed = true)}
                      />
                    {:else}
                      <div
                        class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-[8px]"
                      >
                        {sendFeeOutput.symbol[0]?.toUpperCase() || "?"}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
              {#if sendFeeOutput.totalAmountUsdFormatted}
                <div class="text-right text-[10px] text-[#b6b6b6] mt-1">
                  ~${sendFeeOutput.totalAmountUsdFormatted}
                </div>
              {/if}
            </div>
          {/if}

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
      {:else if txState === TxState.PENDING}
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
          <div class="text-gray-400 text-sm">
            {locale.t("wallet.send.pendingDrawer.statusText")}
          </div>
        </div>
      {:else if txState === TxState.SUCCESS}
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
          {#if transactionLink}
            <a
              href={transactionLink}
              target="_blank"
              rel="noopener noreferrer"
              class="text-[#36A18B] text-sm font-medium inline-block cursor-pointer"
            >
              {locale.t("wallet.send.pendingDrawer.viewTransaction")}
            </a>
          {/if}
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
