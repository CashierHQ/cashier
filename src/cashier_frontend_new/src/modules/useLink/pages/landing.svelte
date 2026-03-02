<script lang="ts">
  import { getGuardContext } from "$modules/guard/context.svelte";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkUserState } from "$modules/links/types/link/linkUserState";
  import Ended from "$modules/useLink/components/Ended.svelte";
  import Landing from "$modules/useLink/components/Landing.svelte";
  import { UserLinkStoreV3ViewModelAdapter } from "$modules/useLink/state/adapters/userLinkStoreV3ViewModelAdapter";
  import { UserLinkStoreViewModelAdapter } from "$modules/useLink/state/adapters/userLinkStoreViewModelAdapter";

  const { openLoginModal }: { openLoginModal?: () => void } = $props();

  const context = getGuardContext();
  const userStore = $derived.by(() => {
    const storeV3 = context.userLinkStoreV3;
    if (storeV3) {
      return new UserLinkStoreV3ViewModelAdapter(storeV3);
    }
    const store = context.userLinkStore;
    if (store) {
      return new UserLinkStoreViewModelAdapter(store);
    }
    return null;
  });

  const isEndedWithoutCompletion = $derived(
    userStore?.link?.state === LinkState.INACTIVE_ENDED &&
      userStore?.link_user_state !== LinkUserState.COMPLETED,
  );
</script>

<div class="px-4 pt-4 pb-6">
  <div class="">
    {#if isEndedWithoutCompletion}
      <Ended />
    {:else if userStore}
      <Landing userLink={userStore} {openLoginModal} />
    {/if}
  </div>
</div>
