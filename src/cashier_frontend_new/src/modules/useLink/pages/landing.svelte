<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  import { LinkState } from "$modules/links/types/link/linkState";
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

  // Redirect logged-in users to /use route ONLY if link is active
  $effect(() => {
    if (!userProfile.isReady() || userStore.isLoading) return;
    
    if (userProfile.isLoggedIn() && userStore.link) {
      const isLinkActive = userStore.link.state === LinkState.ACTIVE ||
                           userStore.link.state === LinkState.CREATE_LINK ||
                           userStore.link.state === LinkState.INACTIVE;
      
      if (isLinkActive) {
        goto(resolve(`/link/${id}/use`));
      }
    }
  });
</script>

{#if userStore.isLoading}
  Loading...
{:else if userStore.link}
  {#if userStore.link.state === LinkState.INACTIVE_ENDED}
    <Ended />
  {:else}
    <div class="px-4 py-4">
      <div class="mt-4">
        <Landing userLink={userStore} />
      </div>
    </div>
  {/if}
{:else}
  <NotFound />
{/if}
