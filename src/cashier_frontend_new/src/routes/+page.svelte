<script lang="ts">
  import AppHeader from "$modules/shared/components/AppHeader.svelte";
  import Header from "$modules/home/components/Header.svelte";
  import Footer from "$modules/home/components/Footer.svelte";
  import HomePage from "$modules/home/pages/HomePage.svelte";
  import LoginModal from "$modules/home/components/LoginModal.svelte";
  import { buildAuthRedirectInput } from "$modules/routing/buildAuthRedirectInput";
  import E2ERedirectScreen from "$modules/routing/components/E2ERedirectScreen.svelte";
  import { isE2ERedirectEnabled } from "$modules/routing/e2eRedirectInput";
  import { resolveRedirect } from "$modules/routing/resolveRedirect";
  import { useRedirectNavigation } from "$modules/routing/useRedirectNavigation.svelte";
  import { page } from "$app/state";

  let isLoginModalOpen = $state(false);

  function openLoginModal() {
    isLoginModalOpen = true;
  }

  const input = $derived(buildAuthRedirectInput(page.url));
  const decision = $derived(resolveRedirect(input));
  const isLoggedIn = $derived(!!input.currentUserId);
  const showE2EMarker = $derived(isE2ERedirectEnabled(page.url));

  useRedirectNavigation(() => decision);
</script>

{#if decision.kind === "allow" && showE2EMarker}
  <E2ERedirectScreen screen={decision.screen ?? "home"} />
{:else}
  <main class="flex flex-col h-screen">
    {#if isLoggedIn}
      <AppHeader />
    {:else}
      <Header onLoginClick={openLoginModal} />
    {/if}
    <HomePage onLoginClick={openLoginModal} />
    <Footer />
  </main>

  <LoginModal
    open={isLoginModalOpen}
    onOpenChange={(open) => (isLoginModalOpen = open)}
  />
{/if}
