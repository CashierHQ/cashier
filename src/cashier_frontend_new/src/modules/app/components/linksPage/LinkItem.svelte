<script lang="ts">
  import type { LinkTypeValue } from "$modules/links/types/link/linkType";
  import type { LinkStateValue } from "$modules/links/types/link/linkState";
  import {
    getStatusLabel,
    getStatusClasses,
    getLinkDefaultAvatar,
  } from "$modules/links/utils/linkItemHelpers";

  type Props = {
    title: string;
    linkType: LinkTypeValue;
    state: LinkStateValue;
    onClick: (event: MouseEvent) => void;
  };

  let { title, linkType, state, onClick }: Props = $props();
</script>

<button onclick={onClick} class="block w-full text-left">
  <div class="w-full flex justify-between items-center my-3">
    <div class="flex gap-x-5 items-center">
      <div
        class="flex items-center justify-center w-[32px] h-[32px] bg-lightgreen rounded-[6px]"
      >
        <img
          alt="link"
          class="w-[18px] h-[18px] rounded-sm"
          src={getLinkDefaultAvatar(linkType)}
        />
      </div>
    </div>
    <div class="flex items-center justify-between grow ml-3">
      <div class="flex flex-col items-start justify-center">
        <h3 class="text-[14px] font-medium">{title}</h3>
      </div>
      {#if state}
        <div
          class="text-xs font-xs rounded-full px-2 py-1 {getStatusClasses(
            state,
          )}"
        >
          {getStatusLabel(state)}
        </div>
      {/if}
    </div>
  </div>
</button>
