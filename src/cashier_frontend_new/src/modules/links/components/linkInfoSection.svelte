<script lang="ts">
  import { statusBadge } from "../utils/statusBadge";
  import AssetList from "./assetList.svelte";
  import type { Link } from "../types/link/link";
  import { LinkType } from "../types/link/linkType";
    import { assertUnreachable } from "$lib/rsMatch";

  interface Props {
    link: Link;
  }

  let { link }: Props = $props();

  // Get link type display text
  function getLinkTypeText(linkType: LinkType): string {
    switch (linkType) {
      case LinkType.TIP:
        return "Send Tip";
      case LinkType.AIRDROP:
        return "Send Airdrop";
      case LinkType.RECEIVE_PAYMENT:
        return "Receive Payment";
      case LinkType.TOKEN_BASKET:
        return "Send Token Basket";
      default:
        assertUnreachable(linkType as never);
    }
  }

  const linkTypeText = $derived(getLinkTypeText(link.link_type));
</script>

<div class="text-sm text-muted-foreground mb-2">Link info</div>

<div class="bg-card border rounded-lg p-4 mb-4">
  <div class="space-y-3 text-sm">
    <div class="flex items-center justify-between">
      <div class="text-xs text-muted-foreground">Status</div>
      <div class="font-medium">
        <span class={`${statusBadge(link.state).classes}`}>
          {statusBadge(link.state).text}
        </span>
      </div>
    </div>

    <div class="flex items-center justify-between">
      <div class="text-xs text-muted-foreground">Type</div>
      <div class="font-medium">{linkTypeText}</div>
    </div>

    <div class="flex items-center justify-between">
      <div class="text-xs text-muted-foreground">User pays</div>
      <div class="font-medium">-</div>
    </div>

    <div class="flex items-center justify-between">
      <div class="text-xs text-muted-foreground">Asset per claim</div>
      <AssetList assetInfo={link.asset_info} />
    </div>

    <div class="flex items-center justify-between">
      <div class="text-xs text-muted-foreground">Max use</div>
      <div class="font-medium">
        {String(link.link_use_action_max_count)}
      </div>
    </div>
  </div>
</div>
