<script lang="ts">
  import AppLinksList from "$modules/app/components/linksPage/AppLinksList.svelte";
</script>

<div class="w-full">
  <div class="pb-4">
    <h1 class="text-2xl font-bold">Cashier links</h1>
    <p class="text-sm text-grey mt-3">
      Start creating transaction links with Cashier: create & airdrop NFTs, and more features
      coming!
    </p>
    <button class="text-green text-sm font-bold mt-3 cursor-pointer" type="button">Got it!</button>
  </div>
  
  <AppLinksList />
</div>

