<script lang="ts">
  import Skeleton from "$modules/shared/components/Skeleton.svelte";
</script>

<div class="px-4 pt-4 pb-6">
  <div
    class="relative mx-auto flex w-[400px] max-w-full flex-col items-center justify-center overflow-hidden rounded-[13px] bg-lightgreen p-5"
  >
    <Skeleton class="mt-8 mb-4 h-[220px] w-[220px] rounded-full" />
    <Skeleton class="mb-2 h-[19px] w-20" />
    <div class="mb-8 flex flex-col items-center gap-1">
      <Skeleton class="h-[17px] w-36" />
      <Skeleton class="h-[17px] w-32" />
    </div>
    <Skeleton class="h-11 w-[95%] rounded-full bg-green/25" />
  </div>
</div>
