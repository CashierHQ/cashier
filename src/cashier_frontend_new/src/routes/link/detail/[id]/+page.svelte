<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import DetailLink from "$modules/detailLink/pages/detail.svelte";
  import RedirectBoundary from "$modules/routing/components/RedirectBoundary.svelte";
  import { createLinkRouteContext } from "$modules/routing/createLinkRouteContext.svelte";
  import PageLayout from "$modules/shared/components/PageLayout.svelte";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { onMount } from "svelte";

  const id = page.params.id!;
  createLinkRouteContext({ linkId: id, storeType: "linkDetail" });

  const handleBack = async () => {
    goto(resolve("/links"));
  };

  onMount(() => {
    appHeaderStore.setBackHandler(handleBack);

    return () => {
      appHeaderStore.clearBackHandler();
    };
  });
</script>

<RedirectBoundary>
  <PageLayout isLinkFormPage={true}>
    <DetailLink {id} onBack={handleBack} />
  </PageLayout>
</RedirectBoundary>
