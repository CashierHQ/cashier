<script lang="ts">
  import ChooseLinkTypeV3 from "$modules/creationLink/components/chooseLinkTypeV3.svelte";
  import CreateLinkHeader from "$modules/creationLink/components/createLinkHeader.svelte";
  import { getGuardContext } from "$modules/guard/context.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";

  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";

  const context = getGuardContext();
  const linkStore = $derived.by(() => {
    const store = context.linkCreationStoreV3;
    if (!store) return null;
    return store;
  });

  const handleBack = async () => {
    if (!linkStore) return;
    if (
      linkStore.state.step === LinkStep.CHOOSE_TYPE ||
      linkStore.state.step === LinkStep.CREATED
    ) {
      goto(resolve("/links"));
    } else {
      try {
        await linkStore.goBack();
      } catch (e) {
        console.error("Failed to go back:", e);
      }
    }
  };

  onMount(() => {
    appHeaderStore.setBackHandler(handleBack);

    return () => {
      appHeaderStore.clearBackHandler();
    };
  });
</script>

{#if linkStore}
  <div class="grow-1 flex flex-col mt-2 sm:mt-0">
    <CreateLinkHeader linkStep={linkStore.state.step} onBack={handleBack} />

    {#if linkStore.state.step === LinkStep.CHOOSE_TYPE}
      <ChooseLinkTypeV3 {linkStore} />
    {/if}
  </div>
{/if}
