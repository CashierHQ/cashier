<script lang="ts">
  import { resolve } from "$app/paths";
  import { locale } from "$lib/i18n";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { type Link } from "$modules/links/types/link/link";
  import { LinkType } from "$modules/links/types/link/linkType";
  import { paths } from "$modules/routing/paths";
  import AirdropCompleted from "$modules/useLink/components/airdrop/Completed.svelte";
  import TipCompleted from "$modules/useLink/components/tiplink/Completed.svelte";
  import BasketCompleted from "$modules/useLink/components/tokenbasket/Completed.svelte";

  const { link }: { link?: Link } = $props();

  const linkType = $derived.by(() => {
    return link?.link_type;
  });
</script>

<div
  class="mx-auto w-[400px] max-w-full p-5 rounded-[13px] bg-lightgreen relative flex flex-col items-center justify-center overflow-hidden my-3"
>
  {#if linkType === LinkType.TIP}
    <TipCompleted {link} />
  {/if}
  {#if linkType === LinkType.AIRDROP}
    <AirdropCompleted {link} />
  {/if}
  {#if linkType === LinkType.TOKEN_BASKET}
    <BasketCompleted {link} />
  {/if}
  <Button
    href={resolve(paths.home())}
    class="mt-3 h-[44px] w-[95%] rounded-full"
  >
    {locale.t("links.linkForm.useLink.completed.continueButton")}
  </Button>
  <!-- TODO: Other link types will be added here -->
  <!-- 
  {#if linkType === LinkType.RECEIVE_PAYMENT}
    <PaymentCompleted {link} />
  {/if} -->
</div>
