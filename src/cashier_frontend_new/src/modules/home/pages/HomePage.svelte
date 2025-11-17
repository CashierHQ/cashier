<script lang="ts">
  import { Lock, Feather, Zap, ChevronDown, ChevronUp } from "lucide-svelte";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  import { locale } from "$lib/i18n";

  type Props = {
    onLoginClick?: () => void;
  };

  let { onLoginClick }: Props = $props();

  let isDevelopmentExpanded = $state(false);
  let isImageLoading = $state(true);

  function toggleDevelopment() {
    isDevelopmentExpanded = !isDevelopmentExpanded;
  }

  function onImageLoaded() {
    isImageLoading = false;
  }
</script>

<div
  class="lg:bg-[url('/LandingPageBackgroundPattern.svg')] lg:bg-cover lg:bg-center lg:w-full lg:pt-[12vh] flex-1"
>
  <!-- Development Disclaimer -->
  <div
    class="mx-auto px-4 py-2 bg-[#ECFEF3] border rounded-xl border-[#ACEFC6] w-10/12 lg:fixed lg:top-10 lg:w-96 lg:left-1/2 lg:-translate-x-1/2 transition-all duration-300 ease-in-out"
  >
    <div class="max-w-[1200px] mx-auto">
      <div
        class="flex flex-col gap-2 items-center text-primary text-[11px] lg:text-[14px]"
      >
        <div class="flex flex-row gap-1.5 items-center w-full justify-between">
          <div class="flex flex-row gap-1.5 items-center flex-1 justify-center">
            <Lock class="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />
            <span>{locale.t("home.homePage.inDevelopment")}</span>
          </div>
          <button
            onclick={toggleDevelopment}
            class="flex items-center justify-center w-5 h-5 hover:bg-primary/10 cursor-pointer rounded-full transition-colors duration-200"
            aria-label={isDevelopmentExpanded
              ? locale.t("home.homePage.collapseDevelopmentNotice")
              : locale.t("home.homePage.expandDevelopmentNotice")}
          >
            {#if isDevelopmentExpanded}
              <ChevronUp class="w-3 h-3 transition-transform duration-200" />
            {:else}
              <ChevronDown class="w-3 h-3 transition-transform duration-200" />
            {/if}
          </button>
        </div>
        {#if isDevelopmentExpanded}
          <p
            class="text-[10px] lg:text-[12px] text-[#475467] text-center transition-all duration-300 ease-in-out"
          >
            {locale.t("home.homePage.developmentDisclaimer")}
          </p>
        {/if}
      </div>
    </div>
  </div>

  {#if userProfile.isLoggedIn()}
    <!-- Logged in content -->
    <div class="w-full lg:w-1/3 mx-auto mt-4 px-4">Logged in</div>
  {:else}
    <!-- Main content for unauthenticated users -->
    <div
      class="flex flex-col lg:flex-row lg:w-full lg:justify-center lg:px-[200px] md:px-8 pb-8"
    >
      <div
        class="flex flex-col items-center md:items-center lg:items-start lg:justify-center lg:w-[60%] md:text-center lg:text-left"
      >
        <div class="flex gap-4 items-center mt-4 md:justify-center flex-wrap">
          <div
            class="flex flex-row gap-1.5 items-center text-primary text-[11px] md:text-[13px] lg:text-[14px] bg-[#ECFEF3] rounded-full w-fit px-3 py-1 border border-[#ACEFC6]"
          >
            <Feather class="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />
            <span>{locale.t("home.homePage.easy")}</span>
          </div>
          <div
            class="flex flex-row gap-1.5 items-center text-primary text-[11px] md:text-[13px] lg:text-[14px] bg-[#ECFEF3] rounded-full w-fit px-3 py-1 border border-[#ACEFC6]"
          >
            <Zap class="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />
            <span>{locale.t("home.homePage.fast")}</span>
          </div>
          <div
            class="flex flex-row gap-1.5 items-center text-primary text-[11px] md:text-[13px] lg:text-[14px] bg-[#ECFEF3] rounded-full w-fit px-3 py-1 border border-[#ACEFC6]"
          >
            <Lock class="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />
            <span>{locale.t("home.homePage.safe")}</span>
          </div>
        </div>

        <h1
          class="text-[32px] md:text-[48px] lg:text-[60px] font-bold mt-2 lg:my-[16px] leading-[1.2] px-4 md:px-8 lg:px-0 text-center md:text-center lg:text-left"
        >
          {locale.t("home.homePage.title")}
          <span class="text-primary"
          >{locale.t("home.homePage.titleHighlight")}</span
          >
        </h1>

        <p
          class="text-[14px] md:text-[18px] font-light text-[#475467] px-4 md:px-8 lg:px-0 lg:text-[20px] text-center md:text-center lg:text-left"
        >
          {locale.t("home.homePage.subtitle")}
        </p>

        <ul
          class="flex flex-col gap-2 md:gap-3 mt-4 lg:mt-6 self-center md:self-center lg:self-start px-4 md:px-8 lg:px-0"
        >
          <li
            class="flex items-center gap-2 md:justify-center lg:justify-start"
          >
            <div class="w-2 h-2 bg-primary rounded-full"></div>
            <p
              class="text-[10px] md:text-[14px] text-[#475467] lg:text-[16px] text-left font-light"
            >
              {locale.t("home.homePage.feature1")}
            </p>
          </li>
          <li
            class="flex items-center gap-2 md:justify-center lg:justify-start"
          >
            <div class="w-2 h-2 bg-primary rounded-full"></div>
            <p
              class="text-[10px] md:text-[14px] text-[#475467] lg:text-[16px] text-left font-light"
            >
              {locale.t("home.homePage.feature2")}
            </p>
          </li>
          <li
            class="flex items-center gap-2 md:justify-center lg:justify-start"
          >
            <div class="w-2 h-2 bg-primary rounded-full"></div>
            <p
              class="text-[10px] md:text-[14px] text-[#475467] lg:text-[16px] text-left font-light"
            >
              {locale.t("home.homePage.feature3")}
            </p>
          </li>
        </ul>

        <button
          onclick={() => onLoginClick?.()}
          class="items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-primary text-primary-foreground shadow hover:bg-primary/90 px-4 hidden md:block lg:block h-[48px] text-[1rem] w-[248px] rounded-full mt-[48px] md:mt-8 lg:mt-[48px]"
          type="button"
        >
          {locale.t("home.homePage.getStarted")}
        </button>
      </div>

      <div
        class="flex flex-col items-center justify-center mt-6 md:mt-8 lg:w-[40%]"
      >
        {#if isImageLoading}
          <div
            class="animate-pulse bg-[#ECFEF3] border rounded-xl border-[#ACEFC6] mx-auto w-[55%] h-[40vh] min-h-[40vh] max-h-[40vh] lg:min-h-[50vh] lg:max-h-[50vh] lg:w-[70%] lg:max-w-[400px]">
          </div>
        {/if}

        <img
          class:hidden={isImageLoading}
          class="mx-auto w-[55%] max-w-[300px] h-[40vh] max-h-[40vh] object-contain lg:w-[70%] lg:h-[50vh] lg:max-w-[400px] lg:max-h-[50vh]"
          src="/LandingPageMainImage.png"
          alt="Cashier landing page illustration"
          onload={onImageLoaded}
        />
        <!-- Get started button - Mobile -->
        <button
          onclick={() => onLoginClick?.()}
          class="inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-primary text-primary-foreground shadow hover:bg-primary/90 px-4 h-11 text-[1rem] w-[90%] max-w-[350px] rounded-full mx-auto mt-6 mb-8 md:hidden"
          type="button"
        >
          {locale.t("home.homePage.getStarted")}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>

</style>