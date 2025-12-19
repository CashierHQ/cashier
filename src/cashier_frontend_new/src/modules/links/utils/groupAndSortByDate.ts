import { SvelteDate, SvelteMap } from "svelte/reactivity";
import type { GroupedLink, UnifiedLinkList } from "../types/linkList";

/**
 * Pure helper that groups links by day (midnight local time) and sorts groups by descending date.
 * Accepts a unified list of links (persisted + temp) and returns grouped links.
 */
export function groupAndSortByDate(allLinks: UnifiedLinkList): GroupedLink[] {
  const map = new SvelteMap<bigint, UnifiedLinkList>();

  // Group links by day
  for (const link of allLinks) {
    // derive the day key (midnight local time) from create_at
    const ns = link.linkCreateAt;
    const ms = Number(ns / 1000000n);
    const d = new SvelteDate(ms);
    const midnightLocalMs = new SvelteDate(
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
    .map(([ns, dateLinks]) => {
      // Within each day, sort links by create_at descending (newest first)
      dateLinks.sort((x, y) =>
        x.linkCreateAt === y.linkCreateAt
          ? 0
          : x.linkCreateAt > y.linkCreateAt
            ? -1
            : 1,
      );
      return { date: ns, links: dateLinks };
    });
}
