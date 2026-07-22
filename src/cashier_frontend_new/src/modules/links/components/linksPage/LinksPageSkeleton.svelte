<script lang="ts">
  import Skeleton from "$modules/shared/components/Skeleton.svelte";

  const groups = [
    [120, 150, 110],
    [130, 118, 132, 126],
    [210, 190, 118],
  ];
</script>

<div class="flex w-full flex-col" aria-label="Loading links">
  <h2 class="mt-0 text-base font-semibold">Links created by me</h2>
  <div class="mt-4 space-y-4">
    {#each groups as rows, groupIndex (groupIndex)}
      <div>
        <Skeleton class="mb-2 h-[17px] w-24" />
        <ul>
          {#each rows as titleWidth, rowIndex (rowIndex)}
            <li>
              <div class="my-3 flex w-full items-center justify-between">
                <div class="flex items-center gap-x-5">
                  <Skeleton class="h-[32px] w-[32px] rounded-[6px]" />
                </div>
                <div class="ml-3 flex grow items-center justify-between">
                  <Skeleton class="h-[17px]" style="width: {titleWidth}px" />
                  <Skeleton
                    class={groupIndex === 2 && rowIndex < 2
                      ? "h-[22px] w-[112px] rounded-full"
                      : "h-[22px] w-[45px] rounded-full"}
                  />
                </div>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
</div>
