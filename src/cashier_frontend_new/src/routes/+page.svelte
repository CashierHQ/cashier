<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { m } from "$lib/paraglide/messages.js";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import LinksList from "$modules/links/components/linksList.svelte";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  import { Plus } from "lucide-svelte";

  const handleCreateLink = () => {
    goto(resolve("/link/create"));
  };
</script>

<!-- DEMO: no need for a dedicated tailwind configuration because this uses version 4 by default -->
<div class="hero bg-base-200 min-h-screen">
  <div class="hero-content text-center">
    <div class="max-w-md">
      <h1 class="text-5xl font-bold">{m.welcome()}</h1>

      <p class="py-6">
        <a class="link" href={resolve("/wallet")}>Wallet</a>
      </p>
    </div>
  </div>

  {#if userProfile.isLoggedIn()}
    <div class="w-full lg:w-1/3 mx-auto mt-4">
      <LinksList />
    </div>
    <!-- Fixed floating plus button placed at page level so it stays on screen -->
    <Button
      onclick={handleCreateLink}
      class="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-colors z-50"
      aria-label="Create link"
    >
      <Plus />
    </Button>
  {:else}
    <div>You are NOT logged in</div>
  {/if}
</div>
