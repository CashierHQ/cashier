<!-- DEMO: a layout automatically applied to all pages in this folder and all subfolders -->
<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import { beforeNavigate, goto } from "$app/navigation";
  import Navbar from "$modules/shared/components/Navbar.svelte";
  import { accountState } from "$modules/shared/state/auth.svelte";
  import "../app.css";
    import { onMount } from "svelte";
    import { page } from "$app/state";

  let { children } = $props();

  // Define protected routes that require authentication
  const protectedRoutes = ["/blog"];

  const curentPath
   = page.url.pathname;

  // Check if the path is protected
  function isProtectedPath(path: string) {
    // ensure exact "/blog" and any nested paths like "/blog/xxx"
    return protectedRoutes.some((r) => path === r || path.startsWith(r + "/"));
  }

  onMount(() => {
    console.log("mount");
    if (isProtectedPath(curentPath) && !accountState.account) {
      console.log("No account, redirecting to landing page");
      // goto("/404");
    }
  });

  // Listen for navigation events, and redirect if necessary
  beforeNavigate(({ to }) => {
    console.log("before navigate");
    const targetPath = to?.url?.pathname ?? "";

    if (isProtectedPath(targetPath) && !accountState.account) {
      console.log("No account, redirecting to landing page");
      // goto("/404");
    }
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<Navbar />
  {@render children?.()}
