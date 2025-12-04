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
  {#snippet children()}
    <div
      class="pb-4 flex flex-col gap-5"
    >
      <div>
        <h4 class="font-medium text-[14px] inline-flex items-center gap-1">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_6594_3456)">
            <path d="M8.33301 10.8332C8.69088 11.3117 9.14747 11.7075 9.6718 11.994C10.1961 12.2805 10.7759 12.4508 11.3719 12.4935C11.9678 12.5362 12.566 12.4502 13.1258 12.2414C13.6856 12.0326 14.1939 11.7058 14.6163 11.2832L17.1163 8.78322C17.8753 7.99738 18.2953 6.94487 18.2858 5.85238C18.2763 4.7599 17.8381 3.71485 17.0656 2.94231C16.2931 2.16978 15.248 1.73157 14.1555 1.72208C13.063 1.71259 12.0105 2.13256 11.2247 2.89156L9.79134 4.31656" stroke="#36A18B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M11.6668 9.16677C11.309 8.68833 10.8524 8.29245 10.328 8.00599C9.80371 7.71953 9.22391 7.54918 8.62796 7.50649C8.03201 7.46381 7.43384 7.5498 6.87405 7.75862C6.31425 7.96744 5.8059 8.29421 5.3835 8.71677L2.8835 11.2168C2.12451 12.0026 1.70453 13.0551 1.71402 14.1476C1.72352 15.2401 2.16172 16.2851 2.93426 17.0577C3.70679 17.8302 4.75184 18.2684 5.84433 18.2779C6.93681 18.2874 7.98932 17.8674 8.77517 17.1084L10.2002 15.6834" stroke="#36A18B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
            <defs>
            <clipPath id="clip0_6594_3456">
            <rect width="20" height="20" fill="white"/>
            </clipPath>
            </defs>
          </svg>
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
           <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M10 16.6667H10.0083" stroke="#36A18B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
             <path d="M1.66699 7.35004C3.95875 5.30023 6.92561 4.16699 10.0003 4.16699C13.075 4.16699 16.0419 5.30023 18.3337 7.35004" stroke="#36A18B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
             <path d="M4.16699 10.7159C5.72473 9.18899 7.81905 8.33374 10.0003 8.33374C12.1816 8.33374 14.2759 9.18899 15.8337 10.7159" stroke="#36A18B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
             <path d="M7.08301 13.6908C7.86188 12.9274 8.90904 12.4998 9.99967 12.4998C11.0903 12.4998 12.1375 12.9274 12.9163 13.6908" stroke="#36A18B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
           </svg>
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
  {/snippet}
</InfoDrawer>
