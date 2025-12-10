<script lang="ts">
import DispenserPage from '$modules/bitcoin/pages/dispenser.svelte';
import ProtectedAuth from '$modules/guard/components/ProtectedAuth.svelte';
import RouteGuard from '$modules/guard/components/RouteGuard.svelte';
</script>

<RouteGuard>
  <ProtectedAuth>
    <DispenserPage />
  </ProtectedAuth>
</RouteGuard>