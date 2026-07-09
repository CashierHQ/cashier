<script lang="ts">
  import { resolve } from "$app/paths";
  import { locale } from "$lib/i18n";
  import { paths } from "$modules/routing/paths";
  import PrimaryActionButton from "$modules/shared/components/PrimaryActionButton.svelte";
</script>

<div
  class="mx-auto flex min-h-[28rem] w-full max-w-xl flex-col items-center justify-center gap-6 px-6 py-12 text-center"
>
  <div class="space-y-3">
    <h2 class="text-2xl font-semibold">
      {locale.t("links.linkForm.useLink.ended.title")}
    </h2>
    <p class="mx-auto max-w-sm text-sm text-muted-foreground">
      {locale.t("links.linkForm.useLink.ended.description")}
    </p>
  </div>

  <PrimaryActionButton href={resolve(paths.home())} class="max-w-xs">
    {locale.t("links.linkForm.useLink.ended.backButton")}
  </PrimaryActionButton>
</div>
