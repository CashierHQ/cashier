<script lang="ts">
  import { page } from "$app/state";
  import {
    AnalyticsEvent,
    trackEvent,
  } from "$modules/analytics/amplitudeStore";
  import CreateLink from "$modules/creationLink/pages/create.svelte";
  import RedirectBoundary from "$modules/routing/components/RedirectBoundary.svelte";
  import { createLinkRouteContext } from "$modules/routing/state/createLinkRouteContext.svelte";
  import PageLayout from "$modules/shared/components/PageLayout.svelte";

  const id = page.params.id!;
  createLinkRouteContext({ draftLinkId: id });

  // Track Link creation landing (page load of landing page)
  trackEvent(AnalyticsEvent.LINK_CREATION_LANDING);
</script>

<RedirectBoundary>
  <PageLayout isLinkFormPage={true}>
    <div class="w-full grow-1 flex flex-col">
      <CreateLink />
    </div>
  </PageLayout>
</RedirectBoundary>
