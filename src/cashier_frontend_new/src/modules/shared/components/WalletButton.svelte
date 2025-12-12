<script lang="ts">
  import { Wallet } from "lucide-svelte";
  import { locale } from "$lib/i18n";

  type Props = {
    onClick?: () => void;
  };

  let { onClick }: Props = $props();
</script>

<button
  onclick={onClick}
  class="rounded-md inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-background shadow-sm hover:bg-accent hover:text-accent-foreground ml-auto p-0 w-9 h-9 mr-3 gap-2"
  style="border: 1px solid rgba(208, 213, 221, 0.5);"
  type="button"
  aria-label={locale.t("links.walletButton.openWallet")}
>
  <Wallet class="w-4 h-4 text-primary" />
</button>
