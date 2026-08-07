<script lang="ts">
  import { env } from "$env/dynamic/public";
  import { page } from "$app/state";
  import { onDestroy, onMount } from "svelte";
  import LoginModal from "$modules/home/components/LoginModal.svelte";
  import { authenticateWithInternetIdentity } from "$modules/auth/services/internetIdentityAuthentication";
  import { detectAuthenticationPopupClose } from "$modules/auth/signer/ii/authenticationPopup";
  import type { AuthenticationPopupHost } from "$modules/auth/signer/ii/type";
  import type { AuthLoginResult, AuthProvider } from "$modules/auth/types";

  type Scenario = "success" | "cancel" | "blocked" | "timeout";

  const fixtureEnabled = env.PUBLIC_E2E_AUTH_FIXTURE === "true";
  const scenario = page.url.searchParams.get("scenario") as Scenario | null;

  if (
    fixtureEnabled &&
    (!scenario ||
      !["success", "cancel", "blocked", "timeout"].includes(scenario))
  ) {
    throw new Error(`Unsupported authentication scenario: ${scenario}`);
  }

  let open = $state(true);
  let attempts = $state(0);
  let focusRestorations = $state(0);
  let successSignals = $state(0);
  let fixtureReady = $state(false);
  let removeAuthenticationListener = () => {};

  const popupHost: AuthenticationPopupHost = {
    open: (url, target, features) => {
      if (scenario === "blocked") return null;
      return window.open(url, target, features);
    },
    setInterval: window.setInterval.bind(window),
    clearInterval: window.clearInterval.bind(window),
    focus: () => {
      focusRestorations += 1;
      window.focus();
    },
  };

  const startAuthentication = (): Promise<void> => {
    const popup = popupHost.open(
      "/__e2e/auth-popup/provider",
      "cashier-authentication",
    );

    if (!popup) {
      return Promise.reject(new Error("Signer window could not be opened"));
    }

    if (scenario === "timeout") {
      return new Promise((_, reject) => {
        window.setTimeout(
          () => reject(new Error("Authentication timed out")),
          100,
        );
      });
    }

    return new Promise((resolve) => {
      const handleMessage = (event: MessageEvent) => {
        if (
          event.origin !== window.location.origin ||
          event.source !== popup ||
          event.data?.type !== "cashier-e2e-authenticated"
        ) {
          return;
        }

        successSignals += 1;
        resolve();
      };

      window.addEventListener("message", handleMessage);
      removeAuthenticationListener = () =>
        window.removeEventListener("message", handleMessage);
    });
  };

  const authenticate = async (
    provider: AuthProvider,
  ): Promise<AuthLoginResult> => {
    attempts += 1;
    try {
      return await authenticateWithInternetIdentity(provider, () =>
        detectAuthenticationPopupClose(startAuthentication, 25, popupHost),
      );
    } finally {
      removeAuthenticationListener();
      removeAuthenticationListener = () => {};
    }
  };

  onMount(() => {
    fixtureReady = true;
  });

  onDestroy(() => removeAuthenticationListener());
</script>

{#if fixtureEnabled}
  <main>
    <p data-testid="fixture-ready">{fixtureReady ? "ready" : "loading"}</p>
    <p data-testid="scenario">{scenario}</p>
    <p data-testid="attempts">{attempts}</p>
    <p data-testid="focus-restorations">{focusRestorations}</p>
    <p data-testid="success-signals">{successSignals}</p>

    <LoginModal
      {open}
      {authenticate}
      onOpenChange={(nextOpen) => (open = nextOpen)}
    />
  </main>
{:else}
  <h1>Page not found</h1>
{/if}
