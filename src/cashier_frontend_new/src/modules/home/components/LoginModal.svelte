<script lang="ts">
  import { X } from "lucide-svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { toast } from "svelte-sonner";
  import { authState } from "$modules/auth/state/auth.svelte";

  type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };

  let { open, onOpenChange }: Props = $props();

  let isConnecting = $state(false);

  function handleClose() {
    onOpenChange(false);
  }

  async function handleWalletSelect(walletId: string) {
    if (isConnecting) return;

    try {
      isConnecting = true;

      // Map wallet ID to adapter ID
      const adapterId =
        walletId === "internet-identity" ? "iiSigner" : walletId;

      // Call login which will open popup to identity.internetcomputer.org
      await authState.login(adapterId);

      // After successful login, redirect to app and close modal
      handleClose();
      await goto(resolve("/app"));
      toast.success("Successfully logged in");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to connect wallet. Please try again.");
    } finally {
      isConnecting = false;
    }
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget && !isConnecting) {
      handleClose();
    }
  }
</script>

{#if open}
  <!-- Overlay -->
  <div
    class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    onclick={handleOverlayClick}
    role="presentation"
  ></div>

  <!-- Dialog -->
  <div
    role="dialog"
    aria-describedby="login-dialog-description"
    aria-labelledby="login-dialog-title"
    data-state={open ? "open" : "closed"}
    class="fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-12px)] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg sm:w-full sm:max-w-sm !rounded-[2rem] border-none shadow-2xl overflow-hidden"
    tabindex="-1"
  >
    <div class="flex flex-col space-y-1.5 text-center sm:text-left">
      <h2
        id="login-dialog-title"
        class="text-lg font-semibold leading-none tracking-tight"
      >
        Choose your wallet
      </h2>
    </div>

    <div class="space-y-4">
      <div class="flex flex-col gap-2">
        <button
          type="button"
          onclick={() => handleWalletSelect("internet-identity")}
          disabled={isConnecting}
          class="w-full h-12 px-3 border border-[#e5e5e5]/60 cursor-pointer rounded-xl text-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-start bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span class="flex items-center w-full text-[14px]">
            <img
              alt="Internet Identity"
              class="h-6 w-6 mr-2"
              src="/icpLogo.png"
            />
            <span class="flex-grow text-left">
              {#if isConnecting}
                Connecting...
              {:else}
                Internet Identity
              {/if}
            </span>
            {#if isConnecting}
              <div
                class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin ml-2"
              ></div>
            {/if}
          </span>
        </button>
      </div>
    </div>

    <button
      type="button"
      onclick={handleClose}
      disabled={isConnecting}
      class="absolute right-4 top-4 cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground disabled:opacity-50"
    >
      <X class="h-4 w-4" />
      <span class="sr-only">Close</span>
    </button>
  </div>
{/if}
