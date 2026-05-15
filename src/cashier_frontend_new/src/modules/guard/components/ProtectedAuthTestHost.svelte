<script lang="ts">
  import ProtectedAuth from "./ProtectedAuth.svelte";

  let {
    requireAuth,
    redirectTo,
  }: { requireAuth?: boolean; redirectTo?: string } = $props();
</script>

<ProtectedAuth {requireAuth} {redirectTo}>
  <div data-testid="child">Child content</div>
</ProtectedAuth>
