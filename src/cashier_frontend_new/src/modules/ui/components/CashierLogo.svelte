<script lang="ts">
  import { resolve } from "$app/paths";

  type Props = {
    href?: string;
    onclick?: () => void;
  };

  let { href = resolve("/links"), onclick }: Props = $props();

  function handleClick(e: MouseEvent) {
    if (onclick) {
      e.preventDefault();
      onclick();
    }
  }
</script>

<a {href} onclick={handleClick}>
  <img
    alt="Cashier logo"
    class="max-w-[130px] cursor-pointer"
    src="/logo.svg"
  />
</a>
