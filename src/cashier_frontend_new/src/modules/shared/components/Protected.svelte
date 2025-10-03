<!-- A component that protects a route from being accessed. -->
<!-- It will prevent the page from rendering if the userProfile is not ready. -->
<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";

  let {
    children,
    /**
     * If needLogin is true, the component will show its children only if the userProfile is logged in.
     * @default true
     */
    needLogin = true,
    /**
     * Callback function that will be called if the userProfile does not meet the requirements.
     * @default redirect to the home page
     */
    errorCallback = () => goto(resolve("/")),
  } = $props();

  let loginState = $derived(!needLogin || userProfile.isLoggedIn());

  $effect(() => {
    if (userProfile.isReady() && !loginState) {
      errorCallback();
    }
  });
</script>

{#if userProfile.isReady() && loginState}
  {@render children?.()}
{/if}
