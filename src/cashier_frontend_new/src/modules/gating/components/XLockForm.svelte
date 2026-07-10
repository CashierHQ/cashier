<script lang="ts">
  import { locale } from "$lib/i18n";
  import PrimaryActionButton from "$modules/shared/components/PrimaryActionButton.svelte";
  import type { GatingStore } from "$modules/gating/state/gatingStore.svelte";
  import { AtSign, Info, Link, X } from "lucide-svelte";

  const {
    store,
    onLock,
  }: {
    store: GatingStore;
    onLock: () => void;
  } = $props();

  let submitted = $state(false);
  let ownedAccountEnabled = $derived(store.hasConfiguredXOwnedAccount);
  let followingEnabled = $derived(store.hasConfiguredXFollowing);
  let likedPostEnabled = $derived(store.hasConfiguredXLikedPost);
  let retweetedPostEnabled = $derived(store.hasConfiguredXRetweetedPost);

  const hasAnyError = $derived(
    (ownedAccountEnabled && store.xOwnedAccountSetupError !== null) ||
      (followingEnabled && store.xFollowingSetupError !== null) ||
      (likedPostEnabled && store.xLikedPostSetupError !== null) ||
      (retweetedPostEnabled && store.xRetweetedPostSetupError !== null),
  );

  const handleLock = () => {
    submitted = true;
    if (hasAnyError) return;

    if (ownedAccountEnabled) store.saveXOwnedAccountLock();
    if (followingEnabled) store.saveXFollowingLock();
    if (likedPostEnabled) store.saveXLikedPostLock();
    if (retweetedPostEnabled) store.saveXRetweetedPostLock();
    onLock();
  };
</script>

