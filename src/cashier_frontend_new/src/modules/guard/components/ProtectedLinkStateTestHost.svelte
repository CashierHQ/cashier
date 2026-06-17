<script lang="ts">
  import type { LinkStep } from "$modules/links/types/linkStep";
  import ProtectedLinkState from "$modules/guard/components/ProtectedLinkState.svelte";

  let { allowedStates }: { allowedStates?: LinkStep[] } = $props();
</script>

<ProtectedLinkState {allowedStates}>
  <div data-testid="child">Child content</div>
</ProtectedLinkState>
