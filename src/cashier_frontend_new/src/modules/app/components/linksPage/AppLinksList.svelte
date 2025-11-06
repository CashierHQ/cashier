<script lang="ts">
  import { goto } from "$app/navigation";
  import { LinkType, type LinkTypeValue } from "$modules/links/types/link/linkType";
  import { LinkState } from "$modules/links/types/link/linkState";

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
    goto(`/app/edit/${linkId}` as any);
  }

  const STATE_ORDER_ARRAY = [
    "Link_state_add_assets",
    "Link_state_choose_link_type",
    "Link_state_preview",
    "Link_state_create_link",
    "Link_state_active",
    "Link_state_inactive",
    "Link_state_inactive_ended",
  ];

  function mapStringToLinkState(state: string): string {
    switch (state) {
      case "Link_state_choose_link_type":
        return "Link_state_choose_link_type";
      case "Link_state_add_assets":
        return "Link_state_add_assets";
      case "Link_state_preview":
        return "Link_state_preview";
      case "Link_state_create_link":
        return "Link_state_create_link";
      case "Link_state_active":
        return "Link_state_active";
      case "Link_state_inactive":
        return "Link_state_inactive";
      case "Link_state_inactive_ended":
        return "Link_state_inactive_ended";
      default:
        return state;
    }
  }

  function mapStringToStateIndex(state: string): number {
    
    const mappedState = mapStringToLinkState(state);
    const exactIndex = STATE_ORDER_ARRAY.indexOf(mappedState);
    if (exactIndex !== -1) {
      return exactIndex;
    }
    
    if (state === LinkState.CREATE_LINK || mappedState === "Link_state_create_link") {
      return 3;
    }
    
    if (state === LinkState.ACTIVE || mappedState === "Link_state_active") {
      return 4;
    }
    
    if (state === LinkState.INACTIVE || mappedState === "Link_state_inactive") {
      return 5;
    }
    
    if (state === LinkState.INACTIVE_ENDED || mappedState === "Link_state_inactive_ended") {
      return 6;
    }
    
    return -1; 
  }

  function getStatusLabel(state: string): string {
    const mappedState = mapStringToLinkState(state);
    
    if (mappedState === "Link_state_choose_link_type" ||
        mappedState === "Link_state_add_assets" ||
        mappedState === "Link_state_preview" ||
        mappedState === "Link_state_create_link" ||
        state === LinkState.CREATE_LINK) {
      return "Draft";
    }
    
    if (mappedState === "Link_state_active" || state === LinkState.ACTIVE) {
      return "Active";
    }
    
    if (mappedState === "Link_state_inactive" || state === LinkState.INACTIVE) {
      return "Inactive";
    }
    
    if (mappedState === "Link_state_inactive_ended" || state === LinkState.INACTIVE_ENDED) {
      return "Inactive";
    }
    
    return "Unknown state"; 
  }

  function getStatusClasses(state: string): string {
    const stateIndex = mapStringToStateIndex(state);
    
    if (stateIndex >= 0 && stateIndex <= 3) {
      return "bg-lightyellow text-yellow";
    }
    
    if (stateIndex === 4) {
      return "bg-green text-white";
    }
    
    if (stateIndex > 4) {
      return "bg-gray-200 text-gray-700";
    }
    
    return "bg-muted text-muted-foreground";
  }

  function getLinkDefaultAvatar(linkType: LinkTypeValue | string | undefined): string {
    switch (linkType) {
      case LinkType.TIP:
      case "TIP":
      case "SendTip":
        return "/tip-link-default.svg";
      case LinkType.AIRDROP:
      case "AIRDROP":
      case "SendAirdrop":
        return "/airdrop-default.svg";
      case LinkType.TOKEN_BASKET:
      case "TOKEN_BASKET":
      case "SendTokenBasket":
        return "/token-basket-default.svg";
      case LinkType.RECEIVE_PAYMENT:
      case "RECEIVE_PAYMENT":
      case "ReceivePayment":
        return "/receive-payment-default.svg";
      default:
        return "/tip-link-default.svg";
    }
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
          <h3 class="text-lightblack/80 font-normal mb-2 text-[14px]">{formatDate(group.date)}</h3>
          <ul class="space-y-4">
            {#each group.links as link (link.id)}
              <li>
                <a
                  href={`/app/edit/${link.id}`}
                  onclick={(e) => handleLinkClick(e, link.id)}
                  class="block"
                >
                  <div class="w-full flex justify-between items-center my-3">
                    <div class="flex gap-x-5 items-center">
                      <div
                        class="flex items-center justify-center w-[32px] h-[32px] bg-lightgreen rounded-[6px]"
                      >
                        <img
                          alt="link"
                          class="w-[18px] h-[18px] rounded-sm"
                          src={getLinkDefaultAvatar(link.link_type)}
                        />
                      </div>
                    </div>
                    <div class="flex items-center justify-between grow ml-3">
                      <div class="flex flex-col items-start justify-center">
                        <h3 class="text-[14px] font-medium">{link.title}</h3>
                      </div>
                      {#if link.state}
                        <div
                          class="text-xs font-xs rounded-full px-2 py-1 {getStatusClasses(link.state)}"
                        >
                          {getStatusLabel(link.state)}
                        </div>
                      {/if}
                    </div>
                  </div>
                </a>
              </li>
            {/each}
          </ul>
      {/each}
    </div>
    {/if}
  </div>
</div>
