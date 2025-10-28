<script lang="ts">
  import { linkListStore } from "../state/linkList.svelte";
  import { resolve } from "$app/paths";

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

  import { statusBadge } from "../utils/statusBadge";
</script>

<section class="px-4 py-4">
  <div class="mb-4">
    <h2 class="text-lg font-semibold">Links created by me</h2>
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

  {#if linkListStore.data}
    {#if linkListStore.data.length === 0}
      <div class="text-sm text-muted-foreground">There are no links</div>
    {:else}
      <ul class="space-y-3">
        {#each linkListStore.data as link (link.id)}
          <li>
            <a
              href={resolve(`/link/detail/${link.id}`)}
              class="flex items-center justify-between gap-3 p-3 bg-card border rounded-lg hover:shadow-md hover:bg-surface transition-transform cursor-pointer block"
            >
              <div class="flex items-center gap-3">
                <!-- avatar / icon -->
                <div
                  class="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center border"
                >
                  <!-- simple SVG placeholder icon -->
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="4"
                      fill="url(#g)"
                    />
                    <defs>
                      <linearGradient id="g" x1="0" x2="1">
                        <stop offset="0" stop-color="#C6F6DD" />
                        <stop offset="1" stop-color="#BEE3DB" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                <div>
                  <div class="font-medium">{link.title}</div>
                  <div class="text-xs text-muted-foreground mt-1">
                    {#if link.link_type && link.link_use_action_counter !== undefined}
                      Used {String(link.link_use_action_counter)} / {String(
                        link.link_use_action_max_count,
                      )}
                    {/if}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-3">
                {#if link.state}
                  <span class={`${statusBadge(link.state).classes}`}
                    >{statusBadge(link.state).text}</span
                  >
                {:else}
                  <span
                    class="text-xs font-xs rounded-full px-2 py-1 bg-gray-50 text-gray-700"
                    >Unknown</span
                  >
                {/if}
              </div>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>
