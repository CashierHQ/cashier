<script lang="ts">
  const DEFAULT_SEGMENT_COUNT = 3;

  const {
    filledCount = DEFAULT_SEGMENT_COUNT,
    segmentCount = DEFAULT_SEGMENT_COUNT,
  }: {
    /** How many segments from the left use the completed (green) style. */
    filledCount?: number;
    /** How many total segments are there. */
    segmentCount?: number;
  } = $props();

  const clampedSegmentCount: number = $derived.by(() =>
    Math.max(1, Math.floor(segmentCount)),
  );

  const clampedFilled: number = $derived.by(() =>
    Math.min(clampedSegmentCount, Math.max(0, Math.floor(filledCount))),
  );
</script>

<div class="flex w-full mb-3" role="presentation">
  {#each [...Array(clampedSegmentCount).keys()] as i (i)}
    <div
      class="h-[6px] rounded-full mx-[2px] transition-all duration-300 {clampedFilled >=
      i + 1
        ? 'bg-green'
        : 'bg-lightgreen'}"
      style={`width: ${100 / clampedSegmentCount}%`}
    ></div>
  {/each}
</div>
