<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Header from "$modules/home/components/Header.svelte";
  import Footer from "$modules/home/components/Footer.svelte";
  import LoginModal from "$modules/home/components/LoginModal.svelte";
  import Landing from "$modules/useLink/pages/landing.svelte";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import ProtectedValidLink from "$modules/guard/components/ProtectedValidLink.svelte";
  import ProtectedUserState from "$modules/guard/components/ProtectedUserState.svelte";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import { authState } from "$modules/auth/state/auth.svelte";

  const id = page.params.id!;

  let isLoginModalOpen = $state(false);

  function openLoginModal() {
    isLoginModalOpen = true;
  }

  // Redirect logged in users to /link/[id]/use
  $effect(() => {
    if (authState.isReady && authState.isLoggedIn) {
      goto(resolve(`/link/${id}/use`));
    }
  });
</script>

<main class="flex flex-col h-screen">
  <Header onLoginClick={openLoginModal} />
  <RouteGuard linkId={id} storeType="userLink">
    <ProtectedValidLink>
      <ProtectedUserState allowedStates={[UserLinkStep.LANDING]}>
        <Landing linkId={id} {openLoginModal} />
      </ProtectedUserState>
    </ProtectedValidLink>
  </RouteGuard>
  <Footer />
</main>

<LoginModal
  open={isLoginModalOpen}
  onOpenChange={(open) => (isLoginModalOpen = open)}
/>
