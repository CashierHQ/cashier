<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import type { UserLinkStore } from "../state/userLinkStore.svelte";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import { LinkUserState } from "$modules/links/types/link/linkUserState";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";

  let {
    userStore,
    allowSteps,
    children,
    linkId,
  }: {
    userStore: UserLinkStore;
    allowSteps: UserLinkStep[];
    children: import("svelte").Snippet<[]>;
    linkId: string;
  } = $props();

  const isLandingPage = $derived(page.url.pathname.endsWith(`/link/${linkId}`));

  $effect(() => {
    if (!userStore || !allowSteps || !userStore.link) return;
    if (!userProfile.isReady() || userStore.isLoading) return;

    const currentStep = userStore.state.step;
    const linkUserState = userStore.query?.data?.link_user_state;
    const linkState = userStore.link.state;
    const isLoggedIn = userProfile.isLoggedIn();

    // Landing page logic
    if (isLandingPage) {
      // Not logged in users stay on landing page
      if (!isLoggedIn) return;

      // Logged in users redirect to /use based on link state
      if (linkState === LinkState.ACTIVE) {
        goto(resolve(`/link/${linkId}/use`));
        return;
      }

      // Inactive/ended links: completed users go to /use, others stay on landing
      if (
        (linkState === LinkState.INACTIVE ||
          linkState === LinkState.INACTIVE_ENDED) &&
        linkUserState === LinkUserState.COMPLETED
      ) {
        goto(resolve(`/link/${linkId}/use`));
        return;
      }

      return;
    }

    // Use page logic - validate access
    const isAllowedStep = allowSteps.includes(currentStep);

    // Prevent accessing COMPLETED step without participation
    const isUnauthorizedCompletedAccess =
      currentStep === UserLinkStep.COMPLETED &&
      linkUserState !== LinkUserState.COMPLETED;

    if (!isAllowedStep || isUnauthorizedCompletedAccess) {
      goto(resolve("/links"));
      return;
    }

    // Redirect to landing if link ended and user hasn't completed
    if (
      linkState === LinkState.INACTIVE_ENDED &&
      linkUserState !== LinkUserState.COMPLETED
    ) {
      goto(resolve(`/link/${linkId}`));
    }
  });
</script>

{#if allowSteps.includes(userStore.state.step)}
  {@render children()}
{/if}
