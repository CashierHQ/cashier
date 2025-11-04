<script lang="ts">
  import { Lock, Feather, Zap, ChevronDown, ChevronUp } from "lucide-svelte";
  import LinksList from "$modules/links/components/linksList.svelte";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";

  type Props = {
    onLoginClick?: () => void;
  };

  let { onLoginClick }: Props = $props();

  let isDevelopmentExpanded = $state(false);

  function toggleDevelopment() {
    isDevelopmentExpanded = !isDevelopmentExpanded;
  }
</script>

<div class="lg:bg-[url('/LandingPageBackgroundPattern.svg')] lg:bg-cover lg:bg-center lg:w-full lg:pt-24 flex-1">
  <!-- Development Disclaimer -->
  <div
    class="mx-auto px-4 py-2 bg-[#ECFEF3] border rounded-xl border-[#ACEFC6] w-10/12 lg:fixed lg:top-10 lg:w-96 lg:left-1/2 lg:-translate-x-1/2 transition-all duration-300 ease-in-out"
  >
    <div class="max-w-[1200px] mx-auto">
      <div class="flex flex-col gap-2 items-center text-primary text-[11px] lg:text-[14px]">
        <div class="flex flex-row gap-1.5 items-center w-full justify-between">
          <div class="flex flex-row gap-1.5 items-center flex-1 justify-center">
            <Lock class="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />
            <span>In Development</span>
          </div>
          <button
            onclick={toggleDevelopment}
            class="flex items-center justify-center w-5 h-5 hover:bg-primary/10 cursor-pointer rounded-full transition-colors duration-200"
            aria-label={isDevelopmentExpanded ? "Collapse development notice" : "Expand development notice"}
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
            This website is currently in development and provided for demonstration purposes only. It is
            not intended for public use. Any data entered or actions taken on this site may not be
            secure, saved, or processed correctly. Use is at your own risk.
          </p>
        {/if}
      </div>
    </div>
  </div>

  {#if userProfile.isLoggedIn()}
    <!-- Logged in content -->
    <div class="w-full lg:w-1/3 mx-auto mt-4 px-4">
      <LinksList />
    </div>
  {:else}
    <!-- Main content for unauthenticated users -->
    <div class="flex flex-col lg:flex-row lg:w-full lg:justify-center lg:px-[200px] md:px-8 pb-8">
      <!-- Information section -->
      <div
        class="flex flex-col items-center md:items-center lg:items-start lg:justify-center lg:w-[60%] md:text-center lg:text-left"
      >
        <!-- Badges -->
        <div class="flex gap-4 items-center mt-4 md:justify-center flex-wrap">
          <div
            class="flex flex-row gap-1.5 items-center text-primary text-[11px] md:text-[13px] lg:text-[14px] bg-[#ECFEF3] rounded-full w-fit px-3 py-1 border border-[#ACEFC6]"
          >
            <Feather class="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />
            <span>Easy</span>
          </div>
          <div
            class="flex flex-row gap-1.5 items-center text-primary text-[11px] md:text-[13px] lg:text-[14px] bg-[#ECFEF3] rounded-full w-fit px-3 py-1 border border-[#ACEFC6]"
          >
            <Zap class="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />
            <span>Fast</span>
          </div>
          <div
            class="flex flex-row gap-1.5 items-center text-primary text-[11px] md:text-[13px] lg:text-[14px] bg-[#ECFEF3] rounded-full w-fit px-3 py-1 border border-[#ACEFC6]"
          >
            <Lock class="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />
            <span>Safe</span>
          </div>
        </div>

        <!-- Title -->
        <h1
          class="text-[32px] md:text-[48px] lg:text-[60px] font-bold mt-2 lg:my-[16px] leading-[1.2] px-4 md:px-8 lg:px-0 text-center md:text-center lg:text-left"
        >
          Share crypto <span class="text-primary">as easily as texting</span>
        </h1>

        <!-- Description -->
        <p
          class="text-[14px] md:text-[18px] font-light text-[#475467] px-4 md:px-8 lg:px-0 lg:text-[20px] text-center md:text-center lg:text-left"
        >
          Send or receive tokens & NFTs with just a link or QR code
        </p>

        <!-- Features list -->
        <ul
          class="flex flex-col gap-2 md:gap-3 mt-4 lg:mt-6 self-center md:self-center lg:self-start px-4 md:px-8 lg:px-0"
        >
          <li class="flex items-center gap-2 md:justify-center lg:justify-start">
            <div class="w-2 h-2 bg-primary rounded-full"></div>
            <p class="text-[10px] md:text-[14px] text-[#475467] lg:text-[16px] text-left font-light">
              No wallet setup or address sharing
            </p>
          </li>
          <li class="flex items-center gap-2 md:justify-center lg:justify-start">
            <div class="w-2 h-2 bg-primary rounded-full"></div>
            <p class="text-[10px] md:text-[14px] text-[#475467] lg:text-[16px] text-left font-light">
              Use for tips, invoice, airdrops & swaps
            </p>
          </li>
          <li class="flex items-center gap-2 md:justify-center lg:justify-start">
            <div class="w-2 h-2 bg-primary rounded-full"></div>
            <p class="text-[10px] md:text-[14px] text-[#475467] lg:text-[16px] text-left font-light">
              Lock with a password, NFT, or X
            </p>
          </li>
        </ul>

        <!-- Get started button - Desktop -->
        <button
          onclick={() => onLoginClick?.()}
          class="items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-primary text-primary-foreground shadow hover:bg-primary/90 px-4 hidden md:block lg:block h-[48px] text-[1rem] w-[248px] rounded-full mt-[48px] md:mt-8 lg:mt-[48px]"
          type="button"
        >
          Get started
        </button>
      </div>

      <!-- Image container -->
      <div class="flex flex-col items-center justify-center mt-6 md:mt-8 lg:w-[40%]">
        <img
          class="mx-auto w-[55%] max-w-[300px] max-h-[40vh] object-contain lg:w-[70%] lg:max-w-[400px] lg:max-h-[50vh]"
          src="/LandingPageMainImage.svg"
          alt="Cashier landing page illustration"
        />
        <!-- Get started button - Mobile -->
        <button
          onclick={() => onLoginClick?.()}
          class="inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-primary text-primary-foreground shadow hover:bg-primary/90 px-4 h-11 text-[1rem] w-[90%] max-w-[350px] rounded-full mx-auto mt-6 mb-8 md:hidden"
          type="button"
        >
          Get started
        </button>
      </div>
    </div>
  {/if}
</div>
