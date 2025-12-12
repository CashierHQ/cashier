<script lang="ts">
  import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerClose,
  } from "$lib/shadcn/components/ui/drawer";
  import { Button } from "$lib/shadcn/components/ui/button";
  import { locale } from "$lib/i18n";
  import { X } from "lucide-svelte";
  import { ChevronLeft } from "lucide-svelte";
  import {
    formatFeeBreakdownItem,
    formatLinkCreationFeeView,
  } from "$modules/links/utils/feesBreakdown";

  type FeeBreakdownItem = {
    name: string;
    amount: bigint;
    tokenAddress: string;
    tokenSymbol: string;
    tokenDecimals: number;
    usdAmount: number;
  };

  type Props = {
    open?: boolean;
    onClose?: () => void;
    onBack?: () => void; // Callback for back button click
    feesBreakdown: FeeBreakdownItem[];
  };

  let {
    open = $bindable(false),
    onClose,
    onBack,
    feesBreakdown,
  }: Props = $props();

  function handleClose() {
    open = false;
    if (onClose) {
      onClose();
    }
  }

  function handleBack() {
    open = false;
    if (onBack) {
      onBack();
    }
    if (onClose) {
      onClose();
    }
  }

  // Separate network fees and link creation fee
  const networkFees = $derived.by(() => {
    return feesBreakdown.filter((fee) => fee.name === "Network fees");
  });

  const linkCreationFee = $derived.by(() => {
    return feesBreakdown.find((fee) => fee.name === "Link creation fee");
  });

  // View models with precomputed values for rendering
  const networkFeesView = $derived.by(() =>
    networkFees.map((fee) => formatFeeBreakdownItem(fee)),
  );

  const linkCreationFeeView = $derived.by(() =>
    formatLinkCreationFeeView(linkCreationFee),
  );
</script>

<Drawer bind:open>
  <DrawerContent class="max-w-full w-[400px] mx-auto p-3">
    <DrawerHeader class="pt-2">
      <div class="flex justify-center items-center relative relative">
        <button
          class="flex items-center gap-1 cursor-pointer"
          onclick={handleBack}
          type="button"
        >
          <ChevronLeft size={20} />
        </button>
        <DrawerTitle
          class="text-[18px] font-semibold leading-[20px] px-8 text-center w-[100%]"
        >
          {locale.t("links.linkForm.preview.feesBreakdown")}
        </DrawerTitle>
        <DrawerClose>
          <X
            size={28}
            stroke-width={1.5}
            class="cursor-pointer opacity-70 hover:opacity-100"
            aria-hidden="true"
            onclick={handleClose}
          />
        </DrawerClose>
      </div>
    </DrawerHeader>

    <div
      class="mb-4 border-[1px] rounded-lg border-lightgreen px-4 py-4 flex flex-col gap-4"
    >
      <!-- Network fees -->
      {#each networkFeesView as fee (fee.tokenAddress)}
        <div>
          <div class="flex justify-between items-center">
            <span class="text-[14px] font-medium">{fee.name}</span>
            <div class="flex items-center gap-1">
              <span class="text-[14px] font-normal">
                {fee.feeAmountFormatted}
                {fee.tokenSymbol}
              </span>
            </div>
          </div>
          <div class="flex justify-end">
            <p class="text-[10px] font-normal text-[#b6b6b6]">
              ~${fee.usdFormatted}
            </p>
          </div>
        </div>
      {/each}

      <!-- Link creation fee -->
      {#if linkCreationFeeView}
        <div>
          <div class="flex justify-between items-center">
            <span class="text-[14px] font-medium"
              >{linkCreationFeeView.name}</span
            >
            <div class="flex items-center gap-1">
              <span class="text-[14px] font-normal">
                {linkCreationFeeView.feeAmountFormatted}
                {linkCreationFeeView.tokenSymbol}
              </span>
            </div>
          </div>
          <div class="flex justify-end">
            <p class="text-[10px] font-normal text-[#b6b6b6]">
              ~${linkCreationFeeView.usdFormatted}
            </p>
          </div>
        </div>
      {/if}
    </div>

    <Button
      class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
      onclick={handleClose}
    >
      {locale.t("links.linkForm.drawers.feeInfo.closeButton")}
    </Button>
  </DrawerContent>
</Drawer>
