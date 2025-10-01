<!-- DEMO: a layout automatically applied to all pages in this folder and all subfolders -->
<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import { beforeNavigate, goto } from "$app/navigation";
  import Navbar from "$modules/shared/components/Navbar.svelte";
  import { accountState } from "$modules/shared/state/auth.svelte";
  import "../app.css";
    import { page } from "$app/state";
    import { authState } from "$modules/auth/state/auth.svelte";

  let { children } = $props();

  // Define protected routes that require authentication
  const protectedRoutes = ["/blog", "/token"];

  const curentPath
   = page.url.pathname;

  // Check if the path is protected
  function isProtectedPath(path: string) {
    // ensure exact "/blog" and any nested paths like "/blog/xxx"
    return protectedRoutes.some((r) => path === r || path.startsWith(r + "/"));
  }

  // effect to when accountState.account changes
  $effect(() => {
    // don't run login redirect logic until PNP / initialization completed
    if (authState.initState === "mount") return;
    if (authState.isReconnecting) return;
    if (isProtectedPath(curentPath) && !accountState.account) {
      goto("/404");
    }
  });

  // Listen for navigation events, and redirect if necessary
  beforeNavigate(({ to }) => {
    const targetPath = to?.url?.pathname ?? "";
    if (isProtectedPath(targetPath) && !accountState.account) {
      goto("/404");
    }
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<Navbar />
{#if authState.initState === "mount"}
  <div class="min-h-screen flex items-center justify-center">
    Initializing...
  </div>
{:else if authState.isReconnecting}
  <div class="min-h-screen flex items-center justify-center">
    Reconnecting...
  </div>
// Show checking only when not reconnecting
{:else if isProtectedPath(curentPath) && !accountState.account}
  <div class="min-h-screen flex items-center justify-center">
    Checking...
  </div>
{:else}
  {@render children?.()}
{/if}
