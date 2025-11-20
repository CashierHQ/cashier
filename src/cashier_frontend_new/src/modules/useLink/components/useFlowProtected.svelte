<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import type { Snippet } from "svelte";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkUserState } from "$modules/links/types/link/linkUserState";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  import type { UserLinkStore } from "../state/userLinkStore.svelte";

  let {
    userStore,
    children,
    linkId,
  }: {
    userStore: UserLinkStore;
    children: Snippet<[]>;
    linkId: string;
  } = $props();

  const landingUrl = resolve(`/link/${linkId}`);
  const useUrl = resolve(`/link/${linkId}/use`);
  const isUsePage = $derived(page.url.pathname === useUrl);

  // Set logout and login handlers
  authState.setOnLogout(() => goto(landingUrl));
  authState.setOnLogin(() => goto(useUrl));

  // Redirect logic:
  // 1. Logged in users go to /use
  // 2. Non-logged in blocked from /use
  // 3. Inactive/ended links only allow completed users to /use
  $effect(() => {
    if (!userProfile.isReady() || userStore.isLoading || !userStore.link)
      return;

    const isLoggedIn = userProfile.isLoggedIn();
    const linkState = userStore.link.state;
    const linkUserState = userStore.query?.data?.link_user_state;
    const isCompleted = linkUserState === LinkUserState.COMPLETED;
    const isLinkActive = linkState === LinkState.ACTIVE;

    // If on /use page and not logged in -> redirect to landing
    if (isUsePage && !isLoggedIn) {
      goto(landingUrl);
      return;
    }

    // If on landing page and logged in
    if (!isUsePage && isLoggedIn) {
      // Active link: allow access to /use
      if (isLinkActive) {
        goto(useUrl);
        return;
      }

      // Inactive/ended link: only completed users go to /use
      if (isCompleted) {
        goto(useUrl);
      }
    }
  });
</script>

{#if userStore?.isLoading}
  <div class="flex items-center justify-center p-8">Loading...</div>
{:else if userStore?.link}
  {@render children()}
{/if}
