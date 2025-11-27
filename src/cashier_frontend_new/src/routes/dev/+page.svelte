<script lang="ts">
  import BuildInfo from "$modules/dev/components/buildInfo.svelte";
  import RouteGuard from "$modules/shared/components/guards/RouteGuard.svelte";
  import { GuardType } from "$modules/shared/types/guards";
</script>

<RouteGuard guards={[{ type: GuardType.AUTH }]}>
  <BuildInfo />
</RouteGuard>
