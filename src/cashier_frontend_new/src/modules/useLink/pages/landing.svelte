<script lang="ts">
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkUserState } from "$modules/links/types/link/linkUserState";
  import Landing from "../components/Landing.svelte";
  import UserLinkStore from "../state/userLinkStore.svelte";
  import Ended from "../components/Ended.svelte";
  import NotFound from "../components/NotFound.svelte";
  import UseFlowProtected from "../components/useLinkProtected.svelte";

  const {
    id,
  }: {
    id: string;
  } = $props();

  const userStore = new UserLinkStore({ id });
</script>

<UseFlowProtected {userStore} linkId={id}>
  {#if userStore.isLoading}
    Loading...
  {:else if !userStore.link}
    <NotFound />
  {:else}
    {@const isEndedWithoutCompletion =
      userStore.link.state === LinkState.INACTIVE_ENDED &&
      userStore.query.data?.link_user_state !== LinkUserState.COMPLETED}

    {#if isEndedWithoutCompletion}
      <Ended />
    {:else}
      <div class="px-4 py-4">
        <div class="mt-4">
          <Landing userLink={userStore} />
        </div>
      </div>
    {/if}
  {/if}
</UseFlowProtected>
