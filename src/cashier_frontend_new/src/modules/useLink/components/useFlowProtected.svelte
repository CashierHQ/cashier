<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import type { Snippet } from "svelte";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkUserState } from "$modules/links/types/link/linkUserState";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
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

  const USE_PAGE_STEPS = [
    UserLinkStep.LANDING,
    UserLinkStep.ADDRESS_UNLOCKED,
    UserLinkStep.ADDRESS_LOCKED,
    UserLinkStep.GATE,
    UserLinkStep.COMPLETED,
  ];

  const isLandingPage = $derived(page.url.pathname.endsWith(`/link/${linkId}`));
  const allowedSteps = $derived(
    isLandingPage ? [UserLinkStep.LANDING] : USE_PAGE_STEPS,
  );

  const userlandingUrl = resolve(`/link/${linkId}`);
  const useUrl = resolve(`/link/${linkId}/use`);
  const landingUrl = resolve("/");

  // Set logout redirect to landing page
  $effect(() => {
    authState.setOnLogout(() => goto(userlandingUrl));
  });

  // Redirect logic based on link and user state
  $effect(() => {
    if (!userStore?.link || !userProfile.isReady() || userStore.isLoading) {
      return;
    }

    const { step: currentStep } = userStore.state;
    const linkUserState = userStore.query?.data?.link_user_state;
    const linkState = userStore.link.state;
    const isLoggedIn = userProfile.isLoggedIn();
    const isCompleted = linkUserState === LinkUserState.COMPLETED;
    const isLinkInactive =
      linkState === LinkState.INACTIVE ||
      linkState === LinkState.INACTIVE_ENDED;

    if (isLandingPage) {
      handleLandingPageRedirect({
        isLoggedIn,
        linkState,
        isCompleted,
        isLinkInactive,
      });
    } else {
      handleUsePageRedirect({ currentStep, linkState, isCompleted });
    }
  });

  // Redirect to /use page if conditions are met
  // condition 1: user is logged
  // condition 2: link is active OR link is inactive/ended but user has completed it
  function handleLandingPageRedirect({
    isLoggedIn,
    linkState,
    isCompleted,
    isLinkInactive,
  }: {
    isLoggedIn: boolean;
    linkState: LinkState;
    isCompleted: boolean;
    isLinkInactive: boolean;
  }): void {
    if (!isLoggedIn) return;

    const shouldRedirectToUse =
      linkState === LinkState.ACTIVE || (isLinkInactive && isCompleted);

    if (shouldRedirectToUse) {
      goto(useUrl);
    }
  }

  // Redirect logic for /use page
  // condition 1: current step is allowed
  // condition 2: user cannot access completed step without completing the link
  function handleUsePageRedirect({
    currentStep,
    linkState,
    isCompleted,
  }: {
    currentStep: UserLinkStep;
    linkState: LinkState;
    isCompleted: boolean;
  }): void {
    const isStepAllowed = allowedSteps.includes(currentStep);
    const isUnauthorizedCompleted =
      currentStep === UserLinkStep.COMPLETED && !isCompleted;

    if (!isStepAllowed || isUnauthorizedCompleted) {
      goto(landingUrl);
      return;
    }

    if (linkState === LinkState.INACTIVE_ENDED && !isCompleted) {
      goto(userlandingUrl);
    }
  }
</script>

{#if userStore?.link && allowedSteps.includes(userStore.state.step)}
  {@render children()}
{:else if userStore?.isLoading}
  <div class="flex items-center justify-center p-8">Loading...</div>
{/if}
