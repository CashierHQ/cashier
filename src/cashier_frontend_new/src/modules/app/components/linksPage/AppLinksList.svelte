<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { LinkType } from "$modules/links/types/link/linkType";
  import LinkItem from "./LinkItem.svelte";

  // Mock data for testing - replace with actual data from store later
  const mockLinks = [
    {
      id: "local_link_1",
      title: "Choose template state",
      state: "Link_state_choose_link_type",
      date: "2025-01-05T00:00:00.000Z",
      link_type: LinkType.TIP,
    },
    {
      id: "local_link_2",
      title: "Add assets state",
      state: "Link_state_add_assets",
      date: "2025-01-05T00:00:00.000Z",
      link_type: LinkType.AIRDROP,
    },
    {
      id: "local_link_3",
      title: "Preview state",
      state: "Link_state_preview",
      date: "2025-01-05T00:00:00.000Z",
      link_type: LinkType.TOKEN_BASKET,
    },
    {
      id: "local_link_4",
      title: "Create link state",
      state: "Link_state_create_link",
      date: "2025-01-05T00:00:00.000Z",
      link_type: LinkType.TIP,
    },
    {
      id: "local_link_5",
      title: "Active link",
      state: "Link_state_active",
      date: "2025-01-05T00:00:00.000Z",
      link_type: LinkType.RECEIVE_PAYMENT,
    },
    {
      id: "local_link_6",
      title: "Inactive link",
      state: "Link_state_inactive",
      date: "2025-01-05T00:00:00.000Z",
      link_type: LinkType.AIRDROP,
    },
    {
      id: "local_link_7",
      title: "Inactive ended link",
      state: "Link_state_inactive_ended",
      date: "2025-01-05T00:00:00.000Z",
      link_type: LinkType.TOKEN_BASKET,
    },
    {
      id: "local_link_8",
      title: "New link (special)",
      state: "Link_state_create_link",
      date: "2025-01-15T00:00:00.000Z",
      link_type: LinkType.TIP,
    },
  ];

  let hasLinks = $state(true);
  let links = $state(mockLinks);

  const groupedLinks = $derived.by(() => {
    if (!hasLinks || links.length === 0) return [];

    const grouped: Record<string, typeof links> = {};
    for (const link of links) {
      if (!grouped[link.date]) {
        grouped[link.date] = [];
      }
      grouped[link.date].push(link);
    }

    return Object.entries(grouped).map(([date, dateLinks]) => ({
      date,
      links: dateLinks,
    }));
  });

  function handleLinkClick(event: MouseEvent, linkId: string) {
    event.preventDefault();
    goto(resolve(`/app/edit/${linkId}`));
  }

  function formatDate(dateString: string): string {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return dateString;

      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  }
</script>

<div class="flex flex-col w-full">
  <h2 class="text-base font-semibold mt-0">Links created by me</h2>
  <div class="flex flex-col overflow-y-hidden h-full">
    {#if !hasLinks || links.length === 0}
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
                  href={resolve(`/app/edit/${link.id}`)}
                  title={link.title}
                  linkType={link.link_type}
                  state={link.state}
                  onClick={(e) => handleLinkClick(e, link.id)}
                />
              </li>
            {/each}
          </ul>
        {/each}
      </div>
    {/if}
  </div>
</div>
