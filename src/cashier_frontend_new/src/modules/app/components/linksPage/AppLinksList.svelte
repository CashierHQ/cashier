<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import LinkItem from "./LinkItem.svelte";
  import { formatDate } from "$modules/shared/utils/formatDate";
  import type { GroupedLink } from "$modules/links/types/linkList";
  import { Link } from "$modules/links/types/link/link";
  import { TempLink } from "$modules/links/types/tempLink";

  const {
    groupedLinks,
  }: {
    groupedLinks: GroupedLink[];
  } = $props();

  function handleLinkClick(linkId: string, isTempLink: boolean) {
    if (isTempLink) {
      goto(resolve(`/app/create/${linkId}`));
    } else {
      goto(resolve(`/app/edit/${linkId}`));
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
                {#if link instanceof Link}
                  <!-- It's a Link -->
                  <LinkItem
                    {link}
                    onClick={() => handleLinkClick(link.id, false)}
                  />
                {:else if link instanceof TempLink}
                  <!-- It's a TempLink (Draft) -->
                  <LinkItem
                    {link}
                    onClick={() => handleLinkClick(link.id, true)}
                  />
                {:else}
                  <div>Unknown link type</div>
                {/if}
              </li>
            {/each}
          </ul>
        {/each}
      </div>
    {/if}
  </div>
</div>
