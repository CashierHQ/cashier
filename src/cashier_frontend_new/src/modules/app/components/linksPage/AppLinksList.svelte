<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import LinkItem from "./LinkItem.svelte";
  import { formatDate } from "$modules/shared/utils/formatDate";
  import type { GroupedLink } from "$modules/links/types/linkList";

  const {
    groupedLinks,
  }: {
    groupedLinks: GroupedLink[];
  } = $props();

  function handleLinkClick(linkId: string, isTempLink: boolean) {
    if (isTempLink) {
      goto(resolve(`/app/create/${linkId}`));
    } else {
      goto(resolve(`/link/detail/${linkId}`));
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
          <ul class="space-y-4">
            {#each group.links as link (link.id)}
              <li>
                <LinkItem
                  {link}
                  onClick={() => handleLinkClick(link.id, true)}
                />
              </li>
            {/each}
          </ul>
        {/each}
      </div>
    {/if}
  </div>
</div>
