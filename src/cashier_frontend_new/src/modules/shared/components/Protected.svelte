<!-- A component that protects a route from being accessed and redirects to the home page. -->
<!-- It will prevent the page from rendering if the userProfile is not ready -->
<script lang="ts">
  import { goto } from "$app/navigation";
  import { userProfile } from "$modules/shared/services/userProfile.svelte";
  /**
   * Show/hide its children based on the userProfile.
   * 
   * If needLogin is true, the component will show its children only if the userProfile is logged in.
   * 
   * 
   */
  let { children, 
    /** 
     * If needLogin is true, the component will show its children only if the userProfile is logged in.
     * @default true 
     */
    needLogin = true, 
    /**
     * Callback function that will be called if the userProfile does not meet the requirements.
     * @default redirect to the home page
     */
    errorCallback = () => goto("/"), } = $props();

  let loginState = $derived(!needLogin || userProfile.isLoggedIn());

  $effect(() => {
    if (userProfile.isReady() && !loginState) {
      errorCallback();
    }
  })

</script>

{#if userProfile.isReady() && loginState}
  {@render children?.()}
{/if}
