<script lang="ts">
  import { locale } from "$lib/i18n";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import { getTokenOrigin, getTokenOriginLabel } from "$modules/token/types/tokenOrigin";
  import { ChevronDown } from "lucide-svelte";

  type Props = {
    token: TokenWithPriceAndBalance;
  };

  let { token }: Props = $props();
  let expanded = $state(false);

  const origin = $derived.by(() => {
    return getTokenOrigin(token)
  });
</script>

{#if origin}
  <div class="space-y-3">
    <button
      type="button"
      class="flex w-full items-center justify-between text-left"
      onclick={() => (expanded = !expanded)}
      aria-expanded={expanded}
    >
      <span class="text-black text-sm">
        {locale.t("wallet.tokenInfo.tokenOrigin")}
      </span>

      <span class="flex items-center gap-2 font-light text-sm text-gray-700">
        {getTokenOriginLabel(origin)}
        <ChevronDown
          class="h-5 w-5 text-green transition-transform {expanded
            ? 'rotate-180'
            : ''}"
        />
      </span>
    </button>

    {#if expanded}
      <div class="rounded-lg border border-green/20 p-3">
        <p class="mb-3 text-xs text-green">
          {locale.t("wallet.tokenInfo.originBackedBy")}
        </p>

        <div class="space-y-3">
          <div class="flex justify-between gap-4">
            <span class="text-black text-sm"
              >{locale.t("wallet.tokenInfo.tokenName")}</span
            >
            <span class="text-right text-sm font-light text-gray-700"
              >{origin.tokenName}</span
            >
          </div>

          <div class="flex justify-between gap-4">
            <span class="text-black text-sm"
              >{locale.t("wallet.tokenInfo.network")}</span
            >
            <span class="text-right text-sm font-light text-gray-700"
              >{origin.network}</span
            >
          </div>

          <div class="flex justify-between gap-4">
            <span class="text-black text-sm"
              >{locale.t("wallet.tokenInfo.protocol")}</span
            >
            <span class="text-right text-sm font-light text-gray-700"
              >{origin.protocol}</span
            >
          </div>

          <div class="flex justify-between gap-4">
            <span class="text-black text-sm">
              {origin.protocol === "Rune"
                ? locale.t("wallet.tokenInfo.runeId")
                : locale.t("wallet.tokenInfo.tokenId")}
            </span>
            <span class="text-right text-sm font-light text-gray-700">
              {origin.protocol === "Rune"
                ? (origin.runeId ?? "-")
                : (origin.tokenId ?? "-")}
            </span>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}
