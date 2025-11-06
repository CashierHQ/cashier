<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import type { Link } from "$modules/links/types/link/link";
  import { LinkState } from "../../types/link/linkState";
  interface Props {
    link: Link;
    onCreateUseAction?: () => Promise<void>;
  }

  let { link, onCreateUseAction }: Props = $props();
</script>

{#if link?.state === LinkState.ACTIVE}
  <Button
    onclick={onCreateUseAction}
    class="w-full h-11 bg-emerald-600 text-white rounded-full cursor-pointer hover:bg-emerald-700 hover:shadow-md hover:font-semibold transition transform hover:-translate-y-0.5"
  >
    Claim
  </Button>
{/if}
