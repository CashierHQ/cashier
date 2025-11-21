<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";

  type AmountActionButtonData = {
    content?: string;
    action: () => void;
  };

  type Props = {
    data: AmountActionButtonData[];
    isDisabled?: boolean;
  };

  let { data, isDisabled = false }: Props = $props();

  function handleButtonClick(e: MouseEvent, action: () => void) {
    e.preventDefault();
    e.stopPropagation();
    action();
  }
</script>

<div class="flex justify-between w-full mx-auto gap-2">
  {#each data as { content, action }, key (key)}
    <Button
      type="button"
      variant="outline"
      size="icon"
      class="asset-amount-percentage-button focus:border-green focus:text-green focus:bg-white h-9 w-9 rounded-full"
      onclick={(e) => handleButtonClick(e, action)}
      disabled={isDisabled}
    >
      {content}
    </Button>
  {/each}
</div>
