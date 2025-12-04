<script lang="ts">
  import { locale } from "$lib/i18n";
  import InfoDrawer from "./InfoDrawer.svelte";

  type Props = {
    open?: boolean;
    onClose?: () => void;
  };

  let { open = $bindable(false), onClose }: Props = $props();
</script>

<InfoDrawer
  bind:open
  {onClose}
  title={locale.t("links.linkForm.drawers.assetTransferInfo.title")}
>
  {#snippet children()}
    <div class="pb-4 flex flex-col gap-5">
      <p class="text-[14px] font-normal text-[#222222]">
        {locale.t("links.linkForm.drawers.assetTransferInfo.text1")}
      </p>
      <p class="text-[14px] font-normal text-[#222222]">
        {locale.t("links.linkForm.drawers.assetTransferInfo.text2")}
      </p>
    </div>
  {/snippet}
</InfoDrawer>

