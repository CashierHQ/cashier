<script lang="ts">
  import AssetList from "./assetList.svelte";
  import type { Link } from "../../types/link/link";

  interface Props {
    link: Link;
  }

  let { link }: Props = $props();
</script>

<div class="text-sm text-muted-foreground mb-2">Usage info</div>

<div class="bg-card border rounded-lg p-4 mb-4">
  <div class="space-y-3 text-sm">
    <div class="flex items-center justify-between">
      <div class="text-xs text-muted-foreground">Assets in link</div>
      <AssetList assetInfo={link.asset_info} />
    </div>

    <div class="flex items-center justify-between">
      <div class="text-xs text-muted-foreground">Used</div>
      <div class="font-medium">
        {String(link.link_use_action_counter)}
      </div>
    </div>
  </div>
</div>
