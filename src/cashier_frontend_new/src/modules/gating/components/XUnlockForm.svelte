<script lang="ts">
  import xIcon from "$lib/assets/x-icon.svg";
  import type { GateForUser } from "$lib/generated/cashier_backend/cashier_backend.did";
  import { locale } from "$lib/i18n";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { cashierBackendService } from "$modules/links/services/cashierBackend";
  import { Check, CircleAlert, CircleX, RefreshCw } from "lucide-svelte";
  import { GateSDK } from "@cashier/gate-sdk";
  import { PUBLIC_GATE_ORIGIN } from "$env/static/public";

  const gateSDK = new GateSDK({ gateOrigin: PUBLIC_GATE_ORIGIN });

  const {
    linkId,
    gate,
    onUnlocked,
    onClose,
  }: {
    linkId: string;
    gate: GateForUser;
    onUnlocked: () => void;
    onClose: () => void;
  } = $props();

  const gateType = $derived(
    "XFollowing" in gate.gate.key
      ? "following"
      : "XOwnedAccount" in gate.gate.key
        ? "owned"
        : "XLikedPost" in gate.gate.key
          ? "liked"
          : "XRetweetedPost" in gate.gate.key
            ? "retweeted"
            : "unknown",
  );

  const targetValue = $derived(
    "XFollowing" in gate.gate.key
      ? gate.gate.key.XFollowing
      : "XOwnedAccount" in gate.gate.key
        ? gate.gate.key.XOwnedAccount
        : "XLikedPost" in gate.gate.key
          ? gate.gate.key.XLikedPost
          : "XRetweetedPost" in gate.gate.key
            ? gate.gate.key.XRetweetedPost
            : "",
  );

  const verifyLabel = $derived(
    gateType === "following"
      ? (locale.t("links.linkForm.lock.key2FollowAccount") ?? "Follow account")
      : gateType === "owned"
        ? locale.t("links.linkForm.lock.keyOwnedAccount")
        : gateType === "liked"
          ? (locale.t("links.linkForm.lock.key2LikePost") ?? "Like post")
          : gateType === "retweeted"
            ? (locale.t("links.linkForm.lock.key3RetweetPost") ??
              "Retweet post")
            : "Verify",
  );

  type XProfile = {
    id: string;
    username: string;
    name: string;
    profile_image_url: string;
  };

  let connectedProfile = $state<XProfile | null>(null);
  let accessToken = $state<string | null>(null);
  let isConnecting = $state(false);
  let isVerifying = $state(false);
  let error = $state<string | null>(null);
  let verified = $state(false);

  async function connectX() {
    isConnecting = true;
    error = null;
    try {
      const result = await gateSDK.connectX();
      connectedProfile = result.profile;
      accessToken = result.accessToken;
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Failed to connect X account";
    } finally {
      isConnecting = false;
    }
  }

  function disconnectX() {
    connectedProfile = null;
    accessToken = null;
    error = null;
    verified = false;
  }

  async function handleOpen() {
    if (!connectedProfile) return;
    isVerifying = true;
    error = null;

    let credential: Parameters<typeof cashierBackendService.openLinkGate>[2];

    if (gateType === "following") {
      credential = { XFollowing: connectedProfile.username };
    } else if (gateType === "owned") {
      credential = { XOwnedAccount: connectedProfile.username };
    } else if (gateType === "liked") {
      if (!accessToken) {
        error = "Access token missing — please reconnect your X account";
        isVerifying = false;
        return;
      }
      credential = {
        XLikedPostCredential: {
          user_id: connectedProfile.id,
          access_token: accessToken,
        },
      };
    } else if (gateType === "retweeted") {
      credential = {
        XRetweetedPostCredential: { user_id: connectedProfile.id },
      };
    } else {
      error = "Unsupported gate type";
      isVerifying = false;
      return;
    }

    try {
      const result = await cashierBackendService.openLinkGate(
        linkId,
        gate.gate.id,
        credential,
      );

      if (result.isOk()) {
        verified = true;
      } else {
        const message = result.unwrapErr().message;
        let parsed: unknown;
        try {
          parsed = JSON.parse(message);
        } catch {
          parsed = null;
        }

        if (parsed && typeof parsed === "object") {
          if ("BackoffThrottled" in parsed) {
            const backoffMsg = (parsed as { BackoffThrottled: string })
              .BackoffThrottled;
            const match = backoffMsg.match(/Try again in (\d+)s/);
            const remainingSecs = match ? parseInt(match[1], 10) : 0;
            const timeStr =
              remainingSecs >= 60
                ? `${Math.ceil(remainingSecs / 60)} minutes`
                : `${remainingSecs} seconds`;
            const template = locale.t(
              "links.linkForm.lock.tooManyFailedAttempts",
            );
            error = template.replace("{{time}}", timeStr);
          } else if ("RateLimited" in parsed) {
            error = locale.t("links.linkForm.lock.rateLimited");
          } else {
            error = locale.t("links.linkForm.lock.xRequirementsNotMet");
          }
        } else {
          error = locale.t("links.linkForm.lock.xRequirementsNotMet");
        }
      }
    } finally {
      isVerifying = false;
    }
  }
