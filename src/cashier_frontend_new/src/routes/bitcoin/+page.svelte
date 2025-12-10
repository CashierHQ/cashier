<script lang="ts">
import RunePage from '$modules/bitcoin/pages/rune.svelte';
import ProtectedAuth from '$modules/guard/components/ProtectedAuth.svelte';
import RouteGuard from '$modules/guard/components/RouteGuard.svelte';
</script>

<RouteGuard>
  <ProtectedAuth>
    <RunePage />
  </ProtectedAuth>
</RouteGuard>