<script lang="ts">
  import ProtectedLinkOwner from "$modules/guard/components/ProtectedLinkOwner.svelte";

  let {
    mustBeOwner,
    redirectTo,
  }: { mustBeOwner?: boolean; redirectTo?: string } = $props();
</script>

<ProtectedLinkOwner {mustBeOwner} {redirectTo}>
  <div data-testid="child">Child content</div>
</ProtectedLinkOwner>
