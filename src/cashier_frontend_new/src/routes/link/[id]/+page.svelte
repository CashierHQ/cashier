<script lang="ts">
  import { page } from "$app/state";
  import { resolve } from "$app/paths";
  import Landing from "$modules/useLink/pages/landing.svelte";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  import { goto } from "$app/navigation";

  const id = page.params.id;

  let isReady: boolean = $state(false);
  $effect(() => {
    if (!userProfile.isReady()) return;

    if (userProfile.isLoggedIn() && id) {
      goto(resolve(`/link/${id}/use`));
      return;
    }

    isReady = true;
  });
</script>

{#if !isReady}
  Loading...
{/if}

{#if id && isReady}
  <Landing {id} />
{/if}
