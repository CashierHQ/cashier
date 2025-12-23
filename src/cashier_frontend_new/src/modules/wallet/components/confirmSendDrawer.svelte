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
  import { formatNumber } from "$modules/shared/utils/formatNumber";
  import type { NetworkFeeInfo } from "../utils/networkFee";
  import { getNetworkName, getNetworkLogo } from "../services/networkService";

  interface Props {
    open: boolean;
    txState: "confirm" | "pending" | "success" | "error";
    amount: number;
    selectedToken: TokenWithPriceAndBalance | null;
    receiveAddress: string;
    networkFee: NetworkFeeInfo;
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

  // Network information (always Internet Computer for all tokens)
  const networkName = $derived(getNetworkName(selectedToken));
  const networkLogo = $derived(getNetworkLogo(selectedToken));
  let networkImageLoadFailed = $state(false);

  // Network fee token logo (same as selected token since ICRC uses token's own fee)
  const networkFeeTokenLogo = $derived(
    selectedToken ? getTokenLogo(selectedToken.address) : null,
  );
  let networkFeeImageLoadFailed = $state(false);

  // Format amount with proper decimal places based on token decimals
  const formattedAmount = $derived.by(() => {
    if (!selectedToken) return amount.toString();
    return formatNumber(amount, { tofixed: selectedToken.decimals });
  });
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
              {formattedAmount}
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
              <div class="flex items-center gap-1">
                <span>{networkName}</span>
                <div
                  class="relative flex shrink-0 overflow-hidden rounded-full w-4 h-4"
                >
                  {#if !networkImageLoadFailed && networkLogo}
                    <img
                      alt={networkName}
                      class="w-full h-full object-cover rounded-full"
                      src={networkLogo}
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
              <!-- Network fee display in transaction card style -->
              <div class="flex justify-end gap-2 w-full max-w-[60%]">
                <div class="flex flex-col items-end">
                  <div class="flex items-center gap-1">
                    <p class="text-[14px] font-normal">
                      {networkFee.amountFormatted}
                    </p>
                  </div>
                  {#if networkFee.usdValueFormatted}
                    <p class="text-[10px] font-normal text-[#b6b6b6]">
                      ~${networkFee.usdValueFormatted}
                    </p>
                  {/if}
                </div>

                <div class="flex gap-1.5">
                  <p class="text-[14px] font-medium">{networkFee.symbol}</p>
                  {#if !networkFeeImageLoadFailed && networkFeeTokenLogo}
                    <img
                      src={networkFeeTokenLogo}
                      alt={networkFee.symbol}
                      class="w-4 h-4 mt-0.5 rounded-full overflow-hidden"
                      onerror={() => (networkFeeImageLoadFailed = true)}
                    />
                  {:else}
                    <div
                      class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs overflow-hidden"
                    >
                      {networkFee.symbol[0]?.toUpperCase() || "?"}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>

          <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex justify-between items-center gap-x-0.5">
              <span class="font-medium whitespace-nowrap"
                >{locale.t("wallet.send.confirmDrawer.totalFees")}</span
              >
              <div
                class="flex flex-wrap items-center gap-y-0.5 gap-x-2 justify-end"
              >
                {#if selectedToken}
                  <div class="flex items-center gap-1">
                    <span class="font-medium"
                      >{formattedAmount} {selectedToken.symbol}</span
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
                  <span class="font-medium"
                    >{networkFee.amountFormatted} {networkFee.symbol}</span
                  >
                  <div
                    class="relative flex shrink-0 overflow-hidden rounded-full w-4 h-4"
                  >
                    {#if !networkFeeImageLoadFailed && networkFeeTokenLogo}
                      <img
                        alt={networkFee.symbol}
                        class="w-full h-full object-cover rounded-full"
                        src={networkFeeTokenLogo}
                        onerror={() => (networkFeeImageLoadFailed = true)}
                      />
                    {:else}
                      <div
                        class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-[8px]"
                      >
                        {networkFee.symbol[0]?.toUpperCase() || "?"}
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
