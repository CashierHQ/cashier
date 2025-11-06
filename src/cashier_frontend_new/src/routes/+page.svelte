<script lang="ts">
  import Header from "$modules/home/components/Header.svelte";
  import Footer from "$modules/home/components/Footer.svelte";
  import HomePage from "$modules/home/pages/HomePage.svelte";
  import LoginModal from "$modules/home/components/LoginModal.svelte";

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
  <HomePage onLoginClick={openLoginModal} />
  <Footer />
</main>

<LoginModal open={isLoginModalOpen} onOpenChange={(open) => (isLoginModalOpen = open)} />