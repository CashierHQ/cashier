<script lang="ts">
  import {
    AnalyticsEvent,
    trackEvent,
  } from "$modules/analytics/amplitudeStore";
  import { getRouteContext } from "$modules/routing/state/routeContext.svelte";
  import { LinkState } from "$modules/links/types/link/linkState";
  import Ended from "$modules/useLink/components/Ended.svelte";
  import Landing from "$modules/useLink/components/Landing.svelte";
  import { UserLinkStoreV3ViewModelAdapter } from "$modules/useLink/state/adapters/userLinkStoreV3ViewModelAdapter";

  const {
    openLoginModal,
  }: {
    openLoginModal?: (payload?: {
      link_type: string;
      BE_link_id: string;
    }) => void;
  } = $props();

  const context = getRouteContext();
  const userStore = $derived.by(() => {
    const storeV3 = context.userLinkStoreV3;
    if (storeV3) {
      return new UserLinkStoreV3ViewModelAdapter(storeV3);
    }
    return null;
  });

  let loggedOutLandingTracked = $state(false);

  // Track Use landing (logged out) when link data is loaded
  $effect(() => {
    if (userStore && userStore.link && !loggedOutLandingTracked) {
      loggedOutLandingTracked = true;
      trackEvent(AnalyticsEvent.USE_LANDING_LOGGED_OUT, {
        link_type: userStore.link.link_type,
        BE_link_id: userStore.link.id,
      });
    }
  });

  const isEndedWithoutCompletion = $derived(
    userStore?.link?.state === LinkState.INACTIVE_ENDED &&
      !userStore?.completedActions?.length,
  );
</script>

<div class="px-4 pt-4 pb-6">
  <div class="">
    {#if isEndedWithoutCompletion}
      <Ended />
    {:else if userStore}
      <Landing userLink={userStore} {openLoginModal} />
    {/if}
  </div>
</div>
