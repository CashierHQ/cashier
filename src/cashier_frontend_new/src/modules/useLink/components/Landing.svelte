<script lang="ts">
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  import type UserLinkStore from "$modules/useLink/state/userLinkStore.svelte";
  import AssetList from "./AssetList.svelte";
  import Header from "./Header.svelte";

  const {
    userLink,
    openLoginModal,
  }: {
    userLink: UserLinkStore;
    openLoginModal?: () => void;
  } = $props();
</script>

{#if userLink.linkDetail?.query.isLoading}
  Loading...
{/if}

<div class="p-4 border rounded">
  {#if userLink.linkDetail?.link}
    <Header title={userLink.linkDetail.link.title} />
    <AssetList assetInfo={userLink.linkDetail.link.asset_info} />
  {/if}

  <h2 class="text-lg font-semibold">Landing</h2>
  <p class="text-sm text-gray-600">
    Welcome — choose to continue to unlock or to the locked flow.
  </p>

  {#if userProfile.isLoggedIn()}
    <div class="mt-4 flex gap-2">
      <button
        class="px-3 py-1 bg-blue-600 text-white rounded"
        onclick={() => userLink.goNext()}
      >
        Next
      </button>
    </div>
  {:else}
    <div class="mt-4 flex gap-2">
      <button
        class="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        onclick={openLoginModal}
      >
        Login to Continue
      </button>
    </div>
  {/if}
</div>