<div class="space-y-6">
  <!-- Owned account -->
  <div class="space-y-1.5 {ownedAccountEnabled ? '' : 'opacity-40'}">
    <p class="text-sm font-medium text-foreground">
      {locale.t("links.linkForm.lock.keyOwnedAccount")}
    </p>
    <div class="flex items-center gap-5">
      <div
        class="flex h-10 flex-1 items-center gap-1 rounded-lg border bg-background px-3 py-2
          {submitted && ownedAccountEnabled && store.xOwnedAccountSetupError
          ? 'border-[#D26060]'
          : 'border-[#d0d5dd]'}"
      >
        <AtSign
          class="h-4 w-4 flex-none text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="text"
          disabled={!ownedAccountEnabled}
          value={store.xOwnedAccountDraft}
          oninput={(e) =>
            store.setXOwnedAccountDraft(
              (e.currentTarget as HTMLInputElement).value,
            )}
          placeholder={locale.t("links.linkForm.lock.xHandlePlaceholder")}
          class="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-[#d9d9d9] disabled:cursor-not-allowed"
        />
        {#if ownedAccountEnabled && store.xOwnedAccountDraft}
          <button
            type="button"
            onclick={() => store.setXOwnedAccountDraft("")}
            class="flex-none text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        {/if}
      </div>
      <button
        type="button"
        onclick={() => {
          ownedAccountEnabled = !ownedAccountEnabled;
          if (!ownedAccountEnabled) store.clearXOwnedAccountDraft();
        }}
        aria-label="Toggle owned account gate"
        class="flex h-5 w-9 flex-none items-center overflow-hidden rounded-full p-0.5 {ownedAccountEnabled
          ? 'justify-end bg-green'
          : 'bg-[#e8f2ee]'}"
      >
        <div class="h-4 w-4 rounded-full bg-white shadow-sm"></div>
      </button>
    </div>
    {#if submitted && ownedAccountEnabled && store.xOwnedAccountSetupError}
      <p class="text-xs text-[#D26060]">{store.xOwnedAccountSetupError}</p>
    {/if}
  </div>

  <!-- Follow account -->
  <div class="space-y-1.5 {followingEnabled ? '' : 'opacity-40'}">
    <p class="text-sm font-medium text-foreground">
      {locale.t("links.linkForm.lock.key1FollowAccount")}
    </p>
    <div class="flex items-center gap-5">
      <div
        class="flex h-10 flex-1 items-center gap-1 rounded-lg border bg-background px-3 py-2
          {submitted && followingEnabled && store.xFollowingSetupError
          ? 'border-[#D26060]'
          : 'border-[#d0d5dd]'}"
      >
        <AtSign
          class="h-4 w-4 flex-none text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="text"
          disabled={!followingEnabled}
          value={store.xFollowingDraft}
          oninput={(e) =>
            store.setXFollowingDraft(
              (e.currentTarget as HTMLInputElement).value,
            )}
          placeholder={locale.t("links.linkForm.lock.xHandlePlaceholder")}
          class="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-[#d9d9d9] disabled:cursor-not-allowed"
        />
        {#if followingEnabled && store.xFollowingDraft}
          <button
            type="button"
            onclick={() => store.setXFollowingDraft("")}
            class="flex-none text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        {/if}
      </div>
      <button
        type="button"
        onclick={() => {
          followingEnabled = !followingEnabled;
          if (!followingEnabled) store.clearXFollowingDraft();
        }}
        aria-label="Toggle follow account gate"
        class="flex h-5 w-9 flex-none items-center overflow-hidden rounded-full p-0.5 {followingEnabled
          ? 'justify-end bg-green'
          : 'bg-[#e8f2ee]'}"
      >
        <div class="h-4 w-4 rounded-full bg-white shadow-sm"></div>
      </button>
    </div>
    {#if submitted && followingEnabled && store.xFollowingSetupError}
      <p class="text-xs text-[#D26060]">{store.xFollowingSetupError}</p>
    {/if}
  </div>

  <!-- Like post -->
  <div class="space-y-1.5 {likedPostEnabled ? '' : 'opacity-40'}">
    <p class="text-sm font-medium text-foreground">
      {locale.t("links.linkForm.lock.key2LikePost")}
    </p>
    <div class="flex items-center gap-5">
      <div
        class="flex h-10 flex-1 items-center gap-1 rounded-lg border bg-background px-3 py-2
          {submitted && likedPostEnabled && store.xLikedPostSetupError
          ? 'border-[#D26060]'
          : 'border-[#d0d5dd]'}"
      >
        <Link
          class="h-4 w-4 flex-none text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="text"
          disabled={!likedPostEnabled}
          value={store.xLikedPostDraft}
          oninput={(e) =>
            store.setXLikedPostDraft(
              (e.currentTarget as HTMLInputElement).value,
            )}
          placeholder={locale.t("links.linkForm.lock.enterUrlPost") ??
            "https://x.com/user/status/..."}
          class="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-[#d9d9d9] disabled:cursor-not-allowed"
        />
        {#if likedPostEnabled && store.xLikedPostDraft}
          <button
            type="button"
            onclick={() => store.setXLikedPostDraft("")}
            class="flex-none text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        {/if}
      </div>
      <button
        type="button"
        onclick={() => {
          likedPostEnabled = !likedPostEnabled;
          if (!likedPostEnabled) store.clearXLikedPostDraft();
        }}
        aria-label="Toggle like post gate"
        class="flex h-5 w-9 flex-none items-center overflow-hidden rounded-full p-0.5 {likedPostEnabled
          ? 'justify-end bg-green'
          : 'bg-[#e8f2ee]'}"
      >
        <div class="h-4 w-4 rounded-full bg-white shadow-sm"></div>
      </button>
    </div>
    {#if submitted && likedPostEnabled && store.xLikedPostSetupError}
      <p class="text-xs text-[#D26060]">{store.xLikedPostSetupError}</p>
    {/if}
  </div>

  <!-- Retweet post -->
  <div class="space-y-1.5 {retweetedPostEnabled ? '' : 'opacity-40'}">
    <p class="text-sm font-medium text-foreground">
      {locale.t("links.linkForm.lock.key3RetweetPost")}
    </p>
    <div class="flex items-center gap-5">
      <div
        class="flex h-10 flex-1 items-center gap-1 rounded-lg border bg-background px-3 py-2
          {submitted && retweetedPostEnabled && store.xRetweetedPostSetupError
          ? 'border-[#D26060]'
          : 'border-[#d0d5dd]'}"
      >
        <Link
          class="h-4 w-4 flex-none text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="text"
          disabled={!retweetedPostEnabled}
          value={store.xRetweetedPostDraft}
          oninput={(e) =>
            store.setXRetweetedPostDraft(
              (e.currentTarget as HTMLInputElement).value,
            )}
          placeholder={locale.t("links.linkForm.lock.enterUrlPost") ??
            "https://x.com/user/status/..."}
          class="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-[#d9d9d9] disabled:cursor-not-allowed"
        />
        {#if retweetedPostEnabled && store.xRetweetedPostDraft}
          <button
            type="button"
            onclick={() => store.setXRetweetedPostDraft("")}
            class="flex-none text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        {/if}
      </div>
      <button
        type="button"
        onclick={() => {
          retweetedPostEnabled = !retweetedPostEnabled;
          if (!retweetedPostEnabled) store.clearXRetweetedPostDraft();
        }}
        aria-label="Toggle retweet post gate"
        class="flex h-5 w-9 flex-none items-center overflow-hidden rounded-full p-0.5 {retweetedPostEnabled
          ? 'justify-end bg-green'
          : 'bg-[#e8f2ee]'}"
      >
        <div class="h-4 w-4 rounded-full bg-white shadow-sm"></div>
      </button>
    </div>
    {#if submitted && retweetedPostEnabled && store.xRetweetedPostSetupError}
      <p class="text-xs text-[#D26060]">{store.xRetweetedPostSetupError}</p>
    {/if}
  </div>

  <!-- Info note -->
  <div class="flex items-start gap-1.5 text-green">
    <Info class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
    <p class="text-sm">{locale.t("links.linkForm.lock.xAllKeysRequired")}</p>
  </div>

  <PrimaryActionButton type="button" onclick={handleLock}>
    {locale.t("links.linkForm.lock.lock")}
  </PrimaryActionButton>
</div>
