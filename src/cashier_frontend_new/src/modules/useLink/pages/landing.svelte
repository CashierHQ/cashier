<script lang="ts">
  import LoginModal from "$modules/home/components/LoginModal.svelte";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkUserState } from "$modules/links/types/link/linkUserState";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  import Ended from "../components/Ended.svelte";
  import Landing from "../components/Landing.svelte";
  import UseFlowProtected from "../components/useFlowProtected.svelte";
  import UserLinkStore from "../state/userLinkStore.svelte";

  const {
    id,
  }: {
    id: string;
  } = $props();

  const userStore = new UserLinkStore({ id });
  const isEndedWithoutCompletion = $derived(
    userStore.link?.state === LinkState.INACTIVE_ENDED &&
      userStore.query?.data?.link_user_state !== LinkUserState.COMPLETED,
  );
  let isLoginModalOpen = $state(false);

  function openLoginModal() {
    isLoginModalOpen = true;
  }
</script>

<UseFlowProtected {userStore} linkId={id}>
  <div class="px-4 py-4">
    <div class="mt-4">
      {#if isEndedWithoutCompletion}
        <Ended />
      {:else}
        <Landing userLink={userStore} {openLoginModal} />
      {/if}
    </div>
  </div>
</UseFlowProtected>

{#if !userProfile.isLoggedIn()}
  <LoginModal
    open={isLoginModalOpen}
    onOpenChange={(open) => (isLoginModalOpen = open)}
  />
{/if}
