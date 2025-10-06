<script lang="ts">
  import { LinkType } from "../types";
  import createLinkState from "../stores/create-link.svelte";
  import Input from "$lib/shadcn/components/ui/input/input.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";

  // local bindings to the shared state
  const data = createLinkState.data;
</script>

<div class="space-y-4">
  <div>
    <Label for="title">Link title</Label>
    <Input
      id="title"
      bind:value={data.title}
      placeholder="Enter a title for your link"
    />
  </div>

  <div>
    <Label for="linkType">Link type</Label>
    <select
      id="linkType"
      class="block w-full rounded-md border px-3 py-2 text-base"
      bind:value={data.linkType}
    >
      <option value={LinkType.TIP}>Tip</option>
      <option value={LinkType.AIRDROP}>Airdrop</option>
      <option value={LinkType.TOKEN_BASKET}>Token basket</option>
    </select>
  </div>
</div>
