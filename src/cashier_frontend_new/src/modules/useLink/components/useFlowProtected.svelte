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

  // Track when redirect logic has finished evaluating
  let isRedirectCheckComplete = $state(false);

  // Set logout and login handlers
  authState.setOnLogout(() => goto(landingUrl));
  authState.setOnLogin(() => goto(useUrl));

  // Redirect logic:
  // 1. Logged in users go to /use
  // 2. Non-logged in blocked from /use
  // 3. Inactive/ended links only allow completed users to /use
  $effect(() => {
    // Reset redirect check when dependencies change
    isRedirectCheckComplete = false;

    // Wait for user profile, query, and auth to be ready
    if (!userProfile.isReady() || userStore.isLoading || !authState.isReady) {
      return;
    }

    // If query finished but no link exists, redirect
    if (!userStore.link) {
      goto(resolve("/links"));
      return;
    }

    const isLoggedIn = userProfile.isLoggedIn();
    const linkState = userStore.link.state;
    const linkUserState = userStore.query?.data?.link_user_state;
    const isCompleted = linkUserState === LinkUserState.COMPLETED;
    const isLinkActive = linkState === LinkState.ACTIVE;
    const isLinkInactive =
      linkState === LinkState.INACTIVE ||
      linkState === LinkState.INACTIVE_ENDED;

    // Rule 2: Non-logged in users blocked from /use -> redirect to landing
    if (isUsePage && !isLoggedIn) {
      goto(landingUrl);
      return;
    }

    // Rule 3: If on /use page with inactive/ended link and NOT completed -> redirect to landing
    if (isUsePage && isLoggedIn && isLinkInactive && !isCompleted) {
      goto(landingUrl);
      return;
    }

    // Rule 1: If on landing page and logged in
    if (!isUsePage && isLoggedIn) {
      // Active link: logged in users should use the link
      if (isLinkActive) {
        goto(useUrl);
        return;
      }

      // Inactive/ended link: only completed users go to /use
      if (isLinkInactive && isCompleted) {
        goto(useUrl);
        return;
      }
    }

    // All redirect checks passed, mark as complete
    isRedirectCheckComplete = true;
  });
</script>

{#if !isRedirectCheckComplete || userStore.isLoading}
  <div class="flex items-center justify-center p-8">Loading...</div>
{:else if userStore.link}
  {@render children()}
{:else}
  <div class="flex items-center justify-center p-8">Loading...</div>
{/if}
