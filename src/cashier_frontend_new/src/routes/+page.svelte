<script lang="ts">
  import Header from "$modules/shared/components/layout/Header.svelte";
  import Footer from "$modules/shared/components/layout/Footer.svelte";
  import HomeContent from "$modules/shared/components/HomeContent.svelte";
  import LoginModal from "$modules/shared/components/modal/LoginModal.svelte";

  let isLoginModalOpen = $state(false);

  function openLoginModal() {
    isLoginModalOpen = true;
  }

  function closeLoginModal() {
    isLoginModalOpen = false;
  }
</script>

<main class="flex flex-col h-screen">
  <Header onLoginClick={openLoginModal} />
  <HomeContent onLoginClick={openLoginModal} />
  <Footer />
</main>

<LoginModal open={isLoginModalOpen} onOpenChange={(open) => (isLoginModalOpen = open)} />