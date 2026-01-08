<script lang="ts">
  import { locale } from "$lib/i18n";
  import TokenItem from "$modules/creationLink/components/shared/TokenItem.svelte";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";

  interface Props {
    tokens: TokenWithPriceAndBalance[];
    balanceVisible: boolean;
    onSelectToken: (address: string) => void;
    onImageError: (address: string) => void;
    failedImageLoads: Set<string>;
  }

  let {
    tokens,
    balanceVisible,
    onSelectToken,
    onImageError,
    failedImageLoads,
  }: Props = $props();
</script>
<div>
  {#if tokens.length > 0}
    <div class="text-center py-8">
      <p class="text-gray-500 mb-4">
        {locale.t("wallet.noTokensMsg")}
      </p>
    </div>
  {:else}
    <ul class="space-y-0">
      {#each tokens as token (token.address)}
        <TokenItem
          {token}
          onSelect={onSelectToken}
          {failedImageLoads}
          onImageError={onImageError}
          isBalanceHidden={!balanceVisible}
        />
      {/each}
  </ul>
  {/if}
</div>