<script lang="ts">
  import { page } from "$app/state";
  import UseLink from "$modules/useLink/pages/use.svelte";
  import Ended from "$modules/useLink/components/Ended.svelte";
  import PageLayout from "$modules/shared/components/PageLayout.svelte";
  import RedirectBoundary from "$modules/routing/components/RedirectBoundary.svelte";
  import { createLinkRouteContext } from "$modules/routing/createLinkRouteContext.svelte";

  const id = page.params.id!;
  createLinkRouteContext({ linkId: id, storeType: "userLink" });

  // Track isLink state - false for ADDRESS_UNLOCKED step
  let isLink = $state(true);
  let showFooter = $state(false);

  const handleIsLinkChange = (newIsLink: boolean) => {
    isLink = newIsLink;
  };

  const handleShowFooterChange = (newShowFooter: boolean) => {
    showFooter = newShowFooter;
  };
</script>

<RedirectBoundary>
  {#snippet children(decision)}
    <PageLayout isLinkFormPage={true} {isLink} {showFooter}>
      {#if decision.kind === "allow" && decision.screen === "linkEnded"}
        <Ended />
      {:else}
        <UseLink
          onIsLinkChange={handleIsLinkChange}
          onShowFooterChange={handleShowFooterChange}
        />
      {/if}
    </PageLayout>
  {/snippet}
</RedirectBoundary>
