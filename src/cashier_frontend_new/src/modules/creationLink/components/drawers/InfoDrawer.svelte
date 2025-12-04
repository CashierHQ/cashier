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

  type Props = {
    open?: boolean;
    onClose?: () => void;
    title: string;
    closeButtonText?: string;
    children?: import("svelte").Snippet;
  };

  let {
    open = $bindable(false),
    onClose,
    title,
    closeButtonText = locale.t("links.linkForm.drawers.feeInfo.closeButton"),
    children,
  }: Props = $props();

  function handleClose() {
    open = false;
    if (onClose) {
      onClose();
    }
  }
</script>

<Drawer bind:open>
  <DrawerContent class="max-w-full w-[400px] mx-auto p-5">
    <DrawerHeader class="pb-6 pl-0 pr-0 pt-0">
      <div class="flex justify-between items-center relative relative">
        <button
          class="flex items-center gap-1 cursor-pointer"
          onclick={handleClose}
          type="button"
        >
          <ChevronLeft size={20} />
        </button>
        <DrawerTitle
          class="text-[18px] font-semibold leading-[24px] px-4 text-center w-[100%]"
        >
          {title}
        </DrawerTitle>
        <span class="w-6"></span>
      </div>
    </DrawerHeader>

    <div class="mb-2">
      {#if children}
        {@render children()}
      {/if}
    </div>

    <Button
      class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
      onclick={handleClose}
    >
      {closeButtonText}
    </Button>
  </DrawerContent>
</Drawer>

