<script lang="ts">
  import { locale } from "$lib/i18n";
  import PrimaryActionButton from "$modules/shared/components/PrimaryActionButton.svelte";
  import {
    DrawerContent,
    DrawerHeader,
    DrawerNestedRoot,
    DrawerTitle,
  } from "$lib/shadcn/components/ui/drawer";
  import { COUNTRY_DIAL_CODES } from "$modules/shared/data/countries";
  import type { GatingStore } from "$modules/gating/state/gatingStore.svelte";
  import { filterSmsEligibleCountries } from "$modules/shared/services/countryPolicy";
  import {
    buildInternationalPhoneNumber,
    formatPhoneNumberForCountry,
    getDigitsOnly,
    getPhoneDialCode,
    getPhonePlaceholder,
  } from "$modules/shared/services/phoneNumber";
  import { ChevronDown, Mail, Smartphone, X } from "lucide-svelte";

  const {
    store,
    onLock,
  }: {
    store: GatingStore;
    onLock: () => void;
  } = $props();

  const smsEligibleCountries = filterSmsEligibleCountries(COUNTRY_DIAL_CODES);
  const defaultCountryCode =
    smsEligibleCountries.find((country) => country.code === "CA")?.code ??
    smsEligibleCountries[0]?.code ??
    "CA";

  let activeTab = $derived<"phone" | "email">(
    store.hasConfiguredOTPEmail ? "email" : "phone",
  );
  let submitted = $state(false);
  let countryDrawerOpen = $state(false);
  let countrySearch = $state("");
  let countryCode = $derived(store.otpCountryCode || defaultCountryCode);
  let phoneDigits = $derived(store.otpPhoneDigits);
  let emailDraft = $derived(store.otpEmail ?? "");

  const dialCode = $derived(getPhoneDialCode(countryCode));
  const phonePlaceholder = $derived(getPhonePlaceholder(countryCode));
  const formattedPhone = $derived(
    formatPhoneNumberForCountry(phoneDigits, countryCode),
  );
  const selectedCountryFlagClass = $derived(
    `fi fi-${countryCode.toLowerCase()} fis flex-none rounded-full text-xl`,
  );

  const filteredCountries = $derived.by(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return smsEligibleCountries;
    return smsEligibleCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        getPhoneDialCode(c.code, c.dialCode).includes(q),
    );
  });

  function updatePhoneDraft(selectedCountryCode = countryCode) {
    store.setOTPPhoneDraft(
      buildInternationalPhoneNumber(selectedCountryCode, phoneDigits),
    );
  }

  function handleCountrySelect(code: string) {
    countryCode = code;
    updatePhoneDraft(code);
    countryDrawerOpen = false;
    countrySearch = "";
  }

  function handlePhoneKeydown(e: KeyboardEvent) {
    if (e.key !== "Backspace") return;

    const input = e.currentTarget as HTMLInputElement;
    const cursorIndex = input.selectionStart ?? input.value.length;
    const previousCharacter = input.value[cursorIndex - 1];

    if (!previousCharacter || /\d/.test(previousCharacter)) return;

    const digitIndexToRemove =
      getDigitsOnly(input.value.slice(0, cursorIndex)).length - 1;
    if (digitIndexToRemove < 0) return;

    e.preventDefault();
    phoneDigits =
      phoneDigits.slice(0, digitIndexToRemove) +
      phoneDigits.slice(digitIndexToRemove + 1);
    updatePhoneDraft();
  }

  const handleLock = () => {
    submitted = true;
    if (activeTab === "phone") {
      updatePhoneDraft();
      if (store.otpPhoneSetupError) return;
      store.saveOTPSmsLock(phoneDigits, countryCode);
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
      class="flex h-7 items-center gap-1.5 rounded-full px-4 text-base transition-colors {activeTab ===
      'phone'
        ? 'bg-lightgreen text-green'
        : 'text-muted-foreground'}"
      onclick={() => {
        activeTab = "phone";
        submitted = false;
      }}
    >
      <Smartphone class="h-5 w-5" aria-hidden="true" />
      {locale.t("links.linkForm.lock.otp.phone")}
    </button>
    <button
      type="button"
      class="flex h-7 items-center gap-1.5 rounded-full px-4 text-base transition-colors {activeTab ===
      'email'
        ? 'bg-lightgreen text-green'
        : 'text-muted-foreground'}"
      onclick={() => {
        activeTab = "email";
        submitted = false;
      }}
    >
      <Mail class="h-5 w-5" aria-hidden="true" />
      {locale.t("links.linkForm.lock.otp.email")}
    </button>
  </div>

  {#if activeTab === "phone"}
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label for="otp-phone" class="text-sm font-medium text-foreground">
          {locale.t("links.linkForm.lock.otp.recipientPhoneNumber")}
        </label>
        <button
          type="button"
          class="text-xs font-medium text-[#D26060]"
          onclick={() => {
            submitted = false;
            phoneDigits = "";
            store.setOTPPhoneDraft("");
          }}
        >
          {locale.t("links.linkForm.lock.reset")}
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
            aria-label={locale.t("links.linkForm.lock.otp.countryDialCode")}
            aria-expanded={countryDrawerOpen}
            onclick={() => (countryDrawerOpen = true)}
          >
            <span class={selectedCountryFlagClass} aria-hidden="true"></span>
            <span class="text-left">{dialCode}</span>
            <ChevronDown class="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <input
          id="otp-phone"
          type="tel"
          inputmode="numeric"
          value={formattedPhone}
          oninput={(e) => {
            phoneDigits = getDigitsOnly(
              (e.currentTarget as HTMLInputElement).value,
            );
            updatePhoneDraft();
          }}
          onkeydown={handlePhoneKeydown}
          placeholder={phonePlaceholder}
          class="min-w-0 flex-1 bg-transparent pl-0 text-sm outline-none placeholder:text-muted-foreground/50"
        />
      </div>

      {#if submitted && store.otpPhoneSetupError}
        <p class="text-xs text-[#D26060]">{store.otpPhoneSetupError}</p>
      {/if}
    </div>
  {:else}
    <div class="space-y-2">
      <label for="otp-email" class="text-sm font-medium text-foreground">
        {locale.t("links.linkForm.lock.otp.recipientEmailAddress")}
      </label>
      <input
        id="otp-email"
        type="email"
        bind:value={emailDraft}
        oninput={() => store.setOTPEmailDraft(emailDraft)}
        placeholder={locale.t("links.linkForm.lock.otp.enterEmail")}
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

  <PrimaryActionButton type="button" onclick={handleLock}>
    {locale.t("links.linkForm.lock.lock")}
  </PrimaryActionButton>
</div>

<DrawerNestedRoot bind:open={countryDrawerOpen}>
  <DrawerContent class="max-w-full w-[400px] mx-auto p-5">
    <DrawerHeader class="pb-5 pl-0 pr-0 pt-0">
      <div class="relative flex items-center justify-center">
        <DrawerTitle class="text-base font-semibold">
          {locale.t("links.linkForm.lock.otp.countryCode")}
        </DrawerTitle>
        <button
          type="button"
          class="absolute right-0 top-1/2 -translate-y-1/2 text-foreground"
          aria-label={locale.t("links.linkForm.lock.otp.closeCountryPicker")}
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
        placeholder={locale.t(
          "links.linkForm.lock.otp.searchCountryOrDialCode",
        )}
        class="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-green"
      />

      <div class="max-h-[55vh] overflow-y-auto">
        {#each filteredCountries as country (country.code)}
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-lightgreen"
            onclick={() => handleCountrySelect(country.code)}
          >
            <span
              class="fi fi-{country.code.toLowerCase()} fis flex-none rounded-sm"
              aria-hidden="true"
            ></span>
            <span class="min-w-0 flex-1 truncate">{country.name}</span>
            <span class="flex-none text-muted-foreground">
              {getPhoneDialCode(country.code, country.dialCode)}
            </span>
          </button>
        {:else}
          <p class="px-3 py-3 text-sm text-muted-foreground">
            {locale.t("links.linkForm.lock.otp.noCountriesFound")}
          </p>
        {/each}
      </div>
    </div>
  </DrawerContent>
</DrawerNestedRoot>
