<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { authState } from "$modules/auth/state/auth.svelte";
    import Footer from "$modules/home/components/Footer.svelte";
    import Header from "$modules/home/components/Header.svelte";
    import LoginModal from "$modules/home/components/LoginModal.svelte";
    import HomePage from "$modules/home/pages/HomePage.svelte";
  import tempLinkService from "$modules/links/services/tempLinkService";
  import { CreateLinkData } from "$modules/links/types/createLinkData";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkType } from "$modules/links/types/link/linkType";
  import type TempLink from "$modules/links/types/tempLink";

  const handleCreateLink = () => {
    if (!authState.account) {
      alert("You must be logged in to create a link.");
      return;
    }
    const id = Date.now().toString();
    const tempLink: TempLink = {
      id,
      create_at: BigInt(Date.now()),
      state: LinkState.CHOOSING_TYPE,
      createLinkData: new CreateLinkData({
        title: "",
        linkType: LinkType.TIP,
        assets: [],
        maxUse: 1,
      }),
    };
    tempLinkService.create(id, tempLink, authState.account.owner);
    goto(resolve("/link/create"));
  };

  let isLoginModalOpen = $state(false);

  function openLoginModal() {
    isLoginModalOpen = true;
  }
</script>

<main class="flex flex-col h-screen">
  <Header onLoginClick={openLoginModal} />
  <HomePage onLoginClick={openLoginModal} />
  <Footer />
</main>

<LoginModal
  open={isLoginModalOpen}
  onOpenChange={(open) => (isLoginModalOpen = open)}
/>
