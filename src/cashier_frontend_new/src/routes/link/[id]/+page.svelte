<script lang="ts">
  import { page } from "$app/state";
  import {
      AnalyticsEvent,
      trackEvent,
  } from "$modules/analytics/amplitudeStore";
  import { authState } from "$modules/auth/state/auth.svelte";
  import Footer from "$modules/home/components/Footer.svelte";
  import Header from "$modules/home/components/Header.svelte";
  import LoginModal from "$modules/home/components/LoginModal.svelte";
  import RedirectBoundary from "$modules/routing/components/RedirectBoundary.svelte";
  import { createLinkRouteContext } from "$modules/routing/state/createLinkRouteContext.svelte";
  import Ended from "$modules/useLink/components/Ended.svelte";
  import Landing from "$modules/useLink/pages/landing.svelte";

  const id = page.params.id!;
  createLinkRouteContext({ linkId: id, storeType: "userLink" });
  const showLogin = $derived(authState.isReady && !authState.isLoggedIn);

  let isLoginModalOpen = $state(false);
  let loginPayload = $state<{ link_type: string; BE_link_id: string } | null>(
    null,
  );

  function openLoginModal(payload?: { link_type: string; BE_link_id: string }) {
    if (payload) loginPayload = payload;
    isLoginModalOpen = true;
  }

  function handleBeforeLogin() {
    if (loginPayload) {
      trackEvent(AnalyticsEvent.USE_LANDING_LOGIN_LOGGED_OUT, loginPayload);
      loginPayload = null;
    }
  }
</script>

<main class="flex flex-col h-screen">
  <RedirectBoundary>
    {#snippet children(decision)}
      <Header
        onLoginClick={openLoginModal}
        showLogin={showLogin &&
          !(decision.kind === "allow" && decision.screen === "linkEnded")}
      />
      {#if decision.kind === "allow" && decision.screen === "linkEnded"}
        <Ended />
      {:else}
        <Landing {openLoginModal} />
      {/if}
    {/snippet}
  </RedirectBoundary>
  <Footer />
</main>

<LoginModal
  open={isLoginModalOpen}
  onOpenChange={(open) => (isLoginModalOpen = open)}
  onBeforeLogin={handleBeforeLogin}
/>
