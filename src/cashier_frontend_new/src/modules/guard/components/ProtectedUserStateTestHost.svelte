<script lang="ts">
  import type { UserLinkStep } from "$modules/links/types/userLinkStep";
  import ProtectedUserState from "./ProtectedUserState.svelte";

  let { allowedStates }: { allowedStates: UserLinkStep[] } = $props();
</script>

<ProtectedUserState {allowedStates}>
  <div data-testid="child">Child content</div>
</ProtectedUserState>
