<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { Snippet } from "svelte";
  import { getGuardContext } from "../context.svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";

  let {
    redirectTo,
    children,
  }: {
    redirectTo?: string;
    children: Snippet;
  } = $props();

  const context = getGuardContext();

  const linkStore = $derived(
    context.linkDetailStore ||
      context.userLinkStore ||
      context.linkCreationStore,
  );

  const isLoading = $derived(
    !linkStore
      ? !context.hasTempLinkLoadAttempted
      : "query" in linkStore
        ? linkStore.query.isLoading
        : "linkDetail" in linkStore && linkStore.linkDetail?.query
          ? linkStore.linkDetail.query.isLoading
          : false,
  );

  const hasLink = $derived(
    !linkStore
      ? false
      : context.linkCreationStore
        ? true
        : "link" in linkStore
          ? linkStore.link !== null && linkStore.link !== undefined
          : "linkDetail" in linkStore && linkStore.linkDetail?.link
            ? linkStore.linkDetail.link !== null &&
              linkStore.linkDetail.link !== undefined
            : false,
  );

  const isValid = $derived(!linkStore ? false : isLoading ? false : hasLink);

  const isReadyToCheck = $derived(!isLoading && linkStore !== null);

  const shouldRedirect = $derived(
    (isReadyToCheck && !hasLink) ||
      (context.authState.isReady &&
        context.hasTempLinkLoadAttempted &&
        !linkStore),
  );

  $effect(() => {
    if (shouldRedirect) {
      const redirectPath = redirectTo || "/404";
      // @ts-expect-error - dynamic route path
      goto(resolve(redirectPath));
    }
  });
</script>

{#if isLoading}
  <ProtectionProcessingState message="Loading..." />
{:else if isValid}
  {@render children()}
{/if}
