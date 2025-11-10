<script lang="ts">
  import {
    linkListStore,
  } from "../state/linkListStore.svelte";


</script>

<section class="px-4 py-4 relative overflow-y-auto scrollbar-hide">
  <div class="mb-4">
    <h2
      class="text-lg font-semibold sticky top-0 bg-white z-10 py-2 -mx-4 px-4"
    >
      Links created by me
    </h2>
    {#if linkListStore.query.data}
      <div class="text-sm text-muted-foreground">
        Total links – {linkListStore.query.data.length}
      </div>
      {#if linkListStore.query.data.length > 0}
        <div class="text-sm text-muted-foreground mt-2">
        </div>
      {/if}
    {/if}
  </div>

  {#if linkListStore.query.isLoading}
    <div class="text-sm text-muted-foreground">Loading...</div>
  {/if}

  {#if linkListStore.query.error}
    <div class="text-sm text-destructive">
      Cannot fetch links list: {linkListStore.query.error}
    </div>
  {/if}

  {#if linkListStore.query.data}
    {#if linkListStore.query.data.length === 0}
      <div class="text-sm text-muted-foreground">There are no links</div>
    {:else}
      <ul class="space-y-3">
        {#each linkListStore.query.data as link (link.id)}
          <li>
            <button
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
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>
