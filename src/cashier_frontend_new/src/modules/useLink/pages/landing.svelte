<script lang="ts">
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkUserState } from "$modules/links/types/link/linkUserState";
  import Ended from "../components/Ended.svelte";
  import Landing from "../components/Landing.svelte";
  import UserLinkStore from "../state/userLinkStore.svelte";

  const {
    linkId,
    openLoginModal,
  }: { linkId: string; openLoginModal?: () => void } = $props();

  const userStore = new UserLinkStore({ id: linkId });
  const isEndedWithoutCompletion = $derived(
    userStore.link?.state === LinkState.INACTIVE_ENDED &&
      userStore.query?.data?.link_user_state !== LinkUserState.COMPLETED,
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
