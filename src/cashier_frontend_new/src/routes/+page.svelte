<script lang="ts">
  import { resolve } from "$app/paths";
  import { m } from "$lib/paraglide/messages.js";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import LinksList from "$modules/links/components/linksList.svelte";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
</script>

<!-- DEMO: no need for a dedicated tailwind configuration because this uses version 4 by default -->
<div class="hero bg-base-200 min-h-screen">
  <div class="hero-content text-center">
    <div class="max-w-md">
      <!-- DEMO: a message is statically checked and, if possible, resolved at compile time -->
      <h1 class="text-5xl font-bold">{m.welcome()}</h1>

      <p class="py-6">
        <a class="link" href={resolve("/wallet")}>Wallet</a>
      </p>
      
    </div>
  </div>

  {#if userProfile.isLoggedIn()}
    <div>You are logged in</div>
    <Button onclick={() => (window.location.href = resolve("/edit"))}>
        Create new link
      </Button>
    <LinksList />
  {:else}
    <div>You are NOT logged in</div>
  {/if}
</div>
