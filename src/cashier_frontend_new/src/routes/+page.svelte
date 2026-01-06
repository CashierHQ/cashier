<script lang="ts">
  import AppHeader from "$modules/shared/components/AppHeader.svelte";
  import Header from "$modules/home/components/Header.svelte";
  import Footer from "$modules/home/components/Footer.svelte";
  import HomePage from "$modules/home/pages/HomePage.svelte";
  import LoginModal from "$modules/home/components/LoginModal.svelte";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";

  let isLoginModalOpen = $state(false);

  function openLoginModal() {
    isLoginModalOpen = true;
  }

  const isLoggedIn = $derived(userProfile.isLoggedIn());

  // Redirect logged in users to /links
  $effect(() => {
    if (authState.isReady && authState.isLoggedIn) {
      goto(resolve("/links"));
    }
  });
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
