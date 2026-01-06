<script lang="ts">
  import AppLinksList from "$modules/links/components/linksPage/AppLinksList.svelte";
  import { linkListStore } from "$modules/links/state/linkListStore.svelte";
  import { groupAndSortByDate } from "$modules/links/utils/groupAndSortByDate";
  import { locale } from "$lib/i18n";
</script>

<div class="w-full">
  <div class="pb-4">
    <h1 class="text-2xl font-bold">{locale.t("links.page.title")}</h1>
    <p class="text-sm text-grey mt-3">
      {locale.t("links.page.description")}
    </p>
    <button
      class="text-green text-sm font-bold mt-3 cursor-pointer"
      type="button">{locale.t("links.page.gotItButton")}</button
    >
  </div>

  <AppLinksList groupedLinks={groupAndSortByDate(linkListStore.getLinks())} />
</div>
