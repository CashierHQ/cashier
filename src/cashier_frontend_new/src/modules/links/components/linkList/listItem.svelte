<script lang="ts">
  import { statusBadge } from "../../utils/statusBadge";
  import { Link } from "../../types/link/link";
  import type TempLink from "../../types/tempLink";
  import { goto } from "$app/navigation";

  let {
    item,
  }: {
    item: Link | TempLink;
  } = $props();

  function handleClick() {
    if (item instanceof Link) {
      goto(`/link/detail/${item.id}`);
    } else {
      goto(`/link/create`);
    }
  }
</script>

{#if item instanceof Link}
  <button
    onclick={handleClick}
    class="flex items-center justify-between gap-3 p-3 bg-card border rounded-lg hover:shadow-md hover:bg-surface transition-transform cursor-pointer block w-full text-left"
  >
    <div class="flex items-center gap-3">
      <div
        class="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center border"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="3" y="3" width="18" height="18" rx="4" fill="url(#g)" />
          <defs>
            <linearGradient id="g" x1="0" x2="1">
              <stop offset="0" stop-color="#C6F6DD" />
              <stop offset="1" stop-color="#BEE3DB" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div>
        <div class="font-medium">{item.title}</div>
        <div class="text-xs text-muted-foreground mt-1">
          {#if "link_use_action_counter" in item && "link_use_action_max_count" in item}
            Used {item.link_use_action_counter} / {item.link_use_action_max_count}
          {/if}
        </div>
      </div>
    </div>

    <div class="flex items-center gap-3">
      {#if item.state}
        <span class={`${statusBadge(item.state).classes}`}
          >{statusBadge(item.state).text}</span
        >
      {:else}
        <span
          class="text-xs font-xs rounded-full px-2 py-1 bg-gray-50 text-gray-700"
          >Unknown</span
        >
      {/if}
    </div>
  </button>
{:else}
  <button
    onclick={handleClick}
    class="flex items-center justify-between gap-3 p-3 bg-card border rounded-lg hover:shadow-md hover:bg-surface transition-transform cursor-pointer block w-full text-left"
  >
    <div class="flex items-center gap-3">
      <div
        class="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center border"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="3" y="3" width="18" height="18" rx="4" fill="url(#g)" />
          <defs>
            <linearGradient id="g" x1="0" x2="1">
              <stop offset="0" stop-color="#C6F6DD" />
              <stop offset="1" stop-color="#BEE3DB" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div>
        <div class="font-medium">
          {item.createLinkData.title === ""
            ? "No title"
            : item.createLinkData.title}
        </div>
        <div class="text-xs text-muted-foreground mt-1">
          This is a temporary link draft.
        </div>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span
        class="text-xs font-xs rounded-full px-2 py-1 bg-gray-50 text-gray-700"
        >{item.state}</span
      >
    </div>
  </button>
{/if}

<li></li>
