<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import type { UserLinkStore } from "../state/userLinkStore.svelte";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import { LinkUserState } from "$modules/links/types/link/linkUserState";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  import type { Snippet } from "svelte";
  import { authState } from "$modules/auth/state/auth.svelte";

  let {
    userStore,
    children,
    linkId,
  }: {
    userStore: UserLinkStore;
    children: Snippet<[]>;
    linkId: string;
  } = $props();

  const isLandingPage = $derived(page.url.pathname.endsWith(`/link/${linkId}`));

  const allowedSteps = $derived(
    isLandingPage
      ? [UserLinkStep.LANDING]
      : [
          UserLinkStep.LANDING,
          UserLinkStep.ADDRESS_UNLOCKED,
          UserLinkStep.ADDRESS_LOCKED,
          UserLinkStep.GATE,
          UserLinkStep.COMPLETED,
        ],
  );

  $effect(() => {
    if (!userStore || !userStore.link) return;
    if (!userProfile.isReady() || userStore.isLoading) return;

    const currentStep = userStore.state.step;
    const linkUserState = userStore.query?.data?.link_user_state;
    const linkState = userStore.link.state;
    const isLoggedIn = userProfile.isLoggedIn();

    authState.setOnLogout(() => {
      goto(resolve(`/link/${linkId}`));
    });

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
    const isAllowedStep = allowedSteps.includes(currentStep);

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

{#if allowedSteps.includes(userStore.state.step)}
  {@render children()}
{/if}
