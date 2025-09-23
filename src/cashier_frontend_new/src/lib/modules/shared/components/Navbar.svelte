<!-- Navbar is a global component so it is declared in the global scope in the shared module -->

<script lang="ts">
    import { authState } from "../state/auth.svelte";

    // DEMO: effect is a reactive function, it does not require to declare which variables it depends on
    $effect(() => {
        console.log('authState.user: ', authState.user)
    })

    // DEMO: reactive local state
    let username = $state('');

</script>

<div class="navbar bg-base-100 shadow-sm">
  <div class="flex-1">
    <div class="btn btn-ghost text-xl">Cashier</div>
  </div>
  <div class="flex-none">
    <ul class="menu menu-horizontal px-1">
        {#if authState.isAuthenticated}
            <li><div>Welcome [{authState.user}]</div></li>
            <li><button onclick={() => authState.logout()}>Logout</button></li>
        {:else}
            <li>Username: <input bind:value={username} /></li>
            <li><button onclick={() => authState.login(username)}>Login</button></li>
        {/if}
    </ul>
  </div>
</div>