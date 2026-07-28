<script lang="ts">
  import { cn } from "$lib/shadcn/components/utils";

  let {
    class: className = "",
    style = "",
  }: {
    class?: string;
    style?: string;
  } = $props();
</script>

<div
  aria-hidden="true"
  class={cn("animate-pulse rounded bg-[#EAECF0]", className)}
  {style}
></div>
