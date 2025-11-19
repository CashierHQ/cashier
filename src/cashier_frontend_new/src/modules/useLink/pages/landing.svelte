<script lang="ts">
  import { LinkState } from "$modules/links/types/link/linkState";
  import Landing from "../components/Landing.svelte";
  import UserLinkStore from "../state/userLinkStore.svelte";
  import Ended from "../components/Ended.svelte";
  import NotFound from "../components/NotFound.svelte";

  const {
    id,
  }: {
    id: string;
  } = $props();

  const userStore = new UserLinkStore({ id });
</script>

{#if userStore.isLoading}
  Loading...
{:else if userStore.link}
  {#if userStore.link.state === LinkState.INACTIVE_ENDED}
    <Ended />
  {:else}
    <div class="px-4 py-4">
      <div class="mt-4">
        <Landing userLink={userStore} />
      </div>
    </div>
  {/if}
{:else}
  <NotFound />
{/if}
