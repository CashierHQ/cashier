<script lang="ts">
  import { page } from "$app/state";
  import UseLink from "$modules/useLink/pages/use.svelte";
  import UseFlowProtected from "$modules/useLink/components/useFlowProtected.svelte";
  import UserLinkStore from "$modules/useLink/state/userLinkStore.svelte";

  const id = page.params.id;
  let userStore = $state<UserLinkStore | null>(null);

  $effect(() => {
    if (id) {
      userStore = new UserLinkStore({ id });
    }
  });
</script>

{#if id && userStore}
  <UseFlowProtected {userStore} linkId={id}>
    <UseLink {userStore} />
  </UseFlowProtected>
{:else if id}
  <div>Loading...</div>
{/if}
