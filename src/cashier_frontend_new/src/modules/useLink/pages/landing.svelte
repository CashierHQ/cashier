<script lang="ts">
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkUserState } from "$modules/links/types/link/linkUserState";
  import Ended from "$modules/useLink/components/Ended.svelte";
  import Landing from "$modules/useLink/components/Landing.svelte";
  import { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";
  import { trackEvent, AnalyticsEvent } from "$modules/analytics/amplitudeStore";

  const {
    linkId,
    openLoginModal,
  }: {
    linkId: string;
    openLoginModal?: (payload?: { link_type: string; BE_link_id: string }) => void;
  } = $props();

  const userStore = new UserLinkStore({ id: linkId });
  let loggedOutLandingTracked = $state(false);

  // Track Use landing (logged out) when link data is loaded
  $effect(() => {
    const link = userStore.linkDetail?.link;
    if (link && !loggedOutLandingTracked) {
      loggedOutLandingTracked = true;
      trackEvent(AnalyticsEvent.USE_LANDING_LOGGED_OUT, {
        link_type: link.link_type,
        BE_link_id: linkId,
      });
    }
  });

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
