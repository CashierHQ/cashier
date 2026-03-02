<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { locale } from "$lib/i18n";
  import {
    AnalyticsEvent,
    trackEvent,
  } from "$modules/analytics/amplitudeStore";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { draftLinkService } from "$modules/creationLink/services/draftLink";
  import ProtectedAuth from "$modules/guard/components/ProtectedAuth.svelte";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import AddLinkButton from "$modules/links/components/layout/AddLinkButton.svelte";
  import LinksPage from "$modules/links/pages/LinksPage.svelte";
  import AppHeader from "$modules/shared/components/AppHeader.svelte";
  import { Principal } from "@dfinity/principal";
  import { toast } from "svelte-sonner";

  /**
   * Handle the creation of a new link
   */
  function handleCreateNewLink() {
    try {
      if (!authState.account?.owner) {
        throw new Error("User is not authenticated");
      }
      const creator = Principal.fromText(authState.account.owner);
      const draftLinkResult =
        draftLinkService.createAndPersistDraftLink(creator);
      if (draftLinkResult.isErr()) {
        throw new Error("Failed to create draft link");
      }
      const draftLink = draftLinkResult.unwrap();
      // Track Link list plus (user pressed + button)
      trackEvent(AnalyticsEvent.LINK_CREATION_LINK_LIST_PLUS, {});
      goto(resolve(`/link/create/${draftLink.id}`));
    } catch (error) {
      toast.error(locale.t("links.createLinkError"));
    }
  }
</script>

<RouteGuard>
  <ProtectedAuth>
    <div class="flex flex-col min-h-screen sm:bg-lightgreen bg-white">
      <AppHeader />

      <div
        class="flex-1 sm:py-4 pb-2 flex items-center justify-center flex-col"
      >
        <div
          class="w-full sm:max-w-[600px] max-w-full sm:p-8 px-4 grow-1 bg-white sm:rounded-xl overflow-hidden"
        >
          <div
            class="sm:max-h-[calc(100vh-158px)] max-h-[calc(100vh-78px)] overflow-y-auto scrollbar-hide"
          >
            <LinksPage />
          </div>
        </div>
      </div>

      <AddLinkButton onClick={handleCreateNewLink} />
    </div>
  </ProtectedAuth>
</RouteGuard>
