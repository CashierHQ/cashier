<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import DetailLink from "$modules/detailLink/pages/detail.svelte";
  import RouteGuard from "$modules/shared/components/guards/RouteGuard.svelte";
  import { GuardType } from "$modules/shared/components/guards/types";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { onMount } from "svelte";

  const id = page.params.id;

  const handleBack = async () => {
    goto(resolve("/links"));
  };

  onMount(() => {
    appHeaderStore.setBackHandler(handleBack);

    return () => {
      appHeaderStore.clearBackHandler();
    };
  });
</script>

<RouteGuard
  guards={[
    { type: GuardType.AUTH },
    { type: GuardType.VALID_LINK, redirectTo: "/links" },
    { type: GuardType.LINK_OWNER },
    {
      type: GuardType.LINK_STATE,
      allowedStates: [
        LinkStep.CREATED,
        LinkStep.ACTIVE,
        LinkStep.INACTIVE,
        LinkStep.ENDED,
      ],
    },
  ]}
  linkId={id}
>
  <DetailLink {id} />
</RouteGuard>
