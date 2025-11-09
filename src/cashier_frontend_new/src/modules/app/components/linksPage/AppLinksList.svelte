<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { Link } from "$modules/links/types/link/link";
  import LinkItem from "./LinkItem.svelte";

  let hasLinks = $state(true);

  const {
    links2,
  }: {
    links2: Link[];
  } = $props();

  let links = $state(links2 ?? []);

  const groupedLinks = $derived.by(() => {
    if (!hasLinks || links.length === 0) return [];

    const map = new Map<bigint, Link[]>();

    for (const link of links) {
      const ns = link.create_at;
      const ms = Number(ns / 1000000n);
      const d = new Date(ms);
      const midnightLocalMs = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
      ).getTime();
      const dayKeyNs = BigInt(midnightLocalMs) * 1000000n;
      // key of the day derived from create_at
      const existing = map.get(dayKeyNs);
      if (existing) existing.push(link);
      else map.set(dayKeyNs, [link]);
    }

    // Sort groups by descending day (most recent first)
    return Array.from(map.entries())
      .sort((a, b) => (a[0] === b[0] ? 0 : a[0] > b[0] ? -1 : 1))
      .map(([ns, dateLinks]) => ({ date: ns, links: dateLinks }));
  });

  function handleLinkClick(event: MouseEvent, linkId: string) {
    event.preventDefault();
    goto(resolve(`/app/edit/${linkId}`));
  }

  function formatDate(ts: bigint) {
    if (ts === 0n) return "";
    const ms = Number(ts / 1000000n);
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
