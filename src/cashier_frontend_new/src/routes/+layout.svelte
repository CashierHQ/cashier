<!-- DEMO: a layout automatically applied to all pages in this folder and all subfolders -->
<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import { beforeNavigate, goto } from "$app/navigation";
  import { authState } from "$modules/auth/state/auth.svelte";
  import Navbar from "$modules/shared/components/Navbar.svelte";
  import { accountState } from "$modules/shared/state/auth.svelte";
  import "../app.css";

  let { children } = $props();

  // Define protected routes that require authentication
  const protectedRoutes = ["/blog"];

  // Check if the path is protected
  function isProtectedPath(path: string) {
    // ensure exact "/blog" and any nested paths like "/blog/xxx"
    return protectedRoutes.some((r) => path === r || path.startsWith(r + "/"));
  }

  // Listen for navigation events, and redirect if necessary
  beforeNavigate(({ to }) => {
    const path = to?.url?.pathname ?? "";
    console.log("Navigating to:", path);

    if (isProtectedPath(path) && !accountState.account) {
      console.log("No account, redirecting to landing page");
      goto("/", { replaceState: true });
    }
  });

  // Reactively monitor authState changes, force to landing page if logged out
  $effect(() => {
    if (!accountState.account) {
      console.log("No account, redirecting to landing page");
      goto("/");
    }
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<!-- DEMO: add a Navbar to all pages -->
<Navbar />
{@render children?.()}
