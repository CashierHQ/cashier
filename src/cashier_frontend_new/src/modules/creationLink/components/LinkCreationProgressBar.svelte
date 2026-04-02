<script lang="ts">
  const SEGMENT_COUNT = 3;

  const {
    filledCount = SEGMENT_COUNT,
  }: {
    /** How many segments from the left use the completed (green) style, 0–3. */
    filledCount?: number;
  } = $props();

  const clampedFilled = $derived.by(() =>
    Math.min(SEGMENT_COUNT, Math.max(0, Math.floor(filledCount))),
  );
</script>

<div class="flex w-full mb-3" role="presentation">
  {#each Array(SEGMENT_COUNT) as _, i (i)}
    <div
      class="h-[6px] rounded-full mx-[2px] transition-all duration-300 {clampedFilled >=
      i + 1
        ? 'bg-green'
        : 'bg-lightgreen'}"
      style="width: 33.3333%;"
    ></div>
  {/each}
</div>
