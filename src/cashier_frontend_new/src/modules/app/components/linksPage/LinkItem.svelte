<script lang="ts">
  import {
    getStatusLabel,
    getStatusClasses,
    getLinkDefaultAvatar,
  } from "$modules/links/utils/linkItemHelpers";
  import type { Link } from "$modules/links/types/link/link";

  type Props = {
    link: Link;
    onClick: (event: MouseEvent) => void;
  };

  let { onClick, link }: Props = $props();
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
          src={getLinkDefaultAvatar(link.link_type)}
        />
      </div>
    </div>
    <div class="flex items-center justify-between grow ml-3">
      <div class="flex flex-col items-start justify-center">
        <h3 class="text-[14px] font-medium">{link.title}</h3>
      </div>
      {#if link.state}
        <div
          class="text-xs font-xs rounded-full px-2 py-1 {getStatusClasses(
            link.state,
          )}"
        >
          {getStatusLabel(link.state)}
        </div>
      {/if}
    </div>
  </div>
</button>
