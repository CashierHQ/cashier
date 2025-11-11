<script lang="ts">
  import { Plus } from "lucide-svelte";

  const {
    onClick,
  }: {
    onClick?: () => void;
  } = $props();
</script>

<button
  onclick={onClick}
  class="fixed flex items-center justify-center cursor-pointer bottom-[30px] right-[30px] text-[2rem] rounded-full w-[3rem] h-[3rem] border-2 border-white bg-green hover:bg-green/90 text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none shadow-lg z-50"
  type="button"
  aria-label="Create new link"
>
  <Plus class="w-6 h-6" stroke-width="3" />
</button>
