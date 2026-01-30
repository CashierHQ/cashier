<script lang="ts">
  import AppLinksList from "$modules/links/components/linksPage/AppLinksList.svelte";
  import { linkListStore } from "$modules/links/state/linkListStore.svelte";
  import { groupAndSortByDate } from "$modules/links/utils/groupAndSortByDate";
  import { locale } from "$lib/i18n";
  import { ONBOARDING_DISMISSED_KEY } from "$modules/links/constants";

  let showOnboarding = $state(
    typeof window === "undefined" ||
      localStorage.getItem(ONBOARDING_DISMISSED_KEY) !== "true",
  );

  function handleDismissOnboarding() {
    showOnboarding = false;
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    }
  }
</script>

<div class="w-full">
  <h1 class="text-2xl font-bold">{locale.t("links.page.title")}</h1>
  {#if showOnboarding}
    <div class="pb-4">
      <p class="text-sm text-grey mt-3">
        {locale.t("links.page.description")}
      </p>
      <button
        class="text-green text-sm font-bold mt-3 cursor-pointer"
        type="button"
        onclick={handleDismissOnboarding}>{locale.t("links.page.gotItButton")}</button
      >
    </div>
  {/if}

  <AppLinksList groupedLinks={groupAndSortByDate(linkListStore.getLinks())} />
</div>
