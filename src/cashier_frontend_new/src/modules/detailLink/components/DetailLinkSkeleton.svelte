<script lang="ts">
  import { locale } from "$lib/i18n";
  import Skeleton from "$modules/shared/components/Skeleton.svelte";
  import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-svelte";

  let {
    onBack,
  }: {
    onBack: () => Promise<void>;
  } = $props();
</script>

<div class="flex h-full grow-1 flex-col space-y-4">
  <div class="mb-2 w-full flex-none">
    <div
      class="relative mb-1.5 hidden w-full items-center justify-center py-1 md:flex"
    >
      <Skeleton class="h-[22px] w-44" />
      <button
        onclick={onBack}
        class="absolute left-0 cursor-pointer text-[1.5rem] transition-transform hover:scale-105"
        type="button"
        aria-label={locale.t("links.linkForm.header.back")}
      >
        <ChevronLeft class="h-[25px] w-[25px]" aria-hidden="true" />
      </button>
    </div>
  </div>

  <div>
    <p class="mb-2 text-sm font-medium">
      {locale.t("links.linkForm.preview.linkInfo")}
    </p>
    <div class="flex flex-col rounded-lg border-[1px] border-lightgreen">
      <div class="flex flex-row items-center justify-between px-5 py-3">
        <p class="text-sm font-medium">
          {locale.t("links.linkForm.preview.type")}
        </p>
        <Skeleton class="h-[17px] w-24" />
      </div>
      <div class="flex flex-row items-center justify-between px-5 py-3">
        <p class="text-sm font-medium">
          {locale.t("links.linkForm.preview.userPays")}
        </p>
        <Skeleton class="h-[17px] w-6" />
      </div>
      <div class="flex flex-row items-start justify-between px-5 py-3">
        <p class="text-sm font-medium">
          {locale.t("links.linkForm.preview.userClaims")}
        </p>
        <div class="flex items-center gap-2">
          <Skeleton class="h-[17px] w-20" />
          <Skeleton class="h-4 w-4 rounded-full" />
        </div>
      </div>
      <div class="flex flex-row items-center justify-between px-5 py-3">
        <p class="text-sm font-medium">
          {locale.t("links.linkForm.preview.maxUse")}
        </p>
        <Skeleton class="h-[17px] w-4" />
      </div>
    </div>
  </div>

  <div class="rounded-lg border-[1px] border-lightgreen px-4 py-3">
    <div class="flex items-center justify-between">
      <p class="text-[14px] font-medium">
        {locale.t("links.linkForm.preview.transactionLock")}
      </p>

      <div class="flex items-center gap-2">
        <Skeleton class="h-[17px] w-14" />
        <ChevronRight class="h-[18px] w-[18px]" aria-hidden="true" />
      </div>
    </div>
  </div>

  <div>
    <div class="mb-2 flex items-center justify-between gap-2">
      <p class="text-sm font-medium">
        {locale.t("links.linkForm.detail.usageInfo")}
      </p>
      <Skeleton class="h-[22px] w-[22px] rounded-[3px]" />
    </div>
    <div class="flex flex-col rounded-lg border-[1px] border-lightgreen">
      <div
        class="flex flex-row items-start justify-between border-lightgreen px-5 py-3"
      >
        <p class="text-sm font-medium">
          {locale.t("links.linkForm.detail.assetsInLink")}
        </p>
        <div class="flex flex-col items-end gap-2">
          <div class="flex items-center gap-2">
            <Skeleton class="h-[17px] w-24" />
            <Skeleton class="h-4 w-4 rounded-full" />
          </div>
          <Skeleton class="h-4 w-12" />
        </div>
      </div>
      <div
        class="mx-5 flex flex-row items-center justify-between border-t border-lightgreen py-3"
      >
        <p class="text-sm font-medium">
          {locale.t("links.linkForm.detail.used")}
        </p>
        <Skeleton class="h-[17px] w-4" />
      </div>
    </div>
  </div>

  <div class="flex w-full items-center justify-between">
    <p class="text-sm font-medium">
      {locale.t("links.linkForm.detail.shareLink")}
    </p>
    <ChevronDown class="h-5 w-5 text-green" aria-hidden="true" />
  </div>

  <div class="mt-auto flex-none px-2 pt-2">
    <Skeleton class="h-11 w-full rounded-full bg-red-50" />
  </div>

  <div class="flex-none px-2 pt-4">
    <Skeleton class="h-11 w-full rounded-full bg-green/25" />
  </div>
</div>