</script>

<div class="space-y-5">
  <!-- Connected account -->
  <div class="space-y-1.5">
    <p class="text-sm font-medium text-foreground">
      {locale.t("links.linkForm.lock.connectedAccount")}
    </p>
    {#if connectedProfile}
      <button
        type="button"
        onclick={disconnectX}
        class="flex h-10 w-full items-center gap-2 rounded-lg border border-[#ebebeb] px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
      >
        {#if connectedProfile.profile_image_url}
          <img
            src={connectedProfile.profile_image_url}
            alt={connectedProfile.username}
            class="h-6 w-6 flex-none rounded-full object-cover"
          />
        {:else}
          <img
            src={xIcon}
            alt=""
            class="h-6 w-6 flex-none"
            aria-hidden="true"
          />
        {/if}
        <span class="flex-1 truncate text-foreground"
          >@{connectedProfile.username}</span
        >
      </button>
    {:else}
      <button
        type="button"
        disabled={isConnecting}
        onclick={connectX}
        class="flex h-10 w-full items-center gap-2 rounded-lg border border-[#ebebeb] px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
      >
        {#if isConnecting}
          <div
            class="h-5 w-5 flex-none animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
          ></div>
        {:else}
          <img
            src={xIcon}
            alt=""
            class="h-6 w-6 flex-none"
            aria-hidden="true"
          />
        {/if}
        <span class="text-foreground">
          {#if isConnecting}
            {locale.t("links.linkForm.lock.connecting")}
          {:else}
            {locale.t("links.linkForm.lock.connectAccount")}
          {/if}
        </span>
      </button>
    {/if}
  </div>

  <!-- Gate requirement (read-only display) -->
  <div class="space-y-1.5">
    <p class="text-sm font-medium text-foreground">{verifyLabel}</p>
    <div class="flex items-center gap-1.5">
      {#if gateType === "liked" || gateType === "retweeted"}
        <a
          href={targetValue}
          target="_blank"
          rel="noopener noreferrer"
          class="flex h-10 flex-1 items-center gap-2 rounded-lg border border-[#ebebeb] px-3 py-2 text-sm text-green underline-offset-2 hover:underline truncate"
        >
          {targetValue}
        </a>
      {:else}
        <div
          class="flex h-10 flex-1 items-center gap-2 rounded-lg border border-[#ebebeb] px-3 py-2 text-sm"
        >
          <span class="text-foreground truncate">{targetValue}</span>
        </div>
      {/if}
      <button
        type="button"
        onclick={handleOpen}
        disabled={!connectedProfile || verified || isVerifying}
        class="flex h-10 w-10 flex-none items-center justify-center rounded-lg border transition-colors
          {verified
          ? 'border-green'
          : connectedProfile && !isVerifying
            ? 'border-green hover:bg-green/10'
            : 'border-[#d0d5dd] opacity-30'}"
        aria-label="Verify"
      >
        {#if verified}
          <Check class="h-5 w-5 text-green" aria-hidden="true" />
        {:else if isVerifying}
          <div
            class="h-4 w-4 animate-spin rounded-full border-2 border-green border-t-transparent"
          ></div>
        {:else}
          <RefreshCw class="h-4 w-4 text-green" aria-hidden="true" />
        {/if}
      </button>
    </div>
  </div>

  <!-- Error banner -->
  {#if error}
    <div
      class="flex items-center gap-3 rounded-xl bg-[#fffaf2] px-4 py-3 shadow-sm"
    >
      <div
        class="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#d26060]"
      >
        <CircleX class="h-3.5 w-3.5 text-white" aria-hidden="true" />
      </div>
      <p class="flex-1 text-sm font-semibold text-foreground">{error}</p>
    </div>
  {/if}

  <!-- Info note -->
  <div class="flex items-start gap-1.5 text-green">
    <CircleAlert class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
    <p class="text-sm">
      {locale.t("links.linkForm.lock.provideKeysToUnlock")}
    </p>
  </div>

  <Button
    type="button"
    disabled={!connectedProfile || isVerifying || !verified}
    onclick={() => {
      onUnlocked();
      onClose();
    }}
    class="h-12 w-full rounded-full bg-green text-primary-foreground hover:bg-green/90 disabled:bg-disabledgreen"
  >
    {#if isVerifying}
      <div
        class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
      ></div>
      {locale.t("links.linkForm.lock.processing")}
    {:else}
      {locale.t("links.linkForm.lock.openButton")}
    {/if}
  </Button>
</div>
