<script lang="ts">
  import BuildInfo from "$modules/dev/components/buildInfo.svelte";
  import RouteGuard from "$modules/shared/components/guards/RouteGuard.svelte";
  import { GuardType } from "$modules/shared/components/guards/types";
</script>

<RouteGuard guards={[{ type: GuardType.AUTH }]}>
  <BuildInfo />
</RouteGuard>
