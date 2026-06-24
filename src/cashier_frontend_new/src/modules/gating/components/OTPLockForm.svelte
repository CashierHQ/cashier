<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import {
    DrawerContent,
    DrawerHeader,
    DrawerNestedRoot,
    DrawerTitle,
  } from "$lib/shadcn/components/ui/drawer";
  import { COUNTRY_DIAL_CODES } from "$modules/shared/data/countries";
  import type { GatingStore } from "$modules/gating/state/gatingStore.svelte";
  import { ChevronDown, Info, Mail, Smartphone, X } from "lucide-svelte";

  const {
    store,
    onLock,
  }: {
    store: GatingStore;
    onLock: () => void;
  } = $props();

  let activeTab = $state<"phone" | "email">("phone");
  let submitted = $state(false);
  let countryDrawerOpen = $state(false);
  let countrySearch = $state("");
  let dialCode = $state("+1");
  let countryCode = $state("US");
  let rawPhone = $state("");
  let emailDraft = $state("");

  const selectedCountryFlagClass = $derived(
    `fi fi-${countryCode.toLowerCase()} fis flex-none rounded-sm`,
  );

  const filteredCountries = $derived.by(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRY_DIAL_CODES;
    return COUNTRY_DIAL_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q),
    );
  });

  function handleCountrySelect(code: string, dial: string) {
    countryCode = code;
    dialCode = dial;
    store.setOTPPhoneDraft(dial + rawPhone);
    countryDrawerOpen = false;
    countrySearch = "";
  }

  const handleLock = () => {
    submitted = true;
    if (activeTab === "phone") {
      store.setOTPPhoneDraft(dialCode + rawPhone);
      if (store.otpPhoneSetupError) return;
      store.saveOTPSmsLock();
    } else {
      store.setOTPEmailDraft(emailDraft);
      if (store.otpEmailSetupError) return;
      store.saveOTPEmailLock();
    }
    onLock();
  };
</script>

<div class="space-y-5">
  <!-- Tab switcher -->
  <div
    class="mx-auto flex w-fit rounded-full border border-border bg-background p-0.5"
  >
    <button
      type="button"
      class="flex h-7 items-center gap-1.5 rounded-full px-4 text-xs transition-colors {activeTab ===
      'phone'
        ? 'bg-lightgreen text-green'
        : 'text-muted-foreground'}"
      onclick={() => {
        activeTab = "phone";
        submitted = false;
      }}
    >
      <Smartphone class="h-4 w-4" aria-hidden="true" />
      Phone
    </button>
    <button
      type="button"
      class="flex h-7 items-center gap-1.5 rounded-full px-4 text-xs transition-colors {activeTab ===
      'email'
        ? 'bg-lightgreen text-green'
        : 'text-muted-foreground'}"
      onclick={() => {
        activeTab = "email";
        submitted = false;
      }}
    >
      <Mail class="h-4 w-4" aria-hidden="true" />
      Email
    </button>
  </div>

  {#if activeTab === "phone"}
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label for="otp-phone" class="text-sm font-medium text-foreground">
          Recipient's phone number
        </label>
        <button
          type="button"
          class="text-xs font-medium text-[#D26060]"
          onclick={() => {
            submitted = false;
            rawPhone = "";
            store.setOTPPhoneDraft("");
          }}
        >
          Reset
        </button>
      </div>

      <div
        class="flex h-11 items-center rounded-lg border bg-background px-3 focus-within:border-green {submitted &&
        store.otpPhoneSetupError
          ? 'border-[#D26060]'
          : 'border-border'}"
      >
        <div class="mr-2 flex-none">
          <button
            type="button"
            class="flex h-9 items-center gap-2 rounded-md border border-transparent px-1.5 text-sm transition-colors hover:border-border hover:bg-lightgreen"
            aria-label="Country dial code"
            aria-expanded={countryDrawerOpen}
            onclick={() => (countryDrawerOpen = true)}
          >
            <span class={selectedCountryFlagClass} aria-hidden="true"></span>
            <span class="min-w-9 text-left">{dialCode}</span>
            <ChevronDown class="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <input
          id="otp-phone"
          type="tel"
          inputmode="numeric"
          bind:value={rawPhone}
          oninput={() => store.setOTPPhoneDraft(dialCode + rawPhone)}
          placeholder="(555) 000-0000"
          class="min-w-0 flex-1 bg-transparent pl-2 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {#if submitted && store.otpPhoneSetupError}
        <p class="text-xs text-[#D26060]">{store.otpPhoneSetupError}</p>
      {/if}
    </div>
  {:else}
    <div class="space-y-2">
      <label for="otp-email" class="text-sm font-medium text-foreground">
        Recipient's email address
      </label>
      <input
        id="otp-email"
        type="email"
        bind:value={emailDraft}
        oninput={() => store.setOTPEmailDraft(emailDraft)}
        placeholder="Enter the email"
        class="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-green {submitted &&
        store.otpEmailSetupError
          ? 'border-[#D26060]'
          : ''}"
      />
      {#if submitted && store.otpEmailSetupError}
        <p class="text-xs text-[#D26060]">{store.otpEmailSetupError}</p>
      {/if}
    </div>
  {/if}

  <div class="flex items-start gap-2 text-xs text-green">
    <Info class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
    <p>The last 4 digits will be shown to whoever opens the link.</p>
  </div>

  <Button
    type="button"
    onclick={handleLock}
    class="h-12 w-full rounded-full bg-green text-primary-foreground hover:bg-green/90 disabled:bg-disabledgreen"
  >
    Lock
  </Button>
</div>

<DrawerNestedRoot bind:open={countryDrawerOpen}>
  <DrawerContent class="max-w-full w-[400px] mx-auto p-5">
    <DrawerHeader class="pb-5 pl-0 pr-0 pt-0">
      <div class="relative flex items-center justify-center">
        <DrawerTitle class="text-base font-semibold">Country code</DrawerTitle>
        <button
          type="button"
          class="absolute right-0 top-1/2 -translate-y-1/2 text-foreground"
          aria-label="Close country picker"
          onclick={() => (countryDrawerOpen = false)}
        >
          <X class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </DrawerHeader>

    <div class="space-y-3">
      <input
        type="search"
        bind:value={countrySearch}
        placeholder="Search country or dial code…"
        class="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-green"
      />

      <div class="max-h-[55vh] overflow-y-auto">
        {#each filteredCountries as country (country.code)}
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-lightgreen"
            onclick={() => handleCountrySelect(country.code, country.dialCode)}
          >
            <span
              class="fi fi-{country.code.toLowerCase()} fis flex-none rounded-sm"
              aria-hidden="true"
            ></span>
            <span class="min-w-0 flex-1 truncate">{country.name}</span>
            <span class="flex-none text-muted-foreground"
              >{country.dialCode}</span
            >
          </button>
        {:else}
          <p class="px-3 py-3 text-sm text-muted-foreground">
            No countries found.
          </p>
        {/each}
      </div>
    </div>
  </DrawerContent>
</DrawerNestedRoot>
