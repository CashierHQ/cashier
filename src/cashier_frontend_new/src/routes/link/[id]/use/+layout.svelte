<script lang="ts">
  import Protected from "$modules/shared/components/Protected.svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";

  let { children } = $props();

  const id = page.params.id;

  const redirectToLink = () => goto(resolve(`/link/${id}`));
</script>

<Protected errorCallback={redirectToLink}>
  {@render children?.()}
</Protected>
