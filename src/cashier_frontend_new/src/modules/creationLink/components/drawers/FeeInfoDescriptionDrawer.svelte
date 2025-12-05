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
  title={locale.t("links.linkForm.preview.feesBreakdown")}
>
  <div class="pb-4 flex flex-col gap-5">
    <div>
      <h4 class="font-medium text-[14px] inline-flex items-center gap-1">
        <img src="/link-creation-fee-icon.svg" alt="" width="20" height="20" />
        <span>
          {locale.t("links.linkForm.drawers.feeInfo.linkCreationFeeHeader")}
        </span>
      </h4>
      <p class="text-[14px] font-normal text-[#222222]">
        {locale.t("links.linkForm.drawers.feeInfo.linkCreationFeeText")}
      </p>
    </div>
    <div>
      <h4 class="font-medium text-[14px] inline-flex items-center gap-1">
        <img src="/network-fee-icon.svg" alt="" width="20" height="20" />
        <span>
          {locale.t("links.linkForm.drawers.feeInfo.networkFeeHeader")}
        </span>
      </h4>
      <p class="text-[14px] font-normal text-[#222222]">
        {locale.t("links.linkForm.drawers.feeInfo.networkFeeText1")}
      </p>
      <p class="text-[14px] font-normal text-[#222222]">
        {locale.t("links.linkForm.drawers.feeInfo.networkFeeText2")}
      </p>
      <p class="text-[14px] font-normal text-[#222222]">
        {locale.t("links.linkForm.drawers.feeInfo.networkFeeText3")}
      </p>
    </div>
  </div>
</InfoDrawer>
