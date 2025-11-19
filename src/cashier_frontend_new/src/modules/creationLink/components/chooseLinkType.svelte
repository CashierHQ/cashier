<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import Input from "$lib/shadcn/components/ui/input/input.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import { getLinkTemplateInfo } from "../utils/linkTemplateInfo";
  import {
    LinkType,
    type LinkTypeValue,
  } from "$modules/links/types/link/linkType";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { locale } from "$lib/i18n";
  import { ChevronLeft, ChevronRight } from "lucide-svelte";
  import { toast } from "svelte-sonner";

  const {
    link,
  }: {
    link: LinkCreationStore;
  } = $props();

  $effect(() => {
    if (link.state.step !== LinkStep.CHOOSE_TYPE) {
      goto(resolve("/links"));
    }
  });

  const linkTypes: LinkTypeValue[] = [
    LinkType.TIP,
    LinkType.AIRDROP,
    LinkType.TOKEN_BASKET,
    LinkType.RECEIVE_PAYMENT,
  ];

  let currentSlide = $state(0);

  $effect(() => {
    const linkType = link.createLinkData.linkType;
    const index = linkTypes.indexOf(linkType);
    currentSlide = index >= 0 ? index : 0;
  });

  // Swipe handling
  let touchStartX = $state(0);
  let touchStartY = $state(0);
  let touchEndX = $state(0);
  let touchEndY = $state(0);
  const minSwipeDistance = 50;

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }

  function handleTouchMove(e: TouchEvent) {
    const currentX = e.changedTouches[0].screenX;
    const currentY = e.changedTouches[0].screenY;
    const deltaX = Math.abs(currentX - touchStartX);
    const deltaY = Math.abs(currentY - touchStartY);

    if (deltaX > deltaY && deltaX > 10) {
      e.preventDefault();
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }

  function handleSwipe() {
    const deltaX = touchStartX - touchEndX;
    const deltaY = Math.abs(touchStartY - touchEndY);

    if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  }

  function handleSlideChange(index: number) {
    if (index >= 0 && index < linkTypes.length) {
      link.createLinkData = {
        ...link.createLinkData,
        linkType: linkTypes[index],
      };
      currentSlide = index;
    }
  }

  function handleOnInput(
    e: Event & { currentTarget: EventTarget & HTMLInputElement },
  ) {
    link.createLinkData = {
      ...link.createLinkData,
      title: e.currentTarget.value,
    };
  }

  function goToPrevious() {
    const currentIndex = linkTypes.indexOf(link.createLinkData.linkType);
    const actualCurrent = currentIndex >= 0 ? currentIndex : 0;
    if (actualCurrent > 0) {
      handleSlideChange(actualCurrent - 1);
    }
  }

  function goToNext() {
    const currentIndex = linkTypes.indexOf(link.createLinkData.linkType);
    const actualCurrent = currentIndex >= 0 ? currentIndex : 0;
    if (actualCurrent < linkTypes.length - 1) {
      handleSlideChange(actualCurrent + 1);
    }
  }

  async function goNext() {
    if (!link.createLinkData.title || link.createLinkData.title.trim() === "") {
      toast.error(locale.t("links.linkForm.chooseType.titleRequired"));
      return;
    }

    try {
      await link.goNext();
    } catch (e) {
      toast.error(
        locale.t("links.linkForm.chooseType.failedToProceed") + ": " + e,
      );
    }
  }
</script>

<div class="space-y-4 relative grow-1 flex flex-col mt-2 sm:mt-0">
  <div class="mb-4">
    <Label for="title" class="mb-2 block"
      >{locale.t("links.linkForm.chooseType.linkTitle")}</Label
    >
    <Input
      id="title"
      value={link.createLinkData.title}
      oninput={handleOnInput}
      placeholder={locale.t("links.linkForm.chooseType.titlePlaceholder")}
    />
  </div>

  <div class="input-label-field-container mt-4">
    <Label for="linkType" class="input-label mb-2 block"
      >{locale.t("links.linkForm.chooseType.linkType")}</Label
    >
    <div
      class="flex flex-col items-center justify-center bg-lightgreen rounded-[16px] py-3 h-fit"
    >
      <div class="relative w-full overflow-hidden h-full">
        <button
          type="button"
          onclick={goToPrevious}
          disabled={currentSlide === 0}
          class="absolute cursor-pointer left-2 top-1/2 -translate-y-1/2 z-10 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous"
        >
          <ChevronLeft class="w-6 h-6 text-green" aria-hidden="true" />
        </button>

        <div
          class="relative flex transition-transform duration-300 ease-in-out h-[20rem] md:h-[400px] pb-2"
          style="transform: translateX(-{currentSlide *
            25}%); width: 400%; touch-action: pan-y;"
          ontouchstart={handleTouchStart}
          ontouchmove={handleTouchMove}
          ontouchend={handleTouchEnd}
        >
          {#each linkTypes as linkType (linkType)}
            {@const info = getLinkTemplateInfo(linkType)}
            <div
              class="flex-shrink-0 flex flex-col justify-center items-center px-2 h-[100%]"
              style="width: 25%;"
            >
              <div class="flex flex-col items-center justify-center mb-2 gap-0">
                <p class="text-[14px] font-medium uppercase">{info.label}</p>
                <p class="text-sm text-gray-500"></p>
              </div>
              <div class="relative h-fit">
                <div
                  class="flex flex-col items-center justify-center mb-0 mt-4"
                >
                  <div class="relative h-[320px] aspect-[9/16]">
                    <div
                      class="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-5 bg-gray-700 rounded-b-lg z-10"
                    ></div>
                    <div
                      class="h-full w-full border-[6px] border-gray-700 rounded-3xl bg-white overflow-hidden flex flex-col justify-center items-center px-2 py-4"
                    >
                      <img
                        class="w-[50%] mx-auto mt-6 mb-2"
                        src="/logo.svg"
                        alt="Logo"
                      />
                      <div
                        class="bg-lightgreen px-2 py-4 rounded-xl flex flex-col items-center justify-center w-full"
                      >
                        <img
                          alt={info.title}
                          class="w-[50%] object-contain"
                          src={info.image}
                        />
                        <div class="flex-1 p-4 flex flex-col">
                          <h3 class="font-semibold mb-2 text-center">
                            {info.title}
                          </h3>
                          <p class="text-[10px] text-gray-600 text-center">
                            {info.description}
                          </p>
                        </div>
                        <button
                          disabled
                          class="bg-green text-white rounded-full w-full py-1 text-[10px]"
                        >
                          {info.buttonText}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>

        <button
          type="button"
          onclick={goToNext}
          disabled={currentSlide === linkTypes.length - 1}
          class="absolute cursor-pointer right-2 top-1/2 -translate-y-1/2 z-10 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next"
        >
          <ChevronRight class="w-6 h-6 text-green" aria-hidden="true" />
        </button>

        <div
          class="flex gap-4 items-center justify-center w-full mt-10 md:mt-0"
        >
          <div class="flex gap-4 bg-white/50 px-2 py-2 rounded-full">
            {#each linkTypes, index (index)}
              <button
                type="button"
                onclick={() => handleSlideChange(index)}
                class="w-2 h-2 rounded-full transition-colors {index ===
                currentSlide
                  ? 'bg-green cursor-pointer'
                  : 'bg-white cursor-pointer'}"
                aria-label="Go to slide {index + 1}"
              ></button>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>

  <div
    class="flex-none w-full w-[95%] mx-auto px-2 sticky bottom-2 left-0 right-0 z-10"
  >
    <Button
      onclick={goNext}
      class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
      type="button"
    >
      {locale.t("links.linkForm.chooseType.continue")}
    </Button>
  </div>
</div>
