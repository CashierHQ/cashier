<script lang="ts">
  import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerClose,
  } from "$lib/shadcn/components/ui/drawer";
  import { Button } from "$lib/shadcn/components/ui/button";
  import { X } from "lucide-svelte";

  type Props = {
    open?: boolean;
    onClose?: () => void;
    title: string;
    confirmButtonText: string;
    confirmButtonVariant?: "default" | "destructive";
    onConfirm: () => void;
    children?: import("svelte").Snippet;
  };

  let {
    open = $bindable(false),
    onClose,
    title,
    confirmButtonText,
    confirmButtonVariant = "default",
    onConfirm,
    children,
  }: Props = $props();

  function handleClose() {
    open = false;
    if (onClose) {
      onClose();
    }
  }

  function handleConfirm() {
    onConfirm();
    handleClose();
  }
</script>

<Drawer bind:open>
  <DrawerContent class="max-w-full w-[400px] mx-auto p-5">
    <DrawerHeader class="pb-6 pl-0 pr-0 pt-0">
      <div class="flex justify-between items-center relative">
        <DrawerTitle class="text-[18px] font-semibold leading-[24px]">
          {title}
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

    <div class="mb-2">
      {#if children}
        {@render children()}
      {/if}
    </div>

    <Button
      variant={confirmButtonVariant}
      class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none h-[44px] px-4 w-full"
      onclick={handleConfirm}
    >
      {confirmButtonText}
    </Button>
  </DrawerContent>
</Drawer>
