<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import LinkItem from "$modules/links/components/linksPage/LinkItem.svelte";
  import type {
    GroupedLink,
    UnifiedLinkItem,
  } from "$modules/links/types/linkList";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { formatDate } from "$modules/shared/utils/formatDate";

  const {
    groupedLinks,
  }: {
    groupedLinks: GroupedLink[];
  } = $props();

  function handleLinkClick(link: UnifiedLinkItem) {
    const openCreateFlow =
      !link.isCreated || link.state === LinkState.CREATE_LINK;
    if (openCreateFlow) {
      goto(resolve(`/link/create/${link.id}`));
    } else {
      goto(resolve(`/link/detail/${link.id}`));
    }
  }
</script>

<div class="flex flex-col w-full">
  <h2 class="text-base font-semibold mt-0">Links created by me</h2>
  <div class="flex flex-col overflow-y-hidden h-full">
    {#if groupedLinks.length === 0}
      <p class="text-sm text-grey mt-3">There is no links yet.</p>
    {:else}
      <div class="space-y-4 mt-4">
        {#each groupedLinks as group (group.date)}
          <h3 class="text-lightblack/80 font-normal mb-2 text-[14px]">
            {formatDate(group.date)}
          </h3>
          <ul>
            {#each group.links as link (link.id)}
              <li>
                <LinkItem {link} onClick={() => handleLinkClick(link)} />
              </li>
            {/each}
          </ul>
        {/each}
      </div>
    {/if}
  </div>
</div>
