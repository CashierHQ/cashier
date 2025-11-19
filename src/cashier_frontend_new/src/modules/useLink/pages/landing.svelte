<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkUserState } from "$modules/links/types/link/linkUserState";
  import Landing from "../components/Landing.svelte";
  import UserLinkStore from "../state/userLinkStore.svelte";
  import Ended from "../components/Ended.svelte";
  import NotFound from "../components/NotFound.svelte";

  const {
    id,
  }: {
    id: string;
  } = $props();

  const userStore = new UserLinkStore({ id });
  let isRedirecting = $state(false);

  // Redirect logged-in users to /use route if:
  // 1. Link is active, OR
  // 2. Link is ended BUT user has completed (to show Completed component)
  $effect(() => {
    if (!userProfile.isReady() || userStore.isLoading) return;

    if (userProfile.isLoggedIn() && userStore.link) {
      const isLinkActive =
        userStore.link.state === LinkState.ACTIVE;

      const isEndedButCompleted =
        userStore.link.state === LinkState.INACTIVE_ENDED &&
        userStore.query.data?.link_user_state === LinkUserState.COMPLETED;

      if (isLinkActive || isEndedButCompleted) {
        isRedirecting = true;
        goto(resolve(`/link/${id}/use`));
      }
    }
  });
</script>

{#if userStore.isLoading || isRedirecting}
  Loading...
{:else if !userStore.link}
  <NotFound />
{:else}
  {@const isEndedWithoutCompletion = 
    userStore.link.state === LinkState.INACTIVE_ENDED && 
    userStore.query.data?.link_user_state !== LinkUserState.COMPLETED}
  
  {#if isEndedWithoutCompletion}
    <Ended />
  {:else}
    <div class="px-4 py-4">
      <div class="mt-4">
        <Landing userLink={userStore} />
      </div>
    </div>
  {/if}
{/if}
