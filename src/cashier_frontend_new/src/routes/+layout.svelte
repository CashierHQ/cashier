<!-- DEMO: a layout automatically applied to all pages in this folder and all subfolders -->
<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import { beforeNavigate, goto } from "$app/navigation";
  import Navbar from "$modules/shared/components/Navbar.svelte";
  import { accountState } from "$modules/shared/state/auth.svelte";
  import "../app.css";
  import { page } from "$app/state";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { resolve } from "$app/paths";

  let { children } = $props();

  // Define protected routes that require authentication
  const protectedRoutes = ["/blog", "/wallet"];

  // NOTE: avoid capturing a one-time snapshot of the path here; use
  // `page.url.pathname` at the time of checks so the layout reflects
  // navigation changes (especially after redirect to /404).

  // Check if the path is protected
  function isProtectedPath(path: string) {
    // ensure exact "/blog" and any nested paths like "/blog/xxx"
    return protectedRoutes.some((r) => path === r || path.startsWith(r + "/"));
  }

  // effect to check authentication
  // If user is not authenticated and tries to access a protected route, redirect to /404
  $effect(() => {
    if (authState.initState !== "initialized") return;
    if (authState.isReconnecting) return;

    const current = page.url.pathname;

    // If the current path is protected and user is not authenticated, redirect to /404
    if (
      isProtectedPath(current) &&
      !accountState.account &&
      current !== "/404"
    ) {
      goto(resolve("/404"));
    }
  });

  // Handle navigation events to check authentication on route changes
  beforeNavigate(({ to }) => {
    const targetPath = to?.url?.pathname ?? "";

    // If the target path is protected and user is not authenticated, redirect to /404
    if (
      isProtectedPath(targetPath) &&
      !accountState.account &&
      targetPath !== "/404"
    ) {
      goto(resolve("/404"));
    }
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<Navbar />
<!-- 
  Incase of Pnp is initializing, show initializing screen
-->
{#if authState.initState === "initializing"}
  <div class="min-h-screen flex items-center justify-center">
    Initializing...
  </div>
  <!--
  If this true, likely Pnp is reconnecting
-->
{:else if authState.isReconnecting}
  <div class="min-h-screen flex items-center justify-center">
    Reconnecting...
  </div>
  <!--
  If this true, likely Pnp is finished reconnect
  - $effect will redirect to /404 if user is not authenticated
-->
{:else if isProtectedPath(page.url.pathname) && !accountState.account}
  <div class="min-h-screen flex items-center justify-center">Checking...</div>
  <!-- 
  There is 2 cases to render children:
  1. Not a protected route
  2. A protected route and user is authenticated
-->
{:else}
  {@render children?.()}
{/if}
