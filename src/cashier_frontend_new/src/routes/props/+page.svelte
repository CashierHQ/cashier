<script lang="ts">
  import RouteGuard from "$modules/shared/components/guards/RouteGuard.svelte";
  import { GuardType } from "$modules/shared/types/guards";

  interface Props {
    name: string;
    version: number;
    description: string;
  }

  let data: Props = $props();
</script>

<RouteGuard guards={[{ type: GuardType.AUTH }]}>
  <p>
    Project name <code>{data.name}</code>, version <code>{data.version}</code>is {data.description}.
  </p>
</RouteGuard>
