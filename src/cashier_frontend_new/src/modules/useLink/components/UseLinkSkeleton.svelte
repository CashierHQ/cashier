<script lang="ts">
  import Skeleton from "$modules/shared/components/Skeleton.svelte";
  import { ChevronLeft, Lock } from "lucide-svelte";
</script>

<div class="flex h-full grow-1 flex-col">
  <div class="hidden flex-none items-center md:flex">
    <ChevronLeft class="h-[25px] w-[25px]" aria-hidden="true" />
  </div>

  <div class="mt-3 space-y-4 md:mt-4">
    <div>
      <Skeleton class="mb-2 h-[17px] w-20" />
      <div class="flex flex-col rounded-lg border-[1px] border-lightgreen">
        <div class="flex flex-row items-center justify-between px-4 py-3">
          <div class="flex items-center gap-2">
            <Skeleton class="h-6 w-6 rounded-full" />
            <Skeleton class="h-[17px] w-36" />
          </div>
          <Skeleton class="h-[17px] w-20" />
        </div>
      </div>
    </div>

    <div>
      <Skeleton class="mb-2 h-[17px] w-24" />
      <div
        class="flex flex-col gap-3 rounded-lg border-[1px] border-lightgreen px-4 py-3"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-2">
            <Skeleton class="h-6 w-6 rounded-full" />
            <Skeleton class="h-[17px] w-16" />
          </div>
          <div class="flex flex-col items-end gap-2">
            <Skeleton class="h-[17px] w-12" />
            <Skeleton class="h-3 w-10" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <div
    class="mt-auto flex-none px-2 pb-4 pt-8 md:sticky md:bottom-2 md:left-0 md:right-0"
  >
    <div class="mx-auto flex w-[95%] flex-col gap-3">
      <div
        class="flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-500"
      >
        <Lock class="h-4 w-4 shrink-0" aria-hidden="true" />
        <Skeleton class="h-[17px] w-44 bg-red-100" />
      </div>
      <Skeleton class="h-11 w-full rounded-full bg-green/25" />
    </div>
  </div>
</div>
