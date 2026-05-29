<script lang="ts">
  import { e2eScreenLabels } from "$modules/routing/e2eRedirectInput";
  import type { RouteScreen } from "$modules/routing/types";

  let {
    screen,
    linkId = null,
  }: {
    screen: RouteScreen;
    linkId?: string | null;
  } = $props();
</script>

<section data-testid="e2e-redirect-screen">
  <p>Screen: {e2eScreenLabels[screen]}</p>
  {#if linkId}
    <p>Link id: {linkId}</p>
  {/if}
</section>
