<script lang="ts">
  import ProtectedAuth from "$modules/guard/components/ProtectedAuth.svelte";

  let {
    requireAuth,
    redirectTo,
  }: { requireAuth?: boolean; redirectTo?: string } = $props();
</script>

<ProtectedAuth {requireAuth} {redirectTo}>
  <div data-testid="child">Child content</div>
</ProtectedAuth>
