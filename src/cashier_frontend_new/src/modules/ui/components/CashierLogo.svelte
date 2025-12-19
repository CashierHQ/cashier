<script lang="ts">
  import { resolve } from "$app/paths";

  type Props = {
    href?: string;
    onclick?: () => void;
  };

  let { href = resolve("/links"), onclick }: Props = $props();
</script>

{#if onclick}
  <button type="button" {onclick} class="p-0 border-0 bg-transparent">
    <img
      alt="Cashier logo"
      class="max-w-[130px] cursor-pointer"
      src="/logo.svg"
    />
  </button>
{:else}
  <a {href}>
    <img
      alt="Cashier logo"
      class="max-w-[130px] cursor-pointer"
      src="/logo.svg"
    />
  </a>
{/if}
