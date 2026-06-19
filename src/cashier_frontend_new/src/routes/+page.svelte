<script lang="ts">
  import { page } from "$app/state";
  import Footer from "$modules/home/components/Footer.svelte";
  import Header from "$modules/home/components/Header.svelte";
  import LoginModal from "$modules/home/components/LoginModal.svelte";
  import HomePage from "$modules/home/pages/HomePage.svelte";
  import { buildAuthRedirectInput } from "$modules/routing/inputs/buildAuthRedirectInput";
  import { resolveRedirect } from "$modules/routing/resolvers/resolveRedirect";
  import { createRedirectNavigation } from "$modules/routing/state/createRedirectNavigation.svelte";
  import AppHeader from "$modules/shared/components/AppHeader.svelte";

  let isLoginModalOpen = $state(false);

  function openLoginModal() {
    isLoginModalOpen = true;
  }

  const input = $derived(buildAuthRedirectInput(page.url));
  const decision = $derived(resolveRedirect(input));
  const isLoggedIn = $derived(!!input.currentUserId);

  createRedirectNavigation(() => decision);
</script>

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
