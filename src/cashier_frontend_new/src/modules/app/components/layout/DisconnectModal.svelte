<script lang="ts">
  import { X } from "lucide-svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { toast } from "svelte-sonner";
  import { authState } from "$modules/auth/state/auth.svelte";

  type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
  };

  let { open, onOpenChange, onConfirm }: Props = $props();

  function handleClose() {
    onOpenChange(false);
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  async function handleConfirm() {
    try {
      await authState.logout();
      onConfirm();
      onOpenChange(false);
      toast.success("You have been logged out");
      await goto(resolve("/"));
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to disconnect");
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
    aria-describedby="disconnect-dialog-description"
    aria-labelledby="disconnect-dialog-title"
    data-state={open ? "open" : "closed"}
    class="fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-12px)] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg sm:w-full sm:max-w-sm !rounded-[2rem] border-none shadow-2xl overflow-hidden"
    tabindex="-1"
  >
    <div class="flex flex-col space-y-4 text-center sm:text-left">
      <h2
        id="disconnect-dialog-title"
        class="text-lg font-semibold leading-none tracking-tight"
      >
        Disconnect wallet
      </h2>

      <p
        id="disconnect-dialog-description"
        class="text-sm text-muted-foreground"
      >
        Are you sure you want to disconnect your wallet? If you do, you will be
        logged out
      </p>
    </div>

    <div class="flex flex-col gap-2 mt-4">
      <button
        type="button"
        onclick={handleConfirm}
        class="text-[#D26060] font-semibold underline decoration-[#D26060] underline-offset-2 hover:no-underline transition-all cursor-pointer bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 m-0"
      >
        Disconnect
      </button>
    </div>

    <button
      type="button"
      onclick={handleClose}
      class="absolute right-4 top-4 cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
    >
      <X class="h-4 w-4" />
      <span class="sr-only">Close</span>
    </button>
  </div>
{/if}
