<script lang="ts">
  import {
    AggregatorLinkList,
    linkListStore,
  } from "../state/linkListStore.svelte";
  import ListItem from "./linkList/listItem.svelte";

  // normalize various timestamp inputs to BigInt nanoseconds and format
  const toBigIntNanoseconds = (input: unknown): bigint => {
    if (input === undefined || input === null) return 0n;
    if (typeof input === "bigint") return input as bigint;
    const s = String(input).trim();
    if (!/^[-+]?\d+$/.test(s)) {
      const ms = Date.parse(s);
      if (Number.isNaN(ms)) return 0n;
      return BigInt(ms) * 1000000n;
    }
    const n = BigInt(s);
    const abs = n < 0n ? -n : n;
    if (abs >= 1000000000000000n) return n; // treat as ns
    return n * 1000000n; // treat as ms -> ns
  };

  function formatDate(ts: bigint | number) {
    const ns = toBigIntNanoseconds(ts as unknown);
    if (ns === 0n) return "";
    const ms = Number(ns / 1000000n);
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const links = new AggregatorLinkList().links();
</script>

<section class="px-4 py-4 relative overflow-y-auto scrollbar-hide">
  <div class="mb-4">
    <h2
      class="text-lg font-semibold sticky top-0 bg-white z-10 py-2 -mx-4 px-4"
    >
      Links created by me
    </h2>
    {#if linkListStore.data}
      <div class="text-sm text-muted-foreground">
        Total links – {linkListStore.data.length}
      </div>
      {#if linkListStore.data.length > 0}
        <div class="text-sm text-muted-foreground mt-2">
          {formatDate(linkListStore.data[0].create_at)}
        </div>
      {/if}
    {/if}
  </div>

  {#if linkListStore.isLoading}
    <div class="text-sm text-muted-foreground">Loading...</div>
  {/if}

  {#if linkListStore.error}
    <div class="text-sm text-destructive">
      Cannot fetch links list: {linkListStore.error}
    </div>
  {/if}

  {#if links}
    {#if links.length === 0}
      <div class="text-sm text-muted-foreground">There are no links</div>
    {:else}
      <ul class="space-y-3">
        {#each links as link (link.id)}
          <ListItem item={link} />
        {/each}
      </ul>
    {/if}
  {/if}
</section>
