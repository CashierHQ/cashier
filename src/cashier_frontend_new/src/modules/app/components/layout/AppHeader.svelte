<script lang="ts">
  import CashierLogo from "$modules/ui/components/CashierLogo.svelte";
  import WalletButton from "./WalletButton.svelte";
  import MenuButton from "./MenuButton.svelte";
  import { resolve } from "$app/paths";

  function handleWalletClick() {
    // TODO: Implement wallet panel opening
    console.log("Open wallet");
  }
</script>

<div
  class="w-full flex justify-between items-center lg:px-8 px-4 py-3 sm:pt-3 pt-4 bg-white"
>
  <CashierLogo href={resolve("/app")} />

  <div class="flex items-center">
    <WalletButton onClick={handleWalletClick} />
    <MenuButton />
  </div>
</div>
