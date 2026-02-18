<script lang="ts">
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkUserState } from "$modules/links/types/link/linkUserState";
  import Ended from "$modules/useLink/components/Ended.svelte";
  import Landing from "$modules/useLink/components/Landing.svelte";
  import { getGuardContext } from "$modules/guard/context.svelte";

  const {
    linkId,
    openLoginModal,
  }: { linkId: string; openLoginModal?: () => void } = $props();

  const guardContext = getGuardContext();
  const userStore = guardContext.userLinkStore;

  if (!userStore) {
    throw new Error("userLinkStore not found in context");
  }
  const isEndedWithoutCompletion = $derived(
    userStore?.link?.state === LinkState.INACTIVE_ENDED &&
      userStore?.query?.data?.link_user_state !== LinkUserState.COMPLETED,
  );
</script>

<div class="px-4 pt-4 pb-6">
  <div class="">
    {#if isEndedWithoutCompletion}
      <Ended />
    {:else}
      <Landing userLink={userStore} {openLoginModal} />
    {/if}
  </div>
</div>
