<script lang="ts">
  import { resolve } from "$app/paths";

  type Props = {
    href?: string;
  };

  let { href = resolve("/app") }: Props = $props();
</script>

<a {href}>
  <img
    alt="Cashier logo"
    class="max-w-[130px] cursor-pointer"
    src="/logo.svg"
  />
</a>
