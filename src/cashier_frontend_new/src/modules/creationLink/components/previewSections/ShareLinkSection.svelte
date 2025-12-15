<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { ChevronDown } from "lucide-svelte";
  import { locale } from "$lib/i18n";
  import QRCode from "qrcode";
  import { onMount } from "svelte";

  type Props = {
    link: string;
  };

  let { link }: Props = $props();

  let isOpen = $state(false);
  let qrCodeDataUrl = $state("");
  let contentElement: HTMLDivElement;
  let contentHeight = $state(0);

  function toggleAccordion() {
    isOpen = !isOpen;
  }

  // Generate QR code when component mounts or link changes
  $effect(() => {
    if (link) {
      QRCode.toDataURL(link, {
        width: 80,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => {
          qrCodeDataUrl = url;
        })
        .catch((err) => {
          console.error("Failed to generate QR code:", err);
        });
    }
  });

  // Update content height when open state changes
  $effect(() => {
    if (contentElement) {
      contentHeight = isOpen ? contentElement.scrollHeight : 0;
    }
  });
</script>

<div class="input-label-field-container">
  <button
    type="button"
    class="w-full"
    onclick={toggleAccordion}
  >
    <div class="flex items-center w-full justify-between mb-2">
      <Label class="font-medium text-sm cursor-pointer">
        {locale.t("links.linkForm.detail.shareLink") || "Share your link"}
      </Label>
      <div
        class="transition-transform duration-300 ease-in-out"
        class:rotate-180={isOpen}
      >
        <ChevronDown size={20} color="#36A18B" />
      </div>
    </div>
  </button>

  <div
    class="overflow-hidden transition-all duration-300 ease-in-out"
    style="height: {contentHeight}px"
  >
    <div bind:this={contentElement}>
      <div class="flex justify-center items-center">
        {#if qrCodeDataUrl}
          <img
            src={qrCodeDataUrl}
            alt="QR Code"
            width="80"
            height="80"
            class="block"
          />
        {:else}
          <div class="w-20 h-20 bg-gray-100 rounded animate-pulse"></div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .input-label-field-container {
    width: 100%;
  }
</style>